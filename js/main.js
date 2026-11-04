import { loadPrefs, applyPrefs, onPrefs, getPrefs } from './core/prefs.js';
import { applyFont } from './core/fonts.js';
import { init as initStore, onState, getState } from './data/store.js';
import { buildShell, setActive, onNavigate, toast } from './ui/shell.js';
import { renderHome } from './ui/home.js';
import { renderDeposit } from './ui/deposit.js';
import { renderHistory } from './ui/history.js';
import { renderBuckets } from './ui/buckets.js';
import { renderSettings, resetSettingsNav } from './ui/settings.js';
import { openExpense, openTransfer } from './ui/forms.js';
import { initPointerFx } from './ui/effects.js';
import { initLock } from './ui/lock.js';
import { startOnboarding } from './ui/onboarding.js';
import { openSearch } from './ui/search.js';
import { initUpdater } from './ui/updater.js';
import { initReminders } from './ui/reminders.js';
import { captureInstallPrompt } from './ui/install.js';
import { icon } from './ui/icons.js';
import { t } from './i18n/fa.js';

loadPrefs();
applyPrefs();
captureInstallPrompt();

const app = document.getElementById('app');
let tab = new URLSearchParams(location.search).get('tab') || 'home';

function goto(next) {
  if (next !== 'more' || tab !== 'more') resetSettingsNav();
  tab = next; render(false);
}

/** keepScroll=true: بازرسم بعد از تغییر داده، بدون انیمیشن و بدون پرش */
function render(keepScroll = false) {
  const view = document.getElementById('view');
  setActive(tab);
  view.classList.toggle('static', keepScroll);
  if (tab === 'home') renderHome(view, { goto, animate: !keepScroll });
  else if (tab === 'deposits') { if (!keepScroll) renderDeposit(view); }
  else if (tab === 'history') renderHistory(view);
  else if (tab === 'buckets') renderBuckets(view, { goto });
  else if (tab === 'more') renderSettings(view);
  else view.innerHTML = `<div class="glass pad empty">${icon('rocket', 40)}<h2>${t('nav.' + tab)}</h2><p class="dim">${t('soon')}</p></div>`;
  if (!keepScroll) scrollTo(0, 0);
}

async function start() {
buildShell(app);
initPointerFx();
onNavigate(goto);
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!document.querySelector('.lockscreen,.onboard')) openSearch(goto); return; }
  if (e.target.closest('input,textarea,select') || document.documentElement.classList.contains('modal-open')) return;
  if (e.key === '/') { e.preventDefault(); openSearch(goto); }
  if (e.key === 'n') { e.preventDefault(); goto('deposits'); }
  if (e.key === 'e') { e.preventDefault(); openExpense(); }
  if (e.key === 't') { e.preventDefault(); openTransfer(); }
});
onState(() => { if (tab !== 'deposits' && tab !== 'more') render(true); });

let last = JSON.stringify({ h: getPrefs().hideBalances, c: getPrefs().calendar, u: getPrefs().unit, b: getPrefs().buckets });
onPrefs(p => {
  applyPrefs(p);
  const now = JSON.stringify({ h: p.hideBalances, c: p.calendar, u: p.unit, b: p.buckets });
  if (now !== last) { last = now; render(true); }
});
app.addEventListener('prefs-changed', () => { applyPrefs(); render(true); });
applyFont(getPrefs().font);
render();
document.addEventListener('click', e => { if (e.target.closest('[data-search]')) openSearch(goto); });
initLock();
initUpdater();
initReminders();
if (!getState().settings.onboarded && !getState().txs.length) startOnboarding();
window.__fm = { getState, goto }; // برای تست
}
initStore().then(start).catch(e => { document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif;direction:rtl">خطا در بارگذاری داده‌ها: ' + e.message + '</p>'; });
