// اجزای فرم: مبلغ، تاریخ، هشتگ، انتخاب چندگزینه‌ای
import { icon } from './icons.js';
import { numberToWords } from '../core/words.js';
import { fmtInt, unitLabel } from '../core/format.js';
import { parseAmount, normTag, isoDate } from '../core/ledger.js';
import { fromISO, toISO, monthLength } from '../core/months.js';
import { JALALI_MONTHS, GREG_MONTHS_FA } from '../core/jalali.js';
import { toJalali } from '../core/jalali.js';

const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
let fid = 0;

/** فیلد مبلغ با جداکننده‌ی هزارگان و نوشتن مبلغ به حروف. value() به تومان (عدد صحیح) یا null */
export function amountField({ unit = 'toman', label = 'مبلغ', value = '', onInput } = {}) {
  const id = 'amt' + ++fid;
  const root = el(`<div class="field amount"><label for="${id}">${label} <small class="faint">(${unitLabel(unit)})</small></label>
    <div class="amt-box"><input id="${id}" class="num" inputmode="numeric" autocomplete="off" dir="ltr" placeholder="0" aria-describedby="${id}w"><span class="unit">${unitLabel(unit)}</span></div>
    <div class="words" id="${id}w" aria-live="polite"></div></div>`);
  const input = root.querySelector('input'), words = root.querySelector('.words');
  const digits = s => s.replace(/[۰-۹]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x6f0 + 48)).replace(/[٠-٩]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x660 + 48)).replace(/\D/g, '');
  const read = () => {
    const raw = parseAmount(input.value);
    if (raw == null) return null;
    if (unit === 'rial') return raw % 10 === 0 ? raw / 10 : null;
    return raw;
  };
  function refresh() {
    const raw = parseAmount(input.value);
    if (!input.value) words.textContent = '';
    else if (raw == null) words.textContent = 'فقط عدد صحیح وارد کن';
    else if (unit === 'rial' && raw % 10) words.textContent = 'مبلغ ریالی باید مضرب ۱۰ باشد';
    else words.textContent = numberToWords(raw) + ' ' + unitLabel(unit);
    root.classList.toggle('bad', !!input.value && read() == null);
    onInput?.(read());
  }
  input.addEventListener('input', () => {
    const pos = input.selectionStart, before = digits(input.value.slice(0, pos)).length;
    const d = digits(input.value).replace(/^0+(?=\d)/, '');
    input.value = d ? fmtInt(Number(d)) : '';
    // بازگرداندن مکان نشانگر با شمردن ارقام قبل از آن
    let n = 0, i = 0; for (; i < input.value.length && n < before; i++) if (/\d/.test(input.value[i])) n++;
    input.setSelectionRange(i, i);
    refresh();
  });
  if (value) { input.value = fmtInt(value); refresh(); }
  return { el: root, value: read, focus: () => input.focus(), set(v) { input.value = v ? fmtInt(v) : ''; refresh(); } };
}

/** انتخاب تاریخ: سه لیست روز/ماه/سال در تقویم انتخابی + دکمه‌ی امروز */
export function dateField({ value = isoDate(), calendar = 'jalali', label = 'تاریخ', back = 6, forward = 1 } = {}) {
  const months = calendar === 'jalali' ? JALALI_MONTHS : GREG_MONTHS_FA;
  const today = fromISO(isoDate(), calendar);
  const cur = fromISO(value, calendar);
  const years = []; for (let y = Math.min(today.y - back, cur.y); y <= Math.max(today.y + forward, cur.y); y++) years.push(y);
  const id = 'dt' + ++fid;
  const root = el(`<div class="field date"><span class="lbl" id="${id}">${label}</span><div class="date-row" role="group" aria-labelledby="${id}">
    <select class="d" aria-label="روز"></select><select class="m" aria-label="ماه">${months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
    <select class="y" aria-label="سال">${years.map(y => `<option>${y}</option>`).join('')}</select><button type="button" class="btn today">امروز</button></div></div>`);
  const d = root.querySelector('.d'), m = root.querySelector('.m'), y = root.querySelector('.y');
  const fillDays = keep => {
    const len = monthLength(+y.value, +m.value, calendar);
    d.innerHTML = Array.from({ length: len }, (_, i) => `<option>${i + 1}</option>`).join('');
    d.value = String(Math.min(keep, len));
  };
  y.value = String(cur.y); m.value = String(cur.m); fillDays(cur.d);
  m.onchange = y.onchange = () => fillDays(+d.value);
  root.querySelector('.today').onclick = () => { const t = fromISO(isoDate(), calendar); y.value = t.y; m.value = t.m; fillDays(t.d); };
  return { el: root, value: () => toISO(+y.value, +m.value, +d.value, calendar) };
}

/** هشتگ‌ها با پیشنهاد خودکار */
export function tagField({ tags = [], usage = {}, colors = {} } = {}) {
  let list = [...tags];
  const id = 'tg' + ++fid;
  const root = el(`<div class="field tags"><label for="${id}">هشتگ‌ها <small class="faint">(اختیاری)</small></label>
    <div class="tag-box"><span class="chips"></span><input id="${id}" placeholder="مثلاً #خوراکی" autocomplete="off" enterkeyhint="done"></div><div class="suggest" role="listbox"></div></div>`);
  const chips = root.querySelector('.chips'), input = root.querySelector('input'), sug = root.querySelector('.suggest');
  const color = t => colors[t]?.color || 'var(--a1)';
  const draw = () => {
    chips.innerHTML = list.map(t => `<span class="tag" style="--tc:${color(t)}">#${t}<button type="button" data-rm="${t}" aria-label="حذف ${t}">${icon('close', 12)}</button></span>`).join('');
    const q = normTag(input.value).toLowerCase();
    const cand = Object.entries(usage).filter(([t]) => !list.includes(t) && (!q || t.toLowerCase().includes(q))).sort((a, b) => b[1] - a[1]).slice(0, 8);
    sug.innerHTML = cand.map(([t]) => `<button type="button" role="option" class="tag s" style="--tc:${color(t)}" data-add="${t}">#${t}</button>`).join('');
  };
  const add = t => { t = normTag(t); if (t && !list.includes(t)) list.push(t); input.value = ''; draw(); };
  input.addEventListener('input', () => { if (/[\s,،]$/.test(input.value)) add(input.value); else draw(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); add(input.value); }
    if (e.key === 'Backspace' && !input.value && list.length) { list.pop(); draw(); }
  });
  input.addEventListener('blur', () => { if (input.value.trim()) add(input.value); });
  root.addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]'), ad = e.target.closest('[data-add]');
    if (rm) { list = list.filter(t => t !== rm.dataset.rm); draw(); }
    if (ad) add(ad.dataset.add);
  });
  draw();
  return { el: root, value: () => { if (input.value.trim()) add(input.value); return [...list]; } };
}

/** انتخاب تک‌گزینه‌ای به‌صورت دکمه‌ها */
export function chipSelect({ items, value, label = '', onChange, cols = 0 }) {
  let cur = value;
  const root = el(`<div class="field chipsel"><span class="lbl">${label}</span><div class="cs-grid" role="radiogroup" ${cols ? `style="--cols:${cols}"` : ''}></div></div>`);
  const grid = root.querySelector('.cs-grid');
  const draw = () => {
    grid.innerHTML = items.map(i => `<button type="button" role="radio" aria-checked="${i.id === cur}" class="cs ${i.id === cur ? 'on' : ''}" data-id="${i.id}" ${i.disabled ? 'disabled' : ''} style="--bc:${i.color || 'var(--a1)'}">
      ${i.icon ? `<span class="bubble sm">${icon(i.icon, 16)}</span>` : ''}<span class="cs-t"><b>${i.label}</b>${i.sub ? `<small class="faint">${i.sub}</small>` : ''}</span></button>`).join('');
  };
  grid.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b || b.disabled) return; cur = b.dataset.id; draw(); onChange?.(cur); });
  draw();
  return { el: root, value: () => cur, set(v) { cur = v; draw(); }, setItems(n) { items = n; draw(); } };
}

export const textField = ({ label, placeholder = '', value = '', area = false, optional = true }) => {
  const id = 'tf' + ++fid;
  const root = el(`<div class="field"><label for="${id}">${label}${optional ? ' <small class="faint">(اختیاری)</small>' : ''}</label>${area ? `<textarea id="${id}" rows="2" placeholder="${placeholder}"></textarea>` : `<input id="${id}" type="text" placeholder="${placeholder}" autocomplete="off">`}</div>`);
  const inp = root.querySelector('input,textarea'); inp.value = value;
  return { el: root, value: () => inp.value.trim() };
};
