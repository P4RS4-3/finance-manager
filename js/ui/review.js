// مرور ماه (با بستن ماه و گرمانگار هزینه) و مرور سال
import { openSheet, confirmDialog } from './modal.js';
import { barChart } from './charts.js';
import { icon } from './icons.js';
import { toast } from './shell.js';
import { money, unitLabel, pct } from '../core/format.js';
import { getPrefs } from '../core/prefs.js';
import { getState, closeMonth, reopenMonth } from '../data/store.js';
import { isoDate } from '../core/ledger.js';
import { currentKey, shiftKey, monthName, dateText } from '../core/months.js';
import { monthReview, yearReview, yearOf } from '../core/review.js';
import { bindTxClicks, txRow } from './txlist.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DOW = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function openReview(key) {
  const m = openSheet({ title: 'مرور ماه و سال', body: '<div id="rv"></div>', wide: true });
  mountReview(m.body.querySelector('#rv'), key);
}

export function mountReview(el, startKey) {
  const p = getPrefs(), cal = p.calendar, u = unitLabel(p.unit), hide = p.hideBalances;
  const $ = n => (hide ? '•••••' : money(n, p.unit));
  let mode = 'month', key = startKey || currentKey(isoDate(), cal), year = Number(key.split('-')[0]);

  function head() {
    const label = mode === 'month' ? monthName(key, cal) : 'سال ' + year;
    return `<div class="rv-head"><div class="seg" role="tablist"><button class="${mode === 'month' ? 'on' : ''}" data-m="month"><span>ماه</span></button><button class="${mode === 'year' ? 'on' : ''}" data-m="year"><span>سال</span></button></div>
      <div class="rv-nav"><button class="icon-btn" data-d="1" aria-label="قبلی" style="transform:scaleX(-1)">${icon('chevron', 18)}</button><b>${label}</b><button class="icon-btn" data-d="-1" aria-label="بعدی">${icon('chevron', 18)}</button></div></div>`;
  }

  function monthHtml() {
    const s = getState(), r = monthReview(s, key, cal);
    const delta = (a, b, upGood) => (b > 0 && a !== b ? ` <small class="${(a > b) === upGood ? 'pos-t' : 'warn-t'}">${a > b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / b * 100))}٪ نسبت به ماه قبل</small>` : '');
    const cells = [...Array(r.days[0]?.dow || 0).fill('<i class="hm-pad"></i>'), ...r.days.map(d => `<i class="hm" style="--k:${r.maxDay ? (d.amount / r.maxDay).toFixed(2) : 0}" title="${dateText(d.iso, cal)}: ${d.amount ? $(d.amount) : '—'}"></i>`)].join('');
    return `<div class="rv-grid">
      <div class="glass pad"><span class="faint">درآمد</span><b class="num big-n">${$(r.income)}</b><small class="faint">${u}</small>${delta(r.income, r.prev.income, true)}</div>
      <div class="glass pad"><span class="faint">خرج</span><b class="num big-n">${$(r.expense)}</b><small class="faint">${u}</small>${delta(r.expense, r.prev.expense, false)}</div>
      <div class="glass pad"><span class="faint">نرخ پس‌انداز</span><b class="num big-n ${r.savingsRate != null && r.savingsRate < 0 ? 'warn-t' : ''}">${r.savingsRate == null ? '—' : pct(r.savingsRate * 100, 0)}</b><small class="faint">${r.savingsRate == null ? 'درآمدی ثبت نشده' : 'از درآمد خرج نشده'}</small></div></div>
      <h3 class="sub">صندوق‌ها در این ماه</h3>
      <div class="rv-bk">${r.perBucket.map(b => `<div class="glass pad"><b><i class="dot" style="background:${b.color}"></i>${esc(p.buckets[b.id]?.name || b.name)}</b>
        <dl><div><dt>سرریز</dt><dd class="num">${$(b.carry)}</dd></div><div><dt>ورودی</dt><dd class="num">${$(b.inflow)}</dd></div><div><dt>خرج</dt><dd class="num">${$(b.spent)}</dd></div><div><dt>مانده</dt><dd class="num"><b>${$(b.left)}</b></dd></div></dl></div>`).join('')}</div>
      <h3 class="sub">گرمانگار خرج روزانه</h3>
      <div class="glass pad"><div class="hm-dow">${DOW.map(d => `<span>${d}</span>`).join('')}</div><div class="hm-grid">${cells}</div>
        <p class="faint">${r.topDay && r.topDay.amount ? `پرخرج‌ترین روز: ${dateText(r.topDay.iso, cal)} (${$(r.topDay.amount)} ${u}) · میانگین روزانه: ${$(r.avgDaily)} ${u}` : 'در این ماه خرجی ثبت نشده.'}</p></div>
      ${r.tags.length ? `<h3 class="sub">خرج بر اساس هشتگ</h3><div class="glass pad"><ul class="tagbars">${r.tags.map(t => `<li><span>#${esc(t.tag)}</span><i style="--w:${Math.round(t.amount / r.tags[0].amount * 100)}%"></i><b class="num">${$(t.amount)}</b></li>`).join('')}</ul></div>` : ''}
      ${r.top.length ? `<h3 class="sub">بزرگ‌ترین خرج‌ها</h3><div class="glass pad">${r.top.map(t => txRow(t, hide)).join('')}</div>` : ''}
      <div class="glass pad rv-close">${r.closed ? `<span>${icon('lock', 16)} این ماه بسته شده است؛ تغییر در آن با تأیید اضافه انجام می‌شود.</span><button class="btn" data-reopen>بازکردن ماه</button>`
        : `<span>${r.finished ? 'این ماه تمام شده؛ بعد از مرور می‌توانی آن را ببندی.' : 'این ماه هنوز تمام نشده است.'}</span><button class="btn primary" data-close>بستن ماه</button>`}</div>`;
  }

  function yearHtml() {
    const y = yearReview(getState(), year, cal);
    if (!y.activeMonths) return '<div class="glass pad empty"><p class="dim">در این سال تراکنشی ثبت نشده است.</p></div>';
    return `<div class="rv-grid"><div class="glass pad"><span class="faint">درآمد سال</span><b class="num big-n">${$(y.income)}</b><small class="faint">${u}</small></div>
      <div class="glass pad"><span class="faint">خرج سال</span><b class="num big-n">${$(y.expense)}</b><small class="faint">${u}</small></div>
      <div class="glass pad"><span class="faint">نرخ پس‌انداز سال</span><b class="num big-n">${y.rate == null ? '—' : pct(y.rate * 100, 0)}</b></div></div>
      <h3 class="sub">درآمد ماهانه</h3><div class="glass pad chart-box">${barChart(y.months.map(m => m.income), y.months.map(m => m.label), { w: 560, h: 200 })}</div>
      <h3 class="sub">خرج ماهانه</h3><div class="glass pad chart-box">${barChart(y.months.map(m => m.expense), y.months.map(m => m.label), { color: 'var(--neg)', w: 560, h: 200 })}</div>
      <div class="glass pad"><p>${y.best ? `بهترین ماه: <b>${monthName(y.best.key, cal)}</b> (مازاد ${$(y.best.net)} ${u})` : ''}</p><p>${y.worst && y.worst !== y.best ? `ضعیف‌ترین ماه: <b>${monthName(y.worst.key, cal)}</b> (${y.worst.net < 0 ? 'کسری' : 'مازاد'} ${$(Math.abs(y.worst.net))} ${u})` : ''}</p></div>`;
  }

  function draw() {
    el.innerHTML = head() + (mode === 'month' ? monthHtml() : yearHtml());
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const d = Number(b.dataset.d); if (mode === 'month') key = shiftKey(key, -d, cal); else year -= d; draw(); });
    el.querySelector('[data-close]')?.addEventListener('click', async () => {
      const r = monthReview(getState(), key, cal);
      if (await confirmDialog({ title: 'بستن ماه', message: `${monthName(key, cal)} بسته شود؟ ${r.finished ? '' : 'این ماه هنوز تمام نشده. '}بعد از بستن، ثبت یا ویرایش تراکنش در این ماه فقط با تأیید اضافه ممکن است. هر وقت خواستی می‌توانی دوباره بازش کنی.`, confirmText: 'ببند' })) { closeMonth(key); toast('ماه بسته شد'); draw(); }
    });
    el.querySelector('[data-reopen]')?.addEventListener('click', () => { reopenMonth(key); toast('ماه باز شد'); draw(); });
  }
  bindTxClicks();
  draw();
}
