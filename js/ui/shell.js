import { t } from '../i18n/fa.js';
import { icon } from './icons.js';
import { transition } from './effects.js';

const TABS = [
  ['home', 'home'], ['deposits', 'arrowDown'], ['buckets', 'grid'], ['history', 'history'], ['more', 'settings'],
];

export function buildShell(app) {
  const items = (cls) => TABS.map(([id, ic]) => `<button class="${cls}" data-tab="${id}" aria-label="${t('nav.' + id)}">${icon(ic, 22)}<span>${t('nav.' + id)}</span></button>`).join('');
  app.innerHTML = `
    <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <aside class="sidebar glass" aria-label="منوی اصلی">
      <div class="brand"><span class="logo">${icon('coins', 26)}</span><b>${t('app')}</b></div>
      <nav>${items('nav-item')}</nav>
      <div class="side-foot faint">نسخه ۱.۰.۰ · P4RS4</div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="brand-m"><span class="logo">${icon('coins', 22)}</span><b>${t('app')}</b></div>
        <h1 id="pageTitle"></h1>
        <div class="top-actions">
          <button class="icon-btn" data-search aria-label="جستجو (Ctrl+K)">${icon('search', 20)}</button>
          <button class="icon-btn" data-tab="more" aria-label="ظاهر">${icon('palette', 20)}</button>
        </div>
      </header>
      <div id="view" class="view"></div>
    </main>
    <nav class="bottom-nav glass" aria-label="ناوبری">${items('tab')}</nav>
    <div id="toast" class="toast glass" role="status"></div>`;
}

export function setActive(tab) {
  document.querySelectorAll('[data-tab]').forEach(el => el.classList.toggle('active', el.dataset.tab === tab && !el.classList.contains('icon-btn')));
  document.getElementById('pageTitle').textContent = tab === 'home' ? '' : (tab === 'more' ? 'تنظیمات' : t('nav.' + tab));
}

export function onNavigate(fn) {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-tab]');
    if (el) transition(() => fn(el.dataset.tab));
  });
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
}
