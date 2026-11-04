// نمایش تراکنش‌ها: ردیف لیست + برگه‌ی جزئیات (ویرایش/حذف)
import { icon } from './icons.js';
import { openSheet, confirmDialog, alertDialog } from './modal.js';
import { amountField, dateField, tagField, textField } from './fields.js';
import { money, unitLabel } from '../core/format.js';
import { dateText } from '../core/months.js';
import { getPrefs } from '../core/prefs.js';
import { getState, deleteTx, editTx } from '../data/store.js';
import { isMonthClosed, tagUsage, effects } from '../core/ledger.js';
import { toast } from './shell.js';

const bName = id => getState().buckets.find(b => b.id === id)?.name || id;
const TYPE = { deposit: ['واریزی', 'arrowDown', 'pos', '+'], expense: ['خرج', 'arrowUp', 'neg', '−'], transfer: ['انتقال', 'swap', 'neu', '⇄'], opening: ['موجودی اولیه', 'wallet', 'neu', '+'], loan_out: ['وام', 'bank', 'neg', '−'], loan_pay: ['قسط وام', 'bank', 'pos', '+'] };
export const typeLabel = t => (TYPE[t] || ['تراکنش'])[0];

function titleOf(tx) {
  if (tx.title) return tx.title;
  if (tx.type === 'expense') return 'خرج از ' + bName(tx.bucket);
  if (tx.type === 'transfer') return `${bName(tx.from)} ← ${bName(tx.to)}`;
  if (tx.type === 'deposit') return 'واریزی';
  return typeLabel(tx.type);
}

export function txRow(tx, hide = false) {
  const p = getPrefs(), [, ic, cls, sign] = TYPE[tx.type] || TYPE.opening;
  const tags = (tx.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
  const sub = tx.type === 'expense' ? bName(tx.bucket) : tx.type === 'transfer' ? '' : tx.source || '';
  return `<li><button class="tx" data-tx="${tx.id}"><span class="tx-ic ${cls}">${icon(ic, 18)}</span>
    <span class="tx-main"><b>${titleOf(tx)}</b><span class="tags">${sub ? `<span class="faint">${sub}</span>` : ''}${tags}<span class="faint">${dateText(tx.date, p.calendar)}</span></span></span>
    <span class="num tx-amt ${cls}">${hide ? '•••••' : sign + ' ' + money(tx.amount, p.unit)}</span></button></li>`;
}

/** گروه‌بندی بر اساس تاریخ برای لیست طولانی */
export function txGroups(txs, hide = false) {
  const p = getPrefs(); let last = '', out = '';
  for (const tx of txs) {
    if (tx.date !== last) { if (last) out += '</ul>'; out += `<h3 class="day">${dateText(tx.date, p.calendar)}</h3><ul class="tx-list">`; last = tx.date; }
    out += txRow(tx, hide);
  }
  return out ? out + '</ul>' : '';
}

let bound = false;
/** یک شنونده‌ی سراسری (فقط یک‌بار)؛ فراخوانی‌های بعدی بی‌اثرند تا شنونده‌ی تکراری انباشته نشود */
export function bindTxClicks() {
  if (bound) return; bound = true;
  document.addEventListener('click', e => { const b = e.target.closest('[data-tx]'); if (b) openTxDetail(b.dataset.tx); });
}

export function openTxDetail(id) {
  const s = getState(), tx = s.txs.find(t => t.id === id); if (!tx) return;
  const p = getPrefs(), [label, , cls] = TYPE[tx.type] || TYPE.opening;
  const rows = [['تاریخ', dateText(tx.date, p.calendar)]];
  if (tx.source) rows.push(['منبع', tx.source]);
  if (tx.type === 'expense') rows.push(['صندوق', bName(tx.bucket)]);
  if (tx.type === 'transfer') rows.push(['از', bName(tx.from)], ['به', bName(tx.to)]);
  if (tx.type === 'loan_out') rows.push(['دلیل', tx.reason], ['تعداد اقساط', tx.months + ' ماه'], ['سود ماهانه', Math.round(tx.rate * 100) + '٪']);
  if (tx.type === 'loan_pay') rows.push(['اصل', money(tx.principal, p.unit)], ['سود', money(tx.interest, p.unit)], ['جریمه‌ی دیرکرد', money(tx.fee || 0, p.unit)]);
  if (tx.note) rows.push(['یادداشت', tx.note]);
  if (tx.type === 'deposit') rows.push(['مدل', tx.modelName || '']);
  const split = tx.type === 'deposit' ? `<h3 class="sub">تقسیم این واریزی</h3><ul class="split">${s.buckets.map(b => `<li style="--bc:${b.color}"><i></i><span>${b.name}</span><span class="faint num">${tx.pct[b.id]}%</span><b class="num">${money(tx.split[b.id] || 0, p.unit)}</b></li>`).join('')}</ul>` : '';
  const m = openSheet({ title: titleOf(tx), body: `<div class="detail"><div class="d-amt ${cls}"><span class="num">${money(tx.amount, p.unit)}</span> <small>${unitLabel(p.unit)}</small></div>
    <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${(tx.tags || []).length ? `<div class="tags">${tx.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}${split}
    <div class="c-actions"><button class="btn danger" data-del>${icon('close', 16)} حذف</button>${tx.type.startsWith('loan') ? '' : '<button class="btn primary" data-edit>ویرایش</button>'}</div></div>` });
  m.body.querySelector('[data-del]').onclick = async () => {
    const closed = isMonthClosed(s, tx.date, p.calendar);
    if (closed && !(await confirmDialog({ title: 'ماه بسته‌شده', message: 'این تراکنش در یک ماه بسته‌شده است. مطمئنی می‌خواهی تغییرش بدهی؟', confirmText: 'بله، ادامه' }))) return;
    if (tx.type === 'loan_out' && s.txs.some(t => t.type === 'loan_pay' && t.loanId === id)) return alertDialog('حذف ممکن نیست', 'این وام پرداخت ثبت‌شده دارد. اول پرداخت‌هایش را حذف کن.');
    if (await confirmDialog({ title: 'حذف تراکنش', message: 'این تراکنش به سطل بازیافت می‌رود و تا ۳۰ روز قابل بازگردانی است.', confirmText: 'حذف', danger: true })) { try { deleteTx(id); m.close(); toast('به سطل بازیافت منتقل شد'); } catch (e) { toast(e.message); } }
  };
  const ed = m.body.querySelector('[data-edit]'); if (ed) ed.onclick = async () => {
    if (isMonthClosed(s, tx.date, p.calendar) && !(await confirmDialog({ title: 'ماه بسته‌شده', message: 'این تراکنش در یک ماه بسته‌شده است. مطمئنی می‌خواهی ویرایشش کنی؟', confirmText: 'بله، ادامه' }))) return;
    m.close(); openEdit(tx);
  };
}

function openEdit(tx) {
  const p = getPrefs(), s = getState();
  const amt = amountField({ unit: p.unit, value: tx.amount }), date = dateField({ value: tx.date, calendar: p.calendar });
  const title = textField({ label: 'عنوان', value: tx.title }), note = textField({ label: 'یادداشت', value: tx.note || '', area: true });
  const tags = tagField({ tags: tx.tags, usage: tagUsage(s), colors: s.tags });
  const form = document.createElement('form'); form.className = 'form';
  form.append(amt.el, date.el, title.el, tags.el, note.el);
  form.insertAdjacentHTML('beforeend', '<div class="c-actions"><button type="submit" class="btn primary">ذخیره</button></div>');
  const m = openSheet({ title: 'ویرایش تراکنش', body: form });
  form.onsubmit = e => {
    e.preventDefault();
    const a = amt.value(); if (!a) { amt.focus(); return toast('مبلغ معتبر نیست'); }
    editTx(tx.id, { amount: a, date: date.value(), title: title.value(), note: note.value(), tags: tags.value() });
    m.close(); toast('ذخیره شد');
  };
}
