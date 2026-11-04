// فرم‌های ثبت خرج و انتقال (شیت) با هشدارهای لازم
import { openSheet, confirmDialog } from './modal.js';
import { amountField, dateField, tagField, chipSelect, textField } from './fields.js';
import { money, unitLabel } from '../core/format.js';
import { getPrefs } from '../core/prefs.js';
import { getState, addExpense, addTransfer } from '../data/store.js';
import { computeBalances, expenseCheck, tagUsage, isMonthClosed, isoDate } from '../core/ledger.js';
import { toast } from './shell.js';
import { haptic } from './effects.js';

const form = () => { const f = document.createElement('form'); f.className = 'form'; f.noValidate = true; return f; };
const submitRow = label => `<div class="c-actions"><button type="submit" class="btn primary">${label}</button></div>`;

async function closedGuard(s, iso, cal) {
  if (!isMonthClosed(s, iso, cal)) return true;
  return confirmDialog({ title: 'ماه بسته‌شده', message: 'این تاریخ در یک ماه بسته‌شده است. مطمئنی می‌خواهی در آن ثبت کنی؟', confirmText: 'بله، ادامه' });
}

export function openExpense({ bucket = 'needs' } = {}) {
  const p = getPrefs(), s = getState(), { bal } = computeBalances(s);
  const f = form();
  const amt = amountField({ unit: p.unit, label: 'مبلغ خرج' });
  const bs = chipSelect({ label: 'از کدام صندوق؟', value: bucket, items: s.buckets.filter(b => b.kind !== 'locked').map(b => ({ id: b.id, label: b.name, color: b.color, icon: b.icon, sub: 'موجودی ' + (p.hideBalances ? '•••' : money(bal[b.id], p.unit)) })) });
  const title = textField({ label: 'عنوان', placeholder: 'مثلاً خرید نان و شیر' });
  const date = dateField({ calendar: p.calendar });
  const tags = tagField({ usage: tagUsage(s), colors: s.tags });
  const note = textField({ label: 'یادداشت', area: true });
  f.append(amt.el, bs.el, title.el, date.el, tags.el, note.el); f.insertAdjacentHTML('beforeend', submitRow('ثبت خرج'));
  const m = openSheet({ title: 'ثبت خرج', body: f });
  setTimeout(() => amt.focus(), 120);

  f.onsubmit = async e => {
    e.preventDefault();
    const a = amt.value(); if (!a) { amt.focus(); return toast('مبلغ را درست وارد کن'); }
    const b = s.buckets.find(x => x.id === bs.value()), iso = date.value();
    if (!(await closedGuard(s, iso, p.calendar))) return;
    const chk = expenseCheck(s, b.id, a, iso, p.calendar);
    if (chk.level === 'over') {
      const lack = money(-chk.balanceAfter, p.unit);
      if (!(await confirmDialog({ title: 'موجودی کافی نیست', message: `موجودی «${b.name}» کمتر از این خرج است و بعد از ثبت <b class="num">${lack}</b> ${unitLabel(p.unit)} منفی می‌شود.`, confirmText: 'ادامه', danger: true }))) return;
      if (!(await confirmDialog({ title: 'آخرین تأیید', message: `مطمئنی؟ این خرج از موجودی «${b.name}» بیشتر است.`, confirmText: 'بله، ثبت کن', danger: true }))) return;
    } else if (chk.level === 'cap100') {
      if (!(await confirmDialog({ title: 'سقف این ماه', message: `با این خرج کل سهم این ماهِ «${b.name}» مصرف می‌شود.`, confirmText: 'ثبت کن' }))) return;
    } else if (b.kind === 'save') {
      if (!(await confirmDialog({ title: 'خرج از پس‌انداز', message: 'این خرج از پس‌انداز برداشته می‌شود، نه از صندوق‌های خرج. مطمئنی؟', confirmText: 'بله، ثبت کن' }))) return;
    }
    addExpense({ amount: a, date: iso, bucket: b.id, title: title.value(), note: note.value(), tags: tags.value() });
    haptic(); m.close();
    toast(chk.level === 'cap80' ? `ثبت شد · ۸۰٪ سهم این ماهِ «${b.name}» مصرف شده` : 'خرج ثبت شد');
  };
}

export function openTransfer({ from = 'save', to = 'learn' } = {}) {
  const p = getPrefs(), s = getState(), { bal } = computeBalances(s);
  const f = form();
  const amt = amountField({ unit: p.unit, label: 'مبلغ انتقال' });
  const mk = list => list.map(b => ({ id: b.id, label: b.name, color: b.color, icon: b.icon, sub: p.hideBalances ? '' : money(bal[b.id], p.unit) }));
  const fs = chipSelect({ label: 'از', value: from, items: mk(s.buckets.filter(b => b.kind !== 'locked')) });
  const ts = chipSelect({ label: 'به', value: to, items: mk(s.buckets) });
  const date = dateField({ calendar: p.calendar }), note = textField({ label: 'یادداشت', area: true });
  f.append(amt.el, fs.el, ts.el, date.el, note.el); f.insertAdjacentHTML('beforeend', submitRow('انتقال'));
  const m = openSheet({ title: 'انتقال بین صندوق‌ها', body: f });
  setTimeout(() => amt.focus(), 120);
  f.onsubmit = async e => {
    e.preventDefault();
    const a = amt.value(); if (!a) { amt.focus(); return toast('مبلغ را درست وارد کن'); }
    if (fs.value() === ts.value()) return toast('مبدأ و مقصد نباید یکی باشد');
    const iso = date.value();
    if (!(await closedGuard(s, iso, p.calendar))) return;
    if (a > bal[fs.value()] && !(await confirmDialog({ title: 'موجودی کافی نیست', message: 'مبلغ انتقال از موجودی صندوق مبدأ بیشتر است و موجودی آن منفی می‌شود.', confirmText: 'ادامه', danger: true }))) return;
    if (ts.value() === 'retire' && !(await confirmDialog({ title: 'انتقال به صندوق ۶۰ سالگی', message: 'پولی که به این صندوق برود قفل می‌شود و فقط به‌صورت وام (با سود و شرایط سخت) قابل برداشت است. مطمئنی؟', confirmText: 'بله، منتقل کن', danger: true }))) return;
    addTransfer({ amount: a, date: iso, from: fs.value(), to: ts.value(), note: note.value() });
    haptic(); m.close(); toast('انتقال ثبت شد');
  };
}
export { isoDate };
