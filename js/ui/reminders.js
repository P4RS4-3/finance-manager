// یادآورها: کارت‌های صفحه‌ی خانه، تنظیمات، و اعلان سیستم (در حد امکان مرورگر)
import { icon } from './icons.js';
import { toast } from './shell.js';
import { getPrefs } from '../core/prefs.js';
import { getState, commit } from '../data/store.js';
import { isoDate } from '../core/ledger.js';
import { dueReminders, remindersOf } from '../core/reminders.js';
import { openLoans } from './loans.js';
import { openReview } from './review.js';

const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function activeReminders() {
  const today = isoDate(), dismissed = lsGet('fm.dismiss', {});
  const last = Number(localStorage.getItem?.('fm.lastBackup') || 0);
  return dueReminders(getState(), getPrefs().calendar, today, last).filter(r => dismissed[r.id] !== today);
}
export function dismissReminder(id) { const d = lsGet('fm.dismiss', {}); d[id] = isoDate(); for (const k of Object.keys(d)) if (d[k] !== isoDate()) delete d[k]; lsSet('fm.dismiss', d); }

export function runAction(r, goto) {
  if (r.action === 'loans') openLoans();
  else if (r.action === 'review') openReview(r.arg);
  else if (r.action === 'deposits') goto('deposits');
  else if (r.action === 'data') { goto('more'); setTimeout(() => document.querySelector('[data-sec=data]')?.click(), 80); }
}
const LABEL = { loans: 'باز کن', review: 'مرور', deposits: 'ثبت', data: 'پشتیبان بگیر' };

export function remindersHtml() {
  const list = activeReminders();
  if (!list.length) return '';
  return `<div class="reminders" id="reminders">${list.map(r => `<section class="glass reminder ${r.urgent ? 'urgent' : ''}" data-rid="${esc(r.id)}"><span class="bubble sm">${icon(r.icon, 18)}</span><div><b>${esc(r.title)}</b><p class="faint">${esc(r.text)}</p></div>
    <button class="btn sm primary" data-ract>${LABEL[r.action]}</button><button class="icon-btn x" data-rx aria-label="امروز نه">${icon('close', 16)}</button></section>`).join('')}</div>`;
}
export function bindReminders(root, goto) {
  const list = activeReminders();
  root.querySelectorAll('[data-rid]').forEach(el => {
    const r = list.find(x => x.id === el.dataset.rid); if (!r) return;
    el.querySelector('[data-ract]').onclick = () => runAction(r, goto);
    el.querySelector('[data-rx]').onclick = () => { dismissReminder(r.id); el.remove(); };
  });
}

/* اعلان سیستم: فقط وقتی برنامه باز می‌شود/به جلو می‌آید (بدون سرور، پس زمان‌بندی دقیق ممکن نیست) */
export async function notifyDue() {
  try {
    if (!remindersOf(getState()).notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    const today = isoDate(), sent = lsGet('fm.notified', {});
    const reg = await navigator.serviceWorker?.getRegistration?.();
    for (const r of activeReminders()) {
      if (sent[r.id] === today) continue;
      sent[r.id] = today;
      const opts = { body: r.text, tag: r.id, icon: 'icons/icon-192.png', lang: 'fa', dir: 'rtl' };
      if (reg?.showNotification) await reg.showNotification(r.title, opts); else new Notification(r.title, opts);
    }
    lsSet('fm.notified', sent);
  } catch { /* اعلان اختیاری است */ }
}
export function initReminders() {
  notifyDue();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) notifyDue(); });
}

export function mountReminders(el) {
  const s = getState(), R = remindersOf(s);
  const set = (path, v) => commit(st => { const r = st.settings.reminders = { ...remindersOf(st), ...(st.settings.reminders || {}) }; const [a, b] = path.split('.'); if (b) r[a] = { ...r[a], [b]: v }; else r[a] = v; }, 'reminders', path);
  const sw = (id, label, sub, on) => `<label class="switch-row"><span>${label}<small class="faint">${sub}</small></span><input type="checkbox" role="switch" data-k="${id}" ${on ? 'checked' : ''}><i class="switch"></i></label>`;
  const notifOk = 'Notification' in window;
  el.innerHTML = `<p class="note">یادآورها داخل برنامه (صفحه‌ی خانه) نشان داده می‌شوند. هر یادآور را می‌توانی برای امروز ببندی.</p>
    ${sw('loan.on', 'اقساط وام', 'نزدیک‌شدن سررسید و دیرکرد، و آماده‌شدن وام', R.loan.on)}
    ${sw('deposit.on', 'ثبت واریزی ماهانه', 'اگر تا روز مشخصی واریزی ماه ثبت نشده باشد', R.deposit.on)}
    <label class="switch-row"><span>روز یادآوری واریزی<small class="faint">از این روز ماه به بعد</small></span><input type="number" min="1" max="29" data-k="deposit.day" value="${R.deposit.day}" class="num mini"></label>
    ${sw('monthEnd.on', 'مرور و بستن ماه', 'آخر ماه و روزهای اول ماه بعد', R.monthEnd.on)}
    ${sw('backup.on', 'پشتیبان‌گیری', 'اگر مدتی فایل پشتیبان نگرفته باشی', R.backup.on)}
    <label class="switch-row"><span>هر چند روز؟</span><input type="number" min="1" max="365" data-k="backup.days" value="${R.backup.days}" class="num mini"></label>
    <h3 class="sub">اعلان سیستم</h3>
    ${notifOk ? sw('notify', 'اعلان روی دستگاه', 'فقط وقتی برنامه را باز می‌کنی نمایش داده می‌شود؛ بدون سرور، اعلان در زمان بسته‌بودن برنامه ممکن نیست', R.notify) : '<p class="faint">این مرورگر اعلان را پشتیبانی نمی‌کند.</p>'}`;
  el.querySelectorAll('[data-k]').forEach(i => i.onchange = async () => {
    const k = i.dataset.k;
    if (i.type === 'checkbox') {
      if (k === 'notify' && i.checked) { const p = await Notification.requestPermission(); if (p !== 'granted') { i.checked = false; return toast('اجازه‌ی اعلان داده نشد؛ از تنظیمات مرورگر فعالش کن'); } }
      set(k, i.checked);
      if (k === 'notify' && i.checked) notifyDue();
    } else { const v = Math.max(+i.min, Math.min(+i.max, parseInt(i.value, 10) || +i.min)); i.value = v; set(k, v); }
    toast('ذخیره شد');
  });
}
