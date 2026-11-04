// بخش «نصب و به‌روزرسانی» در تنظیمات
import { icon } from './icons.js';
import { toast } from './shell.js';
import { VERSION, CHANGELOG } from '../core/changelog.js';
import { checkForUpdate, canSW } from './updater.js';

let deferred = null;
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; });
}
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);

export function mountInstall(el, rerender) {
  const installed = standalone();
  const steps = isIOS
    ? ['برنامه را در <b>Safari</b> باز کن.', 'دکمه‌ی <b>اشتراک‌گذاری</b> (مربع با فلش رو به بالا) را بزن.', 'گزینه‌ی <b>Add to Home Screen</b> (افزودن به صفحه‌ی اصلی) را بزن و تأیید کن.']
    : isAndroid ? ['در <b>Chrome</b> منوی ⋮ را باز کن.', 'گزینه‌ی <b>Install app</b> یا <b>Add to Home screen</b> را بزن.']
      : ['در <b>Edge</b> یا <b>Chrome</b> روی آیکون نصب (در انتهای نوار آدرس) بزن، یا از منو: <b>Apps ← Install this site as an app</b>.'];
  el.innerHTML = `
    <div class="inst-state ${installed ? 'ok' : ''}">${icon(installed ? 'check' : 'download', 18)} ${installed ? 'برنامه نصب شده و در حالت مستقل اجرا می‌شود' : 'الان داخل مرورگر باز است'}</div>
    ${!installed && deferred ? '<button class="btn primary big" id="inst">نصب برنامه روی این دستگاه</button>' : ''}
    ${!installed ? `<h3 class="sub">راهنمای نصب ${isIOS ? 'iPhone/iPad' : isAndroid ? 'اندروید' : 'ویندوز / کامپیوتر'}</h3><ol class="steps-ol">${steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
    ${isIOS ? '<p class="note">نکته‌ی iOS: برنامه‌ی نصب‌شده روی صفحه‌ی اصلی، داده‌های جدا از Safari دارد. اگر قبلاً در Safari چیزی ثبت کرده‌ای، اول پشتیبان بگیر و در برنامه‌ی نصب‌شده بازیابی کن.</p>' : ''}
    <h3 class="sub">نسخه و به‌روزرسانی</h3>
    <p>نسخه‌ی فعلی: <b class="num">${VERSION}</b></p>
    <button class="btn" id="chk" ${canSW() ? '' : 'disabled'}>بررسی نسخه‌ی جدید</button>
    ${canSW() ? '' : '<p class="note">آفلاین‌شدن و به‌روزرسانی فقط وقتی کار می‌کند که برنامه از آدرس اینترنتی (https) باز شده باشد، نه از روی فایل.</p>'}
    <h3 class="sub">تغییرات نسخه‌ها</h3>${CHANGELOG.map(c => `<details class="glass glass-flat audit" ${c === CHANGELOG[0] ? 'open' : ''}><summary><b class="num">${c.version}</b> <span class="faint">${c.date}</span></summary><ul>${c.notes.map(n => `<li>${n}</li>`).join('')}</ul></details>`).join('')}`;
  el.querySelector('#inst')?.addEventListener('click', async () => { deferred.prompt(); await deferred.userChoice; deferred = null; rerender(); });
  el.querySelector('#chk')?.addEventListener('click', async e => { e.target.disabled = true; const up = await checkForUpdate(); toast(up ? 'نسخه‌ی جدید پیدا شد؛ بنر به‌روزرسانی را ببین' : 'نسخه‌ی تو آخرین نسخه است'); e.target.disabled = false; });
}
