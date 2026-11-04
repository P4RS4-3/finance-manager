// صفحه‌ی قفل + تنظیمات PIN
import { icon } from './icons.js';
import { openSheet, confirmDialog, alertDialog } from './modal.js';
import { toast } from './shell.js';
import * as pin from '../core/pin.js';

let locked = false, hiddenAt = 0, idleTimer = null;

export function lockNow() {
  if (locked || !pin.hasPin()) return;
  locked = true;
  const el = document.createElement('div');
  el.className = 'lockscreen'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'قفل برنامه');
  let val = '';
  const draw = (msg = '') => {
    const { wait } = pin.lockInfo();
    el.innerHTML = `<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div><div class="lock-card glass"><span class="logo lg">${icon('lock', 32)}</span><h2>مدیریت مالی</h2>
      <p class="dim" id="lm" aria-live="polite">${wait > 0 ? `چند بار اشتباه زدی. ${wait} ثانیه صبر کن` : msg || 'PIN را وارد کن'}</p>
      <div class="dots" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i < val.length ? 'on' : ''}"></i>`).join('')}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button class="key" data-k="${k}" ${wait > 0 ? 'disabled' : ''} aria-label="${k === '⌫' ? 'پاک کردن' : k}">${k}</button>`).join('')}</div></div>`;
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => press(b.dataset.k));
  };
  async function press(k) {
    if (k === '⌫') val = val.slice(0, -1); else if (val.length < 4) val += k;
    draw();
    if (val.length === 4) {
      const r = await pin.checkPin(val); val = '';
      if (r === 'ok') { locked = false; el.classList.add('out'); setTimeout(() => el.remove(), 300); document.documentElement.classList.remove('modal-open'); return; }
      el.querySelector('.lock-card').classList.add('shake');
      draw(r === 'locked' ? '' : 'PIN اشتباه است');
      if (r === 'locked') countdown();
    }
  }
  function countdown() {
    const t = setInterval(() => { if (pin.lockInfo().wait <= 0) { clearInterval(t); if (locked) draw(); } else draw(); }, 1000);
  }
  document.addEventListener('keydown', function kd(e) {
    if (!locked) return document.removeEventListener('keydown', kd);
    if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫');
  });
  document.body.append(el); document.documentElement.classList.add('modal-open');
  draw(); if (pin.lockInfo().wait > 0) countdown();
}

/** قفل خودکار: هنگام شروع، و بعد از ماندن در پس‌زمینه یا بی‌حرکتی */
export function initLock() {
  if (pin.hasPin()) lockNow();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else { const m = pin.getAutoLock(); if (pin.hasPin() && m > 0 && hiddenAt && Date.now() - hiddenAt >= m * 6e4) lockNow(); }
  });
  const reset = () => {
    clearTimeout(idleTimer); const m = pin.getAutoLock();
    if (pin.hasPin() && m > 0) idleTimer = setTimeout(lockNow, m * 6e4);
  };
  ['pointerdown', 'keydown', 'scroll'].forEach(ev => document.addEventListener(ev, reset, { passive: true }));
  reset();
}

/* ---------- بخش تنظیمات امنیت ---------- */
async function askPin(title, text = '') {
  return new Promise(res => {
    const body = document.createElement('div'); body.className = 'form';
    body.innerHTML = `<p class="dim">${text}</p><input class="pin-in num" inputmode="numeric" maxlength="4" autocomplete="off" type="password" dir="ltr" placeholder="••••" aria-label="${title}" autofocus><div class="c-actions"><button class="btn primary" data-ok>تأیید</button></div>`;
    let done = false; const m = openSheet({ title, body, onClose: () => { if (!done) res(null); } });
    const inp = body.querySelector('input'), go = () => { if (!pin.validPinFormat(inp.value)) return toast('PIN باید ۴ رقم باشد'); done = true; res(inp.value); m.close(); };
    inp.onkeydown = e => { if (e.key === 'Enter') go(); }; body.querySelector('[data-ok]').onclick = go;
  });
}
async function verify() { const p = await askPin('PIN فعلی'); if (p == null) return false; const r = await pin.checkPin(p); if (r === 'ok') return true; toast(r === 'locked' ? 'چند ثانیه صبر کن و دوباره تلاش کن' : 'PIN اشتباه است'); return false; }

export async function createPinFlow() {
  const a = await askPin('PIN جدید', 'یک عدد ۴ رقمی انتخاب کن.'); if (a == null) return false;
  const b = await askPin('تکرار PIN', 'همان عدد را دوباره بنویس.'); if (b == null) return false;
  if (a !== b) { toast('دو PIN یکی نبودند'); return false; }
  await pin.setPin(a); toast('PIN فعال شد'); return true;
}

export function mountSecurity(el, rerender) {
  const has = pin.hasPin(), auto = pin.getAutoLock();
  el.innerHTML = `<p class="note">PIN فقط صفحه‌ی برنامه را قفل می‌کند تا کسی که گوشی/کامپیوترت را برمی‌دارد مبالغ را نبیند. این رمزنگاری نیست؛ فایل پشتیبان و داده‌ی مرورگر رمز ندارند.</p>
    <div class="data-grid">${has ? '<button class="btn" id="chg">تغییر PIN</button><button class="btn danger" id="rm">حذف PIN</button><button class="btn primary" id="now">قفل کن</button>' : '<button class="btn primary big" id="mk">فعال‌کردن PIN</button>'}</div>
    ${has ? `<h3 class="sub">قفل خودکار</h3><div class="seg" data-seg="auto">${[[0, 'خاموش'], [1, '۱ دقیقه'], [5, '۵ دقیقه'], [15, '۱۵ دقیقه']].map(([v, l]) => `<button class="${auto === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div><p class="note">بعد از این مدتِ بی‌حرکتی یا ماندن برنامه در پس‌زمینه، دوباره PIN خواسته می‌شود.</p>` : ''}
    <p class="note">اگر PIN را فراموش کنی، راه برگشت ندارد، چون هیچ‌جا ذخیره نشده. در آن صورت فقط با پاک‌کردن داده‌های سایت از مرورگر می‌شود وارد شد؛ پس فایل پشتیبان داشته باش.</p>`;
  el.querySelector('#mk')?.addEventListener('click', async () => { if (await createPinFlow()) rerender(); });
  el.querySelector('#chg')?.addEventListener('click', async () => { if (await verify() && await createPinFlow()) rerender(); });
  el.querySelector('#rm')?.addEventListener('click', async () => { if (await verify() && await confirmDialog({ title: 'حذف PIN', message: 'برنامه دیگر قفل نخواهد بود.', confirmText: 'حذف', danger: true })) { pin.removePin(); toast('PIN حذف شد'); rerender(); } });
  el.querySelector('#now')?.addEventListener('click', () => lockNow());
  el.querySelectorAll('[data-seg=auto] button').forEach(b => b.onclick = () => { pin.setAutoLock(+b.dataset.v); rerender(); });
}
export { alertDialog };
