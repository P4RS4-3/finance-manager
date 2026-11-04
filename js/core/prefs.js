// تنظیمات ظاهری در localStorage (برای شروع بدون پرش) — داده‌های مالی در IndexedDB می‌روند
const KEY = 'fm.prefs.v1';

export const THEMES = [
  { id: 'midnight', name: 'نیمه‌شب', dark: true,  sw: ['#5b8cff', '#8f6bff'] },
  { id: 'violet',   name: 'بنفش',    dark: true,  sw: ['#a855f7', '#ec4899'] },
  { id: 'ocean',    name: 'اقیانوس', dark: true,  sw: ['#14b8a6', '#0ea5e9'] },
  { id: 'sunset',   name: 'غروب',    dark: true,  sw: ['#fb923c', '#f43f5e'] },
  { id: 'forest',   name: 'جنگل',    dark: true,  sw: ['#34d399', '#84cc16'] },
  { id: 'graphite', name: 'گرافیت',  dark: true,  sw: ['#94a3b8', '#cbd5e1'] },
  { id: 'amoled',   name: 'آمولد',   dark: true,  sw: ['#60a5fa', '#a78bfa'] },
  { id: 'ruby',     name: 'یاقوت',   dark: true,  sw: ['#f43f5e', '#e11d48'] },
  { id: 'gold',     name: 'طلایی',   dark: true,  sw: ['#fbbf24', '#f59e0b'] },
  { id: 'rose',     name: 'رز',      dark: true,  sw: ['#f472b6', '#c084fc'] },
  { id: 'paper',    name: 'کاغذ',    dark: false, sw: ['#3b6cf0', '#7c5cff'] },
  { id: 'ice',      name: 'یخ',      dark: false, sw: ['#0ea5e9', '#6366f1'] },
  { id: 'turquoise', name: 'فیروزه‌ای', dark: true, sw: ['#2dd4bf', '#5eead4'] },
  { id: 'neon',     name: 'نئون',    dark: true,  sw: ['#22ffd0', '#ff3df2'] },
  { id: 'aurora',   name: 'شفق',     dark: true,  sw: ['#4ade80', '#38bdf8'] },
  { id: 'chocolate',name: 'شکلاتی',  dark: true,  sw: ['#d9a066', '#c2703d'] },
  { id: 'lime',     name: 'لیمویی',  dark: true,  sw: ['#bef264', '#facc15'] },
  { id: 'deepsea',  name: 'اعماق',   dark: true,  sw: ['#3b82f6', '#06b6d4'] },
  { id: 'volcano',  name: 'آتشفشان', dark: true,  sw: ['#ff5a1f', '#ff2d55'] },
  { id: 'lilac',    name: 'یاسی',    dark: true,  sw: ['#c4b5fd', '#f0abfc'] },
  { id: 'mint',     name: 'نعنایی',  dark: false, sw: ['#10b981', '#06b6d4'] },
  { id: 'peach',    name: 'هلویی',   dark: false, sw: ['#f97316', '#ec4899'] },
  { id: 'lavender', name: 'اطلسی',   dark: false, sw: ['#7c3aed', '#d946ef'] },
  { id: 'sky',      name: 'آسمانی',  dark: false, sw: ['#2563eb', '#0ea5e9'] },
];

export const PALETTE = ['#38bdf8','#6366f1','#a78bfa','#f472b6','#fb7185','#fb923c','#fbbf24','#a3e635','#34d399','#2dd4bf','#22d3ee','#94a3b8'];

export const DEFAULTS = {
  theme: 'midnight', lightTheme: 'paper', mode: 'dark', // dark | light | auto
  accent: '',            // خالی = رنگ تم
  font: 'vazir', fontSize: 100, glass: 60,
  fx: { aurora: true, spot: true, tilt: true, count: true, ripple: true, transitions: true, confetti: true, haptics: true },
  motionOverride: false,
  calendar: 'jalali', unit: 'toman', hideBalances: false,
  buckets: {}, // id -> {name, icon, color}
};

let state = structuredClone(DEFAULTS);
const subs = new Set();

export function loadPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    state = { ...structuredClone(DEFAULTS), ...raw, fx: { ...DEFAULTS.fx, ...(raw.fx || {}) } };
  } catch { state = structuredClone(DEFAULTS); }
  return state;
}
export const getPrefs = () => state;
export function setPrefs(patch) {
  state = { ...state, ...patch, fx: { ...state.fx, ...(patch.fx || {}) } };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* حالت خصوصی */ }
  subs.forEach(f => f(state));
}
export const onPrefs = f => (subs.add(f), () => subs.delete(f));

export function effectiveTheme(p = state) {
  const t = THEMES.find(x => x.id === p.theme) || THEMES[0];
  if (p.mode === 'dark') return t.dark ? t.id : 'midnight';
  if (p.mode === 'light') return t.dark ? p.lightTheme : t.id;
  const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? (t.dark ? t.id : 'midnight') : (t.dark ? p.lightTheme : t.id);
}

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

/** اعمال همه‌ی تنظیمات روی DOM */
export function applyPrefs(p = state) {
  const r = document.documentElement;
  r.dataset.theme = effectiveTheme(p);
  r.style.setProperty('--fs-scale', p.fontSize / 100);
  r.style.setProperty('--blur', (6 + p.glass * 0.4) + 'px');
  r.style.setProperty('--fx', p.fx.aurora || p.fx.spot ? 1 : 0);
  if (p.accent) {
    r.style.setProperty('--a1', p.accent);
    const [rr, g, b] = hexToRgb(p.accent);
    const lum = (0.299 * rr + 0.587 * g + 0.114 * b) / 255;
    r.style.setProperty('--on-accent', lum > 0.6 ? '#10131a' : '#ffffff');
  } else { r.style.removeProperty('--a1'); r.style.removeProperty('--on-accent'); }
  r.dataset.motion = p.motionOverride ? 'force' : '';
  for (const k of Object.keys(p.fx)) r.dataset['fx' + k[0].toUpperCase() + k.slice(1)] = p.fx[k] ? 'on' : 'off';
}
