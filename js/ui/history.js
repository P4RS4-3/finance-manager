// تاریخچه با فیلتر: جستجو، نوع، صندوق، هشتگ، بازه‌ی تاریخ و مبلغ
import { icon } from './icons.js';
import { amountField, dateField } from './fields.js';
import { txGroups, bindTxClicks } from './txlist.js';
import { getPrefs } from '../core/prefs.js';
import { getState } from '../data/store.js';
import { filterTxs, tagUsage } from '../core/ledger.js';
import { money, unitLabel } from '../core/format.js';

const TYPES = [['', 'همه'], ['deposit', 'واریزی'], ['expense', 'خرج'], ['transfer', 'انتقال']];
let F = { q: '', type: '', bucket: '', tag: '', from: '', to: '', min: 0, max: 0 };
export const setHistoryFilter = patch => { F = { ...F, ...patch }; };
let showMore = false;
const PAGE = 60;

export function renderHistory(root) {
  const s = getState(), p = getPrefs(), hide = p.hideBalances;
  const tags = Object.entries(tagUsage(s)).sort((a, b) => b[1] - a[1]);
  const active = !!(F.type || F.bucket || F.tag || F.from || F.to || F.min || F.max);
  root.innerHTML = `<section class="glass pad hist-filters">
    <div class="search-box">${icon('search', 18)}<input type="search" id="q" placeholder="جستجو در عنوان، یادداشت، هشتگ، مبلغ…" value="${F.q.replace(/"/g, '&quot;')}" aria-label="جستجو"></div>
    <div class="seg" role="radiogroup">${TYPES.map(([v, l]) => `<button role="radio" aria-checked="${F.type === v}" class="${F.type === v ? 'on' : ''}" data-type="${v}">${l}</button>`).join('')}</div>
    <div class="f-row"><select id="fb" aria-label="صندوق"><option value="">همه‌ی صندوق‌ها</option>${s.buckets.map(b => `<option value="${b.id}" ${F.bucket === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}</select>
      <select id="ft" aria-label="هشتگ"><option value="">همه‌ی هشتگ‌ها</option>${tags.map(([t, n]) => `<option value="${t}" ${F.tag === t ? 'selected' : ''}>#${t} (${n})</option>`).join('')}</select>
      <button class="btn" id="more">${icon('settings', 16)} فیلتر بیشتر</button>${active || F.q ? '<button class="btn ghost" id="clear">پاک‌کردن</button>' : ''}</div>
    <div class="f-more" ${showMore ? '' : 'hidden'}></div></section>
    <div id="results"></div>`;
  const fm = root.querySelector('.f-more');
  const df = dateField({ value: F.from || undefined, calendar: p.calendar, label: 'از تاریخ' }), dt = dateField({ value: F.to || undefined, calendar: p.calendar, label: 'تا تاریخ' });
  const mn = amountField({ unit: p.unit, label: 'حداقل مبلغ', value: F.min ? F.min : '' }), mx = amountField({ unit: p.unit, label: 'حداکثر مبلغ', value: F.max ? F.max : '' });
  fm.append(df.el, dt.el, mn.el, mx.el);
  fm.insertAdjacentHTML('beforeend', '<div class="c-actions"><button class="btn" id="dclear">بدون محدودیت تاریخ و مبلغ</button><button class="btn primary" id="apply">اعمال</button></div>');

  const res = root.querySelector('#results'); let shown = PAGE;
  function draw() {
    const list = filterTxs(s, F), sum = list.reduce((a, t) => a + (t.type === 'deposit' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
    res.innerHTML = list.length
      ? `<p class="faint count">${list.length} تراکنش${F.type === '' ? '' : ''} · <span class="num">${hide ? '•••' : money(Math.abs(sum), p.unit)}</span> ${unitLabel(p.unit)} ${sum >= 0 ? 'خالص ورودی' : 'خالص خروجی'}</p><div class="glass pad">${txGroups(list.slice(0, shown), hide)}</div>${list.length > shown ? '<button class="btn" id="moreRows">نمایش بیشتر</button>' : ''}`
      : `<div class="glass pad empty">${icon('search', 36)}<p class="dim">${s.txs.length ? 'تراکنشی با این فیلتر پیدا نشد' : 'هنوز تراکنشی ثبت نشده'}</p></div>`;
    res.querySelector('#moreRows')?.addEventListener('click', () => { shown += PAGE; draw(); });
  }
  bindTxClicks(res);
  const q = root.querySelector('#q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(() => { F.q = q.value; shown = PAGE; draw(); }, 150); };
  root.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { F.type = b.dataset.type; renderHistory(root); });
  root.querySelector('#fb').onchange = e => { F.bucket = e.target.value; renderHistory(root); };
  root.querySelector('#ft').onchange = e => { F.tag = e.target.value; renderHistory(root); };
  root.querySelector('#more').onclick = () => { showMore = !showMore; fm.hidden = !showMore; };
  root.querySelector('#clear')?.addEventListener('click', () => { F = { q: '', type: '', bucket: '', tag: '', from: '', to: '', min: 0, max: 0 }; renderHistory(root); });
  root.querySelector('#apply').onclick = () => { F.from = df.value(); F.to = dt.value(); F.min = mn.value() || 0; F.max = mx.value() || 0; if (F.from > F.to) [F.from, F.to] = [F.to, F.from]; renderHistory(root); };
  root.querySelector('#dclear').onclick = () => { F.from = F.to = ''; F.min = F.max = 0; renderHistory(root); };
  draw();
}
