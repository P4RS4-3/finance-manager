// مدیریت فونت‌ها: فایل‌های محلی (fonts/…) → در صورت نبودن، فونت سیستم با پیام روشن.
// هر فونت می‌تواند چند وزن داشته باشد. اولویت فرمت: woff2 ← woff ← ttf (eot لازم نیست).
// در پیش‌نمایش تک‌فایلی، فونت‌ها به‌صورت base64 در window.__FONTS قرار می‌گیرند.
export const FONTS = [
  { id: 'vazir', name: 'وزیر', family: 'Vazir', faces: [[400, 'Vazir-Regular.woff2'], [500, 'Vazir-Medium.woff2'], [700, 'Vazir-Bold.woff2']] },
  { id: 'estedad', name: 'استعداد', family: 'Estedad', faces: [['100 900', 'Estedad-Variable.woff2']] },
  { id: 'samim', name: 'صمیم', family: 'Samim', faces: [[400, 'Samim-Regular.woff2'], [700, 'Samim-Bold.woff2']] },
  { id: 'sahel', name: 'ساحل', family: 'Sahel', faces: [[400, 'Sahel-Regular.woff'], [700, 'Sahel-Bold.woff'], [900, 'Sahel-Black.woff']] },
  { id: 'iransans', name: 'ایران‌سنس', family: 'Iranian Sans', faces: [[400, 'IranianSans-Regular.ttf'], [700, 'IranianSans-Bold.ttf']] },
  { id: 'parastoo', name: 'پرستو', family: 'Parastoo', faces: [[400, 'Parastoo-Regular.woff']] },
  { id: 'gandom', name: 'گندم', family: 'Gandom', faces: [[400, 'Gandom-Regular.woff']] },
  { id: 'yekan', name: 'یکان', family: 'Farsi Yekan', faces: [[400, 'FarYekan-Regular.ttf']] },
  { id: 'system', name: 'فونت سیستم', family: '', system: true },
];

export const fontStatus = {}; // id -> 'ok' | 'missing' | 'loading' | 'system'
const SYSTEM_STACK = 'Tahoma, "Segoe UI", "Noto Naskh Arabic", system-ui, sans-serif';
const FORMAT = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };

async function loadFace(family, weight, file, base) {
  const ext = file.split('.').pop();
  const url = (typeof window !== 'undefined' && window.__FONTS && window.__FONTS[file]) || `${base}fonts/${file}`;
  const face = new FontFace(family, `url("${url}") format("${FORMAT[ext]}")`, { weight: String(weight), display: 'swap' });
  await face.load();
  document.fonts.add(face);
}

export async function loadFont(id, base = '') {
  const f = FONTS.find(x => x.id === id) || FONTS[0];
  if (f.system) { fontStatus[f.id] = 'system'; return f; }
  if (fontStatus[f.id] === 'ok') return f;
  fontStatus[f.id] = 'loading';
  const res = await Promise.allSettled(f.faces.map(([w, file]) => loadFace(f.family, w, file, base)));
  const okCount = res.filter(r => r.status === 'fulfilled').length;
  fontStatus[f.id] = okCount === 0 ? 'missing' : okCount < f.faces.length ? 'partial' : 'ok';
  return f;
}

export async function applyFont(id, base = '') {
  const f = await loadFont(id, base);
  const usable = f.family && (fontStatus[f.id] === 'ok' || fontStatus[f.id] === 'partial');
  document.documentElement.style.setProperty('--font-ui', (usable ? `"${f.family}", ` : '') + SYSTEM_STACK);
  return fontStatus[f.id];
}

export const weightsText = f => f.system ? '' : f.faces.map(([w]) => (typeof w === 'string' ? 'همه‌ی وزن‌ها' : { 100: 'نازک', 400: 'معمولی', 500: 'متوسط', 700: 'ضخیم', 900: 'خیلی ضخیم' }[w])).join(' · ');

export const statusText = s => ({
  ok: 'بارگذاری شد', loading: 'در حال بارگذاری…', system: 'فونت دستگاه',
  partial: 'بعضی وزن‌ها پیدا نشد؛ بقیه کار می‌کنند',
  missing: 'فایل فونت پیدا نشد؛ از فونت سیستم استفاده می‌شود',
}[s] || 'هنوز بارگذاری نشده');
