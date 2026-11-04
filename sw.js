/* سرویس‌ورکر مدیریت مالی — نسخه 1.1.0
   پیش‌کش اتمیک: همه‌ی فایل‌ها در یک کش نسخه‌دار ذخیره می‌شوند؛ اگر یکی ناقص بود، نسخه‌ی قبلی دست‌نخورده می‌ماند. */
const VERSION = '1.1.0';
const CACHE = 'fm-' + VERSION;
const FILES = [
 "./",
 "css/base.css",
 "css/components.css",
 "css/glass.css",
 "css/layout.css",
 "css/tokens.css",
 "favicon.svg",
 "fonts/Estedad-Variable.woff2",
 "fonts/FarYekan-Regular.ttf",
 "fonts/Gandom-Regular.woff",
 "fonts/IranianSans-Bold.ttf",
 "fonts/IranianSans-Regular.ttf",
 "fonts/Parastoo-Regular.woff",
 "fonts/Sahel-Black.woff",
 "fonts/Sahel-Bold.woff",
 "fonts/Sahel-Regular.woff",
 "fonts/Samim-Bold.woff2",
 "fonts/Samim-Regular.woff2",
 "fonts/Vazir-Bold.woff2",
 "fonts/Vazir-Medium.woff2",
 "fonts/Vazir-Regular.woff2",
 "icons/apple-touch-icon.png",
 "icons/favicon-32.png",
 "icons/favicon-48.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon.svg",
 "icons/maskable-512.png",
 "index.html",
 "js/core/backup.js",
 "js/core/changelog.js",
 "js/core/exporters.js",
 "js/core/fonts.js",
 "js/core/format.js",
 "js/core/jalali.js",
 "js/core/ledger.js",
 "js/core/loans.js",
 "js/core/months.js",
 "js/core/pin.js",
 "js/core/prefs.js",
 "js/core/reminders.js",
 "js/core/review.js",
 "js/core/stats.js",
 "js/core/words.js",
 "js/core/zip.js",
 "js/data/db.js",
 "js/data/defaults.js",
 "js/data/demo.js",
 "js/data/store.js",
 "js/i18n/fa.js",
 "js/main.js",
 "js/ui/buckets.js",
 "js/ui/charts.js",
 "js/ui/deposit.js",
 "js/ui/effects.js",
 "js/ui/exports.js",
 "js/ui/fields.js",
 "js/ui/forms.js",
 "js/ui/history.js",
 "js/ui/home.js",
 "js/ui/icons.js",
 "js/ui/install.js",
 "js/ui/loans.js",
 "js/ui/lock.js",
 "js/ui/manage.js",
 "js/ui/modal.js",
 "js/ui/onboarding.js",
 "js/ui/reminders.js",
 "js/ui/review.js",
 "js/ui/search.js",
 "js/ui/settings.js",
 "js/ui/shell.js",
 "js/ui/txlist.js",
 "js/ui/updater.js",
 "manifest.webmanifest"
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache:'reload' یعنی کش HTTP مرورگر/GitHub نادیده گرفته شود تا فایل تازه گرفته شود
    await Promise.all(FILES.map(async f => { const r = await fetch(new Request(f, { cache: 'reload' })); if (!r.ok) throw new Error('precache failed: ' + f); await c.put(f, r); }));
  })());
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
    try { return await fetch(req); } catch { return new Response('آفلاین', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
  })());
});
