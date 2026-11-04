// صفحه‌ی صندوق‌ها: کارت‌ها با آمار این ماه + جزئیات هر صندوق (هدف، تاریخچه، تراکنش‌ها)
import { icon } from './icons.js';
import { openSheet } from './modal.js';
import { amountField } from './fields.js';
import { openExpense, openTransfer } from './forms.js';
import { toast } from './shell.js';
import { sparkline } from './charts.js';
import { money, unitLabel } from '../core/format.js';
import { monthName } from '../core/months.js';
import { homeData } from '../core/stats.js';
import { getPrefs } from '../core/prefs.js';
import { getState, commit } from '../data/store.js';
import { setHistoryFilter } from './history.js';
import { openLoans } from './loans.js';

export function renderBuckets(root, { goto }) {
  const p = getPrefs(), s = getState(), cal = p.calendar, unit = p.unit, hide = p.hideBalances;
  const d = homeData(s, cal), m = n => (hide ? '•••••' : money(n, unit));
  const model = s.models.find(x => x.id === s.settings.activeModelId) || s.models[0];
  const list = d.buckets.map(b => ({ ...b, ...(p.buckets[b.id] || {}) }));

  root.innerHTML = `<p class="dim">روی هر صندوق بزن تا جزئیات، هدف و تراکنش‌هایش را ببینی. مدل فعال: <b>${model.name}</b></p>
    <div class="bucket-grid wide-cards">${list.map(b => `<button class="glass bucket card-btn" style="--bc:${b.color}" data-id="${b.id}">
      <header><span class="bubble">${icon(b.icon, 22)}</span><div class="b-title"><h3>${b.name}</h3><span class="pctchip">${model.split[b.id] ?? 0}%</span></div>${b.kind === 'locked' ? `<span class="lock-badge">${icon('lock', 14)}</span>` : ''}</header>
      <div class="b-balance"><span class="num">${m(b.balance)}</span><small>${unitLabel(unit)}</small></div>
      <div class="kv"><span class="faint">ورودی ${monthName(d.key, cal)}</span><b class="num">${m(b.month.inflow)}</b></div>
      <div class="kv"><span class="faint">خرج این ماه</span><b class="num">${m(b.month.spent)}</b></div>
      ${b.series.some(v => v) ? `<div class="spark-big">${sparkline(b.series, b.color, 240, 40)}</div>` : ''}</button>`).join('')}</div>`;
  root.querySelectorAll('[data-id]').forEach(el => el.onclick = () => openBucket(el.dataset.id, d, goto));
}

function openBucket(id, d, goto) {
  const p = getPrefs(), s = getState(), unit = p.unit, hide = p.hideBalances;
  const b = { ...d.buckets.find(x => x.id === id), ...(p.buckets[id] || {}) };
  const real = s.buckets.find(x => x.id === id);
  const m = n => (hide ? '•••••' : money(n, unit));
  const canGoal = b.kind !== 'spend' && b.kind !== 'locked';
  const body = document.createElement('div'); body.className = 'detail';
  body.innerHTML = `<div class="d-amt" style="color:${b.color}"><span class="num">${m(b.balance)}</span> <small>${unitLabel(unit)}</small></div>
    <p class="dim">${b.desc}</p>
    <dl><div><dt>سرریز از ماه‌های قبل</dt><dd class="num">${m(b.month.carry)}</dd></div><div><dt>ورودی این ماه</dt><dd class="num">${m(b.month.inflow)}</dd></div><div><dt>خرج این ماه</dt><dd class="num">${m(b.month.spent)}</dd></div>
    ${b.goal ? `<div><dt>هدف</dt><dd class="num">${m(b.goal)}</dd></div>` : ''}</dl>
    <div id="goalbox"></div>
    <div class="c-actions">${b.kind !== 'locked' ? '<button class="btn" data-exp>ثبت خرج</button><button class="btn" data-tr>انتقال از اینجا</button>' : '<button class="btn" data-tr>انتقال به اینجا</button><button class="btn" data-loan>وام</button>'}<button class="btn primary" data-hist>تراکنش‌های این صندوق</button></div>`;
  const m2 = openSheet({ title: b.name, body });
  if (canGoal) {
    const g = amountField({ unit, label: 'هدف این صندوق', value: real.goal || '' });
    body.querySelector('#goalbox').append(g.el);
    g.el.insertAdjacentHTML('beforeend', '<button class="btn" type="button" id="sg">ذخیره‌ی هدف</button>');
    g.el.querySelector('#sg').onclick = () => { const v = g.value(); commit(st => { const r = st.buckets.find(x => x.id === id); if (v) r.goal = v; else delete r.goal; }, 'goal', `${id} ${v || 'حذف'}`); toast(v ? 'هدف ذخیره شد' : 'هدف حذف شد'); m2.close(); };
  }
  body.querySelector('[data-exp]')?.addEventListener('click', () => { m2.close(); openExpense({ bucket: id }); });
  body.querySelector('[data-tr]')?.addEventListener('click', () => { m2.close(); b.kind === 'locked' ? openTransfer({ from: 'save', to: id }) : openTransfer({ from: id, to: id === 'save' ? 'learn' : 'save' }); });
  body.querySelector('[data-loan]')?.addEventListener('click', () => { m2.close(); openLoans(); });
  body.querySelector('[data-hist]').onclick = () => { setHistoryFilter({ bucket: id, q: '', type: '', tag: '' }); m2.close(); goto('history'); };
}
