import { t } from '../i18n/fa.js';
import { icon } from './icons.js';
import { donut, lineChart, barChart, sparkline, attachTooltips } from './charts.js';
import { countUp } from './effects.js';
import { openExpense, openTransfer } from './forms.js';
import { txGroups, bindTxClicks } from './txlist.js';
import { openLoans } from './loans.js';
import { remindersHtml, bindReminders } from './reminders.js';
import { openReview } from './review.js';
import { money, unitLabel, compact } from '../core/format.js';
import { monthName } from '../core/months.js';
import { homeData } from '../core/stats.js';
import { getPrefs, setPrefs } from '../core/prefs.js';
import { getState, enterDemo } from '../data/store.js';

export function renderHome(root, { goto, animate = true }) {
  const p = getPrefs(), s = getState(), hide = p.hideBalances, cal = p.calendar, unit = p.unit;
  const d = homeData(s, cal);
  const m = n => (hide ? '•••••' : money(n, unit));

  if (d.empty) {
    root.innerHTML = `<section class="glass pad welcome"><span class="logo lg">${icon('coins', 34)}</span><h2>خوش آمدی!</h2>
      <p class="dim">اولین درآمدت را ثبت کن تا برنامه آن را بین صندوق‌ها تقسیم کند. یا اول با داده‌ی نمونه همه‌چیز را ببین.</p>
      <div class="c-actions"><button class="btn primary big" id="w-dep">${icon('plus', 20)} ثبت اولین واریزی</button><button class="btn" id="w-demo">${icon('sparkle', 18)} حالت نمایشی</button></div></section>`;
    root.querySelector('#w-dep').onclick = () => goto('deposits');
    root.querySelector('#w-demo').onclick = () => enterDemo();
    return;
  }

  const birth = s.settings.birthDate;
  const yearsLeft = birth ? Math.max(0, 60 - (new Date().getFullYear() - birth.y)) : null;
  const buckets = d.buckets.map(b => ({ ...b, ...(p.buckets[b.id] || {}) }));
  const model = s.models.find(x => x.id === s.settings.activeModelId) || s.models[0];

  const cards = buckets.map(b => {
    let frac, cap;
    if (b.kind === 'spend') { frac = b.month.available > 0 ? b.month.spent / b.month.available : 0; cap = 'خرج‌شده از موجودی قابل‌خرج این ماه'; }
    else if (b.goal) { frac = b.balance / b.goal; cap = `هدف ${hide ? '•••' : compact(b.goal)}`; }
    else { frac = d.total > 0 ? b.balance / d.total : 0; cap = 'سهم از کل دارایی'; }
    frac = Math.max(0, frac);
    const warn = b.kind === 'spend' && frac >= 0.8;
    const lock = b.kind === 'locked' ? `<span class="lock-badge">${icon('lock', 14)}${yearsLeft != null ? `<span class="num">${yearsLeft}</span> ${t('years')}` : ''}</span>` : '';
    return `<article class="glass tilt bucket" style="--bc:${b.color}" data-id="${b.id}">
      <header><span class="bubble">${icon(b.icon, 22)}</span><div class="b-title"><h3>${b.name}</h3><span class="pctchip">${model.split[b.id] ?? 0}%</span></div>${lock}</header>
      <p class="desc">${b.desc}</p>
      <div class="b-balance"><span class="num amt" data-to="${b.balance}">${m(b.balance)}</span><small>${unitLabel(unit)}</small></div>
      <div class="pbar" role="progressbar" aria-valuenow="${Math.round(frac * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100, frac * 100)}%" class="${warn ? 'warn' : ''}"></i></div>
      <footer><span class="faint">${cap}</span><span class="num ${warn ? 'warn-t' : ''}">${Math.round(frac * 100)}%</span><span class="spark-wrap">${b.series.some(v => v) ? sparkline(b.series, b.color) : ''}</span></footer></article>`;
  }).join('');

  const donutItems = buckets.map(b => ({ label: b.name, value: model.split[b.id] || 0, color: b.color })).filter(i => i.value > 0);
  const legend = buckets.map(b => `<li><i style="background:${b.color}"></i><span>${b.name}</span><b class="num">${model.split[b.id] || 0}%</b></li>`).join('');
  const deltaChip = d.delta == null ? '' : `<span class="chip ${d.delta >= 0 ? 'pos-chip' : 'neg-chip'}">${icon(d.delta >= 0 ? 'arrowUp' : 'arrowDown', 14)} <span class="num">${d.delta >= 0 ? '+' : ''}${hide ? '••' : d.delta.toFixed(1)}%</span> نسبت به ماه قبل</span>`;
  const loanChip = d.receivable > 0 ? `<span class="chip" data-loan style="cursor:pointer">${icon('bank', 14)} طلب وام: <span class="num">${m(d.receivable)}</span></span>` : '';

  root.innerHTML = `
  <section class="hero glass tilt">
    <div class="hero-top"><span class="chip">${icon('calendar', 14)} ${monthName(d.key, cal)}</span>
      <button class="icon-btn" id="eye" aria-label="${hide ? t('show') : t('hide')}">${icon(hide ? 'eyeOff' : 'eye', 20)}</button></div>
    <div class="hero-label">${t('total')}</div>
    <div class="hero-amount"><span class="num" id="total" data-to="${d.total}">${m(d.total)}</span><small>${unitLabel(unit)}</small></div>
    <div class="hero-sub">${deltaChip}${loanChip}${s.settings.demo ? `<span class="chip">${icon('sparkle', 14)} ${t('demo')}</span>` : ''}</div>
    <div class="quick">
      <button class="btn primary" data-act="deposit">${icon('plus', 20)} ${t('newDeposit')}</button>
      <button class="btn" data-act="expense">${icon('minus', 20)} ${t('addExpense')}</button>
      <button class="btn" data-act="transfer">${icon('swap', 20)} ${t('transfer')}</button>
    </div>
  </section>
  ${remindersHtml()}
  <h2 class="sec">${t('sections.buckets')}</h2>
  <div class="bucket-grid">${cards}</div>
  <div class="two-col">
    <section class="glass pad"><h2 class="sec in">${t('sections.split')} <small class="faint">(مدل ${model.name})</small></h2>
      <div class="donut-wrap">${donut(donutItems, { center: `<small class="faint">هر واریزی</small><b class="num">100%</b>` })}<ul class="legend">${legend}</ul></div></section>
    <section class="glass pad"><h2 class="sec in">${t('sections.monthly')}</h2><div class="chart-box">${barChart(d.monthlyIncome, d.labels, { w: 420, h: 300 })}</div></section>
  </div>
  <section class="glass pad"><h2 class="sec in">${t('sections.trend')}</h2><div class="chart-box tall">${lineChart(d.assetTrend, d.labels, { w: 760, h: 250 })}</div></section>
  <section class="glass pad"><div class="sec-row"><h2 class="sec in">${t('sections.recent')}</h2><span><button class="btn ghost sm" data-review>مرور ماه</button> <button class="btn ghost sm" data-goto="history">همه</button></span></div>${txGroups(d.recent, hide) || '<p class="faint">هنوز تراکنشی نیست</p>'}</section>`;

  bindReminders(root, goto);
  root.querySelector('[data-review]')?.addEventListener('click', () => openReview());
  root.querySelector('[data-loan]')?.addEventListener('click', openLoans);
  root.querySelector('#eye').onclick = () => setPrefs({ hideBalances: !hide });
  if (!hide && animate) root.querySelectorAll('.amt, #total').forEach(el => countUp(el, +el.dataset.to, n => money(n, unit)));
  root.querySelectorAll('.quick .btn').forEach(b => b.onclick = () => {
    if (b.dataset.act === 'deposit') goto('deposits');
    else if (b.dataset.act === 'expense') openExpense(); else openTransfer();
  });
  root.querySelector('[data-goto]')?.addEventListener('click', e => goto(e.currentTarget.dataset.goto));
  bindTxClicks(root);
  attachTooltips(root, v => money(v, unit) + ' ' + unitLabel(unit));
}
