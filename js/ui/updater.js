// ثبت سرویس‌ورکر، بنر به‌روزرسانی، و حداقل نسخه‌ی اجباری
import { icon } from './icons.js';
import { VERSION, cmpVersion } from '../core/changelog.js';
import { flush } from '../data/store.js';

let reg = null, bannerShown = false;
export const canSW = () => 'serviceWorker' in navigator && /^https?:$/.test(location.protocol);

async function fetchVersion() {
  try { const r = await fetch('version.json', { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; }
}

async function applyUpdate() {
  await flush();
  if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  else location.reload();
}

async function showBanner() {
  if (bannerShown) return; bannerShown = true;
  const v = await fetchVersion();
  const el = document.createElement('div'); el.className = 'update-banner glass'; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="tx-ic neu">${icon('download', 18)}</span><div class="ub-t"><b>نسخه‌ی جدید آماده است${v ? ` (${v.version})` : ''}</b>${v?.notes?.length ? `<small class="faint">${v.notes[0]}</small>` : ''}</div><button class="btn primary sm" data-up>به‌روزرسانی</button><button class="icon-btn sm" data-later aria-label="بعداً">${icon('close', 16)}</button>`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  el.querySelector('[data-up]').onclick = applyUpdate;
  el.querySelector('[data-later]').onclick = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); bannerShown = false; };
}

function blockOld(minV) {
  const el = document.createElement('div'); el.className = 'lockscreen';
  el.innerHTML = `<div class="lock-card glass"><span class="logo lg">${icon('download', 30)}</span><h2>به‌روزرسانی لازم است</h2><p class="dim">برای ادامه باید نسخه‌ی ${minV} یا بالاتر را نصب کنی. داده‌هایت سر جایشان می‌مانند.</p><button class="btn primary big" data-up>به‌روزرسانی</button></div>`;
  document.body.append(el); document.documentElement.classList.add('modal-open');
  el.querySelector('[data-up]').onclick = async () => { await reg?.update?.(); await applyUpdate(); setTimeout(() => location.reload(), 1500); };
}

export async function checkForUpdate() { try { await reg?.update(); } catch { /* آفلاین */ } return !!reg?.waiting; }

export async function initUpdater() {
  if (canSW()) {
    try {
      reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      if (reg.waiting && navigator.serviceWorker.controller) showBanner();
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showBanner(); });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
      setInterval(() => reg.update().catch(() => {}), 36e5);
    } catch { /* ثبت نشد؛ برنامه بدون آفلاین کار می‌کند */ }
  }
  const v = await fetchVersion();
  if (v?.minVersion && cmpVersion(VERSION, v.minVersion) < 0) blockOld(v.minVersion);
}
