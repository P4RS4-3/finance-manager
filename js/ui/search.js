// جستجوی سراسری (Ctrl+K یا /): تراکنش‌ها، هشتگ‌ها و میان‌برهای برنامه
import { icon } from './icons.js';
import { openSheet } from './modal.js';
import { openTxDetail, txRow } from './txlist.js';
import { openExpense, openTransfer } from './forms.js';
import { getState } from '../data/store.js';
import { filterTxs, tagUsage } from '../core/ledger.js';
import { getPrefs } from '../core/prefs.js';
import { setHistoryFilter } from './history.js';

export function openSearch(goto) {
  const s = getState(), hide = getPrefs().hideBalances;
  const cmds = [
    ['واریزی جدید', 'plus', () => goto('deposits')], ['ثبت خرج', 'minus', () => openExpense()], ['انتقال بین صندوق‌ها', 'swap', () => openTransfer()],
    ['خانه', 'home', () => goto('home')], ['صندوق‌ها', 'grid', () => goto('buckets')], ['تاریخچه', 'history', () => goto('history')], ['تنظیمات', 'settings', () => goto('more')],
  ];
  const body = document.createElement('div');
  body.innerHTML = `<div class="search-box big">${icon('search', 20)}<input id="gq" type="search" placeholder="جستجو: عنوان، یادداشت، #هشتگ، مبلغ یا فرمان…" autocomplete="off" aria-label="جستجو" autofocus></div><div id="gres" class="gres" role="listbox"></div>`;
  const m = openSheet({ title: 'جستجو', body, wide: true });
  const input = body.querySelector('#gq'), res = body.querySelector('#gres');
  const draw = () => {
    const q = input.value.trim(); let html = '';
    const cm = cmds.filter(([n]) => !q || n.includes(q));
    if (cm.length) html += `<h3 class="day">فرمان‌ها</h3><div class="cmds">${cm.map(([n, ic], i) => `<button class="btn" data-cmd="${cmds.findIndex(c => c[0] === n)}">${icon(ic, 16)} ${n}</button>`).join('')}</div>`;
    if (q) {
      const tags = Object.keys(tagUsage(s)).filter(t => ('#' + t).includes(q.toLowerCase()) || t.includes(q.replace(/^#/, '')));
      if (tags.length) html += `<h3 class="day">هشتگ‌ها</h3><div class="tags">${tags.slice(0, 8).map(t => `<button class="tag s" data-tag="${t}">#${t}</button>`).join('')}</div>`;
      const list = filterTxs(s, { q }).slice(0, 12);
      html += `<h3 class="day">تراکنش‌ها${list.length ? '' : ' — موردی پیدا نشد'}</h3><ul class="tx-list">${list.map(tx => txRow(tx, hide)).join('')}</ul>`;
    }
    res.innerHTML = html;
  };
  input.oninput = draw; draw();
  res.addEventListener('click', e => {
    const c = e.target.closest('[data-cmd]'), t = e.target.closest('[data-tag]'), tx = e.target.closest('[data-tx]');
    if (c) { m.close(); cmds[+c.dataset.cmd][2](); }
    else if (t) { m.close(); setHistoryFilter({ tag: t.dataset.tag, q: '', type: '', bucket: '' }); goto('history'); }
    else if (tx) { e.stopPropagation(); m.close(); openTxDetail(tx.dataset.tx); }
  }, true);
}
