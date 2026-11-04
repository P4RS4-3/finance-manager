// وام از صندوق ۶۰ سالگی: درخواست، انتظار ۲۴ساعته، تأیید، اقساط، تسویه
import { openSheet, confirmDialog, alertDialog } from './modal.js';
import { amountField, chipSelect, textField } from './fields.js';
import { icon } from './icons.js';
import { toast } from './shell.js';
import { haptic } from './effects.js';
import { money, unitLabel } from '../core/format.js';
import { dateText } from '../core/months.js';
import { getPrefs } from '../core/prefs.js';
import { getState, requestLoan, cancelLoanRequest, confirmLoan, payLoan } from '../data/store.js';
import { computeBalances, isoDate } from '../core/ledger.js';
import { LOAN, loanQuote, activeLoan, allLoans, payQuote, requestReady, requestReadyAt } from '../core/loans.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function openLoans() {
  const p = getPrefs(), s = getState();
  const m = openSheet({ title: 'وام از پس‌انداز ۶۰ سالگی', body: '<div id="lw"></div>', wide: true });
  const root = m.body.querySelector('#lw');
  const $ = n => money(n, p.unit);
  const u = unitLabel(p.unit);

  const rules = `<details class="glass pad rules"><summary>قوانین وام</summary><ul class="plain">
    <li>سقف وام ۸۰٪ موجودی این صندوق است. هم‌زمان فقط یک وام.</li>
    <li>سود ماهانه ۲۰٪ (تا ۵۰٪ موجودی) و ۳۰٪ (۵۰ تا ۸۰٪)، ساده و روی اصل وام.</li>
    <li>اقساط مساوی، ۲ تا ۱۲ ماه. سود پرداختی دوباره به همین صندوق برمی‌گردد.</li>
    <li>پس از ۳ روز مهلت، جریمه‌ی روزانه‌ی افزایشی: ۰٫۵٪ ← ۱٪ ← ۲٪ مبلغ قسط.</li>
    <li>بین درخواست و دریافت ۲۴ ساعت صبر لازم است تا تصمیم عجولانه نگیری.</li>
    <li>تسویه‌ی زودهنگام ممکن است و سود ماه‌های آینده را حذف می‌کند.</li></ul></details>`;

  function render() {
    const st = getState(), act = activeLoan(st), req = st.loanRequest;
    if (act) return renderActive(act);
    if (req) return renderRequest(req);
    renderForm(st);
  }

  /* ---------- فرم درخواست ---------- */
  function renderForm(st) {
    const bal = computeBalances(st).bal.retire, max = Math.floor(bal * LOAN.MAX_RATIO);
    root.innerHTML = `<p class="dim">موجودی صندوق: <b class="num">${$(bal)}</b> ${u} · حداکثر وام: <b class="num">${$(max)}</b> ${u}</p><form class="form" novalidate></form>${rules}${historyHtml(st)}`;
    const f = root.querySelector('form');
    const amt = amountField({ unit: p.unit, label: 'مبلغ وام', onInput: upd });
    const months = chipSelect({ label: 'تعداد اقساط (ماه)', value: '3', onChange: upd, items: [2, 3, 4, 6, 9, 12].map(n => ({ id: String(n), label: String(n) })) });
    const dest = chipSelect({ label: 'پول وام کجا برود؟', value: 'out', items: [{ id: 'out', label: 'خارج از برنامه' }, ...st.buckets.filter(b => b.kind === 'spend').map(b => ({ id: b.id, label: b.name, color: b.color, icon: b.icon }))] });
    const reason = textField({ label: 'دلیل وام (لازم است)', placeholder: 'برای چه چیزی لازم داری؟', optional: false });
    const prev = document.createElement('div'); prev.className = 'glass pad loan-prev';
    f.append(amt.el, months.el, dest.el, reason.el, prev);
    f.insertAdjacentHTML('beforeend', '<div class="c-actions"><button class="btn primary" type="submit">ثبت درخواست وام</button></div>');
    function upd() {
      const a = amt.value();
      if (!a) { prev.innerHTML = '<span class="faint">مبلغ را وارد کن تا هزینه‌ی کامل وام را ببینی.</span>'; return; }
      const q = loanQuote(st, { amount: a, months: Number(months.value()) });
      if (!q.ok) { prev.innerHTML = `<span class="warn-t">${esc(q.errors[0])}</span>`; return; }
      const i0 = q.installments[0];
      prev.innerHTML = `<dl><div><dt>سود ماهانه</dt><dd class="num">${Math.round(q.rate * 100)}٪</dd></div>
        <div><dt>مبلغ هر قسط</dt><dd class="num">${$(i0.total)} ${u}</dd></div>
        <div><dt>کل سود</dt><dd class="num">${$(q.interestTotal)} ${u}</dd></div>
        <div><dt>مجموع بازپرداخت</dt><dd class="num">${$(q.total)} ${u}</dd></div></dl>`;
    }
    upd();
    f.onsubmit = async e => {
      e.preventDefault();
      const a = amt.value(); if (!a) return toast('مبلغ را درست وارد کن');
      const q = loanQuote(st, { amount: a, months: Number(months.value()) });
      if (!q.ok) return toast(q.errors[0]);
      if (!reason.value().trim()) return toast('دلیل وام را بنویس');
      const ok = await confirmDialog({ title: 'درخواست وام', message: `از پس‌اندازِ آینده‌ات <b class="num">${$(a)}</b> ${u} قرض می‌گیری و در مجموع <b class="num">${$(q.total)}</b> ${u} برمی‌گردانی (سود <b class="num">${$(q.interestTotal)}</b>). وام بعد از ۲۴ ساعت قابل دریافت است.`, confirmText: 'ثبت درخواست', danger: true });
      if (!ok) return;
      try { requestLoan({ amount: a, months: Number(months.value()), reason: reason.value(), to: dest.value() === 'out' ? null : dest.value() }); haptic(); toast('درخواست ثبت شد؛ ۲۴ ساعت دیگر بیا'); render(); } catch (err) { toast(err.message); }
    };
  }

  /* ---------- درخواست در انتظار ---------- */
  function renderRequest(req) {
    const ready = requestReady(req), at = requestReadyAt(req);
    const q = loanQuote({ ...getState(), loanRequest: null }, { amount: req.amount, months: req.months });
    root.innerHTML = `<div class="glass pad"><h3>درخواست وام در انتظار</h3>
      <dl><div><dt>مبلغ</dt><dd class="num">${$(req.amount)} ${u}</dd></div><div><dt>اقساط</dt><dd>${req.months} ماه</dd></div><div><dt>دلیل</dt><dd>${esc(req.reason)}</dd></div>
      <div><dt>وضعیت</dt><dd>${ready ? '<b class="pos-t">آماده‌ی دریافت</b>' : 'منتظر پایان ۲۴ ساعت · ' + at.toLocaleString('fa-IR-u-nu-latn', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</dd></div></dl>
      ${q.ok ? '' : `<p class="warn-t">${esc(q.errors[0])}</p>`}
      <div class="c-actions"><button class="btn" id="lc">لغو درخواست</button><button class="btn primary" id="lg" ${ready && q.ok ? '' : 'disabled'}>دریافت وام</button></div></div>${rules}`;
    root.querySelector('#lc').onclick = async () => { if (await confirmDialog({ title: 'لغو درخواست', message: 'درخواست وام لغو شود؟', confirmText: 'لغو کن' })) { cancelLoanRequest(); render(); } };
    root.querySelector('#lg').onclick = async () => {
      const ok = await confirmDialog({ title: 'دریافت وام', message: `برداشت <b class="num">${$(req.amount)}</b> ${u} از صندوق ۶۰ سالگی. این کار برگشت‌پذیر نیست و اقساط از همین امروز شروع می‌شود.`, confirmText: 'دریافت وام', danger: true, typeToConfirm: LOAN.PHRASE });
      if (!ok) return;
      try { confirmLoan(); haptic(); toast('وام ثبت شد'); render(); } catch (err) { toast(err.message); }
    };
  }

  /* ---------- وام فعال ---------- */
  function renderActive(v) {
    const today = isoDate(), st = getState();
    const total = v.installments.length, frac = v.paidCount / total * 100;
    const next = v.next, nq = payQuote(v, 'next', today), pq = payQuote(v, 'payoff', today);
    const src = chipSelect({ label: 'پرداخت از', value: 'out', items: [{ id: 'out', label: 'جیب خودم (خارج از برنامه)' }, ...st.buckets.filter(b => b.kind !== 'locked').map(b => ({ id: b.id, label: b.name, color: b.color, icon: b.icon }))] });
    root.innerHTML = `<div class="glass pad loan-head"><h3>وام فعال · ${esc(v.tx.reason)}</h3>
      <div class="pbar"><i style="width:${frac}%"></i></div>
      <dl><div><dt>اصل باقی‌مانده</dt><dd class="num">${$(v.remainingPrincipal)} ${u}</dd></div><div><dt>اقساط پرداخت‌شده</dt><dd class="num">${v.paidCount} از ${total}</dd></div>
      ${v.overdue.length ? `<div><dt>جریمه‌ی دیرکرد تا امروز</dt><dd class="num warn-t">${$(v.feesDue)} ${u}</dd></div>` : ''}</dl>
      ${v.overdue.length ? `<p class="warn-t">${icon('bell', 16)} ${v.overdue.length} قسط سررسیدگذشته دارد؛ هر روز تأخیر جریمه را بیشتر می‌کند.</p>` : ''}</div>
      <ul class="inst-list">${v.installments.map(i => `<li class="${i.paid ? 'done' : i.daysLate ? 'late' : ''}"><span class="num">${i.n}</span><span>${dateText(i.due, p.calendar)}</span><b class="num">${$(i.total)}</b><em>${i.paid ? 'پرداخت‌شده' : i.daysLate ? `${i.daysLate} روز دیرکرد` : 'در انتظار'}</em></li>`).join('')}</ul>
      <div id="srcbox"></div>
      <div class="c-actions"><button class="btn" id="po">تسویه‌ی کامل · ${$(pq.total)}</button><button class="btn primary" id="pn">پرداخت قسط ${next.n} · ${$(nq.total)}</button></div>${rules}${historyHtml(st)}`;
    root.querySelector('#srcbox').append(src.el);
    const doPay = async (mode, q, label) => {
      const from = src.value() === 'out' ? null : src.value();
      const msg = `${label}: <b class="num">${$(q.total)}</b> ${u}${q.fee ? ` (شامل جریمه‌ی دیرکرد <b class="num">${$(q.fee)}</b>)` : ''}.${from ? ' از موجودی ' + esc(st.buckets.find(b => b.id === from).name) + ' کم می‌شود.' : ''}`;
      if (!(await confirmDialog({ title: 'پرداخت وام', message: msg, confirmText: 'پرداخت' }))) return;
      try { payLoan({ loanId: v.id, mode, from }); haptic(); toast('پرداخت ثبت شد'); render(); } catch (e) { toast(e.message); }
    };
    root.querySelector('#pn').onclick = () => doPay('next', nq, `قسط ${next.n}`);
    root.querySelector('#po').onclick = () => doPay('payoff', pq, 'تسویه‌ی کامل');
  }

  function historyHtml(st) {
    const done = allLoans(st).filter(l => l.status === 'paid');
    if (!done.length) return '';
    return `<h3 class="sub">وام‌های تسویه‌شده</h3><ul class="plain">${done.map(l => `<li>${dateText(l.tx.date, p.calendar)} · <span class="num">${$(l.tx.amount)}</span> ${u} · ${esc(l.tx.reason)}</li>`).join('')}</ul>`;
  }
  render();
}
