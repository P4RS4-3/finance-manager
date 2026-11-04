// قوانین وام از صندوق ۶۰ سالگی — توابع خالص و قابل تست.
// وضعیت وام‌ها همیشه از روی تراکنش‌ها محاسبه می‌شود (loan_out شامل جدول اقساط، loan_pay شامل پرداخت‌ها)،
// پس حذف/بازیابی یک پرداخت خودبه‌خود وضعیت را درست نگه می‌دارد.
import { computeBalances, uid, isoDate, parseISO, parseAmount } from './ledger.js';

export const LOAN = {
  MIN_AMOUNT: 100_000,
  RATE_LOW: 0.20, RATE_HIGH: 0.30, // سود ماهانه (ساده، روی اصل وام)
  LOW_UP_TO: 0.5, MAX_RATIO: 0.8,  // تا ۵۰٪ موجودی: ۲۰٪؛ ۵۰ تا ۸۰٪: ۳۰٪؛ بیشتر از ۸۰٪ ممنوع
  MIN_MONTHS: 2, MAX_MONTHS: 12,
  GRACE_DAYS: 3, WAIT_HOURS: 24,
  PHRASE: 'وام می‌گیرم و شرایط را قبول دارم',
};

export const addMonthsISO = (iso, n) => {
  const d = parseISO(iso), day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return isoDate(t);
};
export const daysBetween = (aISO, bISO) => Math.round((parseISO(bISO) - parseISO(aISO)) / 864e5);

/** تقسیم برابر عدد صحیح؛ باقیمانده به قسط‌های اول می‌رسد */
export function splitEqual(total, n) {
  const base = Math.floor(total / n), r = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < r ? 1 : 0));
}

export const rateFor = (amount, balance) => (amount <= balance * LOAN.LOW_UP_TO ? LOAN.RATE_LOW : LOAN.RATE_HIGH);

export function buildSchedule(amount, months, rate, startISO) {
  const interestTotal = Math.round(amount * rate * months);
  const ps = splitEqual(amount, months), is = splitEqual(interestTotal, months);
  return {
    interestTotal, total: amount + interestTotal,
    installments: ps.map((p, i) => ({ n: i + 1, due: addMonthsISO(startISO, i + 1), principal: p, interest: is[i], total: p + is[i] })),
  };
}

/** بررسی و محاسبه‌ی پیش‌نمایش وام */
export function loanQuote(state, { amount, months }, startISO = isoDate()) {
  const errors = [];
  const bal = computeBalances(state).bal.retire || 0;
  const maxAmount = Math.floor(bal * LOAN.MAX_RATIO);
  const amt = parseAmount(amount);
  if (!amt) errors.push('مبلغ وام معتبر نیست');
  if (!Number.isInteger(months) || months < LOAN.MIN_MONTHS || months > LOAN.MAX_MONTHS) errors.push(`تعداد اقساط باید بین ${LOAN.MIN_MONTHS} تا ${LOAN.MAX_MONTHS} ماه باشد`);
  if (amt && amt < LOAN.MIN_AMOUNT) errors.push('مبلغ وام خیلی کم است');
  if (amt && amt > maxAmount) errors.push('مبلغ وام از ۸۰٪ موجودی صندوق بیشتر است');
  if (activeLoan(state) || state.loanRequest) errors.push('همین حالا یک وام فعال یا در انتظار داری؛ هم‌زمان فقط یک وام ممکن است');
  if (errors.length) return { ok: false, errors, balance: bal, maxAmount };
  const rate = rateFor(amt, bal);
  return { ok: true, errors, balance: bal, maxAmount, amount: amt, months, rate, ...buildSchedule(amt, months, rate, startISO) };
}

/** جریمه‌ی دیرکرد: بعد از ۳ روز مهلت، روزانه ۰٫۵٪ (روز ۴–۱۰)، ۱٪ (روز ۱۱–۳۰)، ۲٪ (از روز ۳۱) قسط */
export function lateFee(due, daysLate) {
  if (daysLate <= LOAN.GRACE_DAYS) return 0;
  let r = 0;
  for (let d = LOAN.GRACE_DAYS + 1; d <= daysLate; d++) r += d <= 10 ? 0.005 : d <= 30 ? 0.01 : 0.02;
  return Math.round(due * r);
}

/* ---------------- وضعیت وام از روی تراکنش‌ها ---------------- */
export function loanView(state, tx, today = isoDate()) {
  const pays = state.txs.filter(t => t.type === 'loan_pay' && t.loanId === tx.id);
  const paid = new Map();
  for (const p of pays) for (const n of p.ns) paid.set(n, p.date);
  const inst = tx.schedule.installments.map(i => {
    const isPaid = paid.has(i.n), late = isPaid ? 0 : Math.max(0, daysBetween(i.due, today));
    return { ...i, paid: isPaid, paidDate: paid.get(i.n) || null, daysLate: late, fee: isPaid ? 0 : lateFee(i.total, late) };
  });
  const unpaid = inst.filter(i => !i.paid);
  return {
    tx, id: tx.id, status: unpaid.length ? 'active' : 'paid', installments: inst, next: unpaid[0] || null,
    remainingPrincipal: unpaid.reduce((a, i) => a + i.principal, 0),
    overdue: unpaid.filter(i => i.daysLate > 0), feesDue: unpaid.reduce((a, i) => a + i.fee, 0),
    paidCount: inst.length - unpaid.length,
  };
}
export const allLoans = (state, today) => state.txs.filter(t => t.type === 'loan_out').map(t => loanView(state, t, today));
export const activeLoan = (state, today) => allLoans(state, today).find(l => l.status === 'active') || null;

/** مبلغ پرداخت: mode = 'next' (قسط بعدی) یا 'payoff' (تسویه‌ی کامل) */
export function payQuote(view, mode, today = isoDate()) {
  const unpaid = view.installments.filter(i => !i.paid);
  if (!unpaid.length) return null;
  if (mode === 'next') {
    const i = unpaid[0];
    return { ns: [i.n], principal: i.principal, interest: i.interest, fee: i.fee, total: i.total + i.fee };
  }
  // تسویه‌ی زودهنگام: سود فقط برای اقساطِ سررسیدشده و قسط جاری؛ سود ماه‌های آینده بخشوده می‌شود
  let principal = 0, interest = 0, fee = 0;
  unpaid.forEach((i, idx) => {
    principal += i.principal; fee += i.fee;
    if (idx === 0 || i.due <= today) interest += i.interest;
  });
  return { ns: unpaid.map(i => i.n), principal, interest, fee, total: principal + interest + fee };
}

/* ---------------- ساخت تراکنش‌ها ---------------- */
export function makeLoanOut(state, { amount, months, reason, date = isoDate(), to = null }) {
  const q = loanQuote({ ...state, loanRequest: null }, { amount, months }, date);
  if (!q.ok) throw new Error(q.errors[0]);
  if (!String(reason || '').trim()) throw new Error('دلیل وام را بنویس');
  return {
    id: uid(), type: 'loan_out', date, createdAt: new Date().toISOString(), amount: q.amount, months, rate: q.rate,
    reason: reason.trim(), to, title: 'وام از پس‌انداز ۶۰ سالگی', note: '', tags: [],
    schedule: { interestTotal: q.interestTotal, total: q.total, installments: q.installments },
  };
}
export function makeLoanPay(state, { loanId, mode, date = isoDate(), from = null }) {
  const tx = state.txs.find(t => t.id === loanId && t.type === 'loan_out');
  if (!tx) throw new Error('وام پیدا نشد');
  const view = loanView(state, tx, date), q = payQuote(view, mode, date);
  if (!q) throw new Error('این وام قبلاً تسویه شده است');
  return {
    id: uid(), type: 'loan_pay', date, createdAt: new Date().toISOString(), loanId, ns: q.ns,
    principal: q.principal, interest: q.interest, fee: q.fee, amount: q.total, from, mode, title: mode === 'payoff' ? 'تسویه‌ی وام' : `قسط ${q.ns[0]} وام`, note: '', tags: [],
  };
}

/** درخواست وام (۲۴ ساعت انتظار قبل از دریافت) */
export function makeLoanRequest(state, { amount, months, reason, to = null }, now = Date.now()) {
  const q = loanQuote(state, { amount, months });
  if (!q.ok) throw new Error(q.errors[0]);
  if (!String(reason || '').trim()) throw new Error('دلیل وام را بنویس');
  return { id: uid(), at: new Date(now).toISOString(), amount: q.amount, months, reason: reason.trim(), to };
}
export const requestReadyAt = req => new Date(new Date(req.at).getTime() + LOAN.WAIT_HOURS * 36e5);
export const requestReady = (req, now = Date.now()) => requestReadyAt(req).getTime() <= now;
