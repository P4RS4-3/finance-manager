// یادآورها: محاسبه‌ی خالص «چه چیزهایی الان باید یادآوری شود»
import { monthKey } from './ledger.js';
import { fromISO, monthRange, currentKey, shiftKey } from './months.js';
import { allLoans, requestReady } from './loans.js';
import { daysBetween } from './loans.js';

export const REMINDER_DEFAULTS = { deposit: { on: false, day: 1 }, backup: { on: true, days: 30 }, monthEnd: { on: true }, loan: { on: true }, notify: false };
export const remindersOf = state => {
  const r = state.settings?.reminders || {};
  return { deposit: { ...REMINDER_DEFAULTS.deposit, ...r.deposit }, backup: { ...REMINDER_DEFAULTS.backup, ...r.backup }, monthEnd: { ...REMINDER_DEFAULTS.monthEnd, ...r.monthEnd }, loan: { ...REMINDER_DEFAULTS.loan, ...r.loan }, notify: !!r.notify };
};

/** لیست یادآورهای فعال امروز: [{id, kind, icon, title, text, action}] */
export function dueReminders(state, cal, today, lastBackupMs = 0, nowMs = Date.now()) {
  const R = remindersOf(state), out = [];
  if (!state.txs.length) return out;
  const key = currentKey(today, cal), rng = monthRange(key, cal), day = fromISO(today, cal).d;

  if (R.loan.on) {
    if (state.loanRequest && requestReady(state.loanRequest, nowMs)) out.push({ id: 'loan-ready', kind: 'loan', icon: 'bank', title: 'وام آماده‌ی دریافت است', text: 'مهلت ۲۴ ساعته تمام شد. اگر هنوز لازمش داری دریافتش کن، وگرنه لغوش کن.', action: 'loans' });
    for (const l of allLoans(state, today)) {
      if (l.status !== 'active') continue;
      const n = l.next, left = -daysBetween(today, n.due); // مثبت = دیرکرد
      if (n.daysLate > 0) out.push({ id: `loan-late-${l.id}-${n.n}`, kind: 'loan', icon: 'bell', title: `قسط ${n.n} وام عقب افتاده`, text: `${n.daysLate} روز از سررسید گذشته${n.fee ? ' و جریمه‌ی دیرکرد در حال افزایش است' : ' (هنوز در مهلت ۳ روزه)'}.`, action: 'loans', urgent: true });
      else if (left >= -3) out.push({ id: `loan-soon-${l.id}-${n.n}`, kind: 'loan', icon: 'calendar', title: `قسط ${n.n} وام نزدیک است`, text: left === 0 ? 'سررسید امروز است.' : `${-left} روز تا سررسید.`, action: 'loans' });
    }
  }
  if (R.deposit.on && day >= R.deposit.day && !state.txs.some(t => t.type === 'deposit' && t.date >= rng.from && t.date <= rng.to))
    out.push({ id: `deposit-${key}`, kind: 'deposit', icon: 'plus', title: 'واریزی این ماه را ثبت کن', text: 'هنوز درآمدی برای این ماه ثبت نشده؛ تا ثبت نکنی تقسیم بین صندوق‌ها انجام نمی‌شود.', action: 'deposits' });
  if (R.monthEnd.on) {
    const prev = shiftKey(key, -1, cal), pr = monthRange(prev, cal);
    const prevHas = state.txs.some(t => t.date >= pr.from && t.date <= pr.to);
    if (prevHas && !state.closedMonths.includes(prev) && day <= 7) out.push({ id: `close-${prev}`, kind: 'month', icon: 'check', title: 'ماه قبل را مرور و ببند', text: 'خلاصه‌ی ماه گذشته آماده است؛ بعد از مرور می‌توانی آن را ببندی تا تراکنش‌هایش ناخواسته تغییر نکند.', action: 'review', arg: prev });
    const len = daysBetween(rng.from, rng.to) + 1;
    if (day >= len - 2 && !state.closedMonths.includes(key)) out.push({ id: `end-${key}`, kind: 'month', icon: 'calendar', title: 'آخر ماه است', text: 'تراکنش‌های جاماندهات را ثبت کن و بعد مرور ماه را ببین.', action: 'review', arg: key });
  }
  if (R.backup.on) {
    const age = lastBackupMs ? (nowMs - lastBackupMs) / 864e5 : null;
    if (age == null ? state.txs.length >= 5 : age >= R.backup.days) out.push({ id: 'backup', kind: 'backup', icon: 'download', title: 'وقت پشتیبان‌گیری است', text: age == null ? 'هنوز هیچ فایل پشتیبانی نگرفته‌ای؛ فقط همین فایل داده‌هایت را نجات می‌دهد.' : `آخرین پشتیبان ${Math.floor(age)} روز پیش بوده.`, action: 'data' });
  }
  return out;
}
