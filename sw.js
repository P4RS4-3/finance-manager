/* سرویس‌ورکر مدیریت مالی — نسخه 1.1.5
   پیش‌کش اتمیک: همه‌ی فایل‌ها در یک کش نسخه‌دار ذخیره می‌شوند؛ اگر یکی ناقص بود، نسخه‌ی قبلی دست‌نخورده می‌ماند. */
const VERSION = '1.1.5';
const CACHE = 'fm-' + VERSION + '.671c678c';
const FILES = [
 "./",
 "app.3dadd928.js",
 "app.4f078ffa.css",
 "favicon.svg",
 "fonts/Vazirmatn-Variable.woff2",
 "icons/apple-touch-icon.png",
 "icons/favicon-32.png",
 "icons/favicon-48.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon.svg",
 "icons/maskable-512.png",
 "index.html",
 "manifest.webmanifest"
];

self.addEventListener('install', e => {
  e.waitUntil((async () => { try {
    const c = await caches.open(CACHE);
    // دو لایه ضد کش کهنه: cache:'reload' (کش مرورگر) + پارامتر ?fm=نسخه (کش CDN گیت‌هاب که تا ~۱۰ دقیقه فایل قدیمی می‌دهد).
    // پاسخ زیر کلید تمیز (بدون پارامتر) ذخیره می‌شود.
    const bust = f => f + (f.includes('?') ? '&' : '?') + 'fm=' + VERSION;
    await Promise.all(FILES.map(async f => { const r = await fetch(new Request(bust(f), { cache: 'reload' })); if (!r.ok) throw new Error('precache failed: ' + f); await c.put(f, r); }));
    // اگر version.json تازه‌ی سرور با نسخه‌ی این SW نمی‌خواند، یعنی فایل‌ها نیمه‌به‌روز آپلود شده‌اند؛ نصب را رد می‌کنیم تا نسخه‌ی قبلی سالم بماند
    const vr = await fetch(new Request(bust('version.json'), { cache: 'reload' }));
    if (vr.ok) { const v = await vr.json(); if (v.version && v.version !== VERSION) throw new Error('version mismatch: ' + v.version + ' != ' + VERSION); }
  } catch (err) { await caches.delete(CACHE); throw err; } })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('fm-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // version.json: اول شبکه (برای تشخیص نسخه‌ی جدید)، آفلاین از کش
  if (url.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' }) || (req.mode === 'navigate' ? await c.match('./') : null);
    if (hit) return hit;
    try {
      const r = await fetch(req);
      // فونت‌های اختیاری: بار اول از شبکه، از آن به بعد از کش (آفلاین هم کار می‌کنند)
      if (r.ok && url.pathname.includes('/fonts/')) c.put(req, r.clone());
      return r;
    } catch { return new Response('آفلاین', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
  })());
});
