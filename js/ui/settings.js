// مرکز تنظیمات: لیست دسته‌ها (موبایل: لیست ← جزئیات، دسکتاپ: دو ستون)
import { icon, PICKABLE } from './icons.js';
import { THEMES, PALETTE, DEFAULTS, getPrefs, setPrefs, effectiveTheme } from '../core/prefs.js';
import { FONTS, fontStatus, loadFont, statusText, applyFont, weightsText } from '../core/fonts.js';
import { confetti } from './effects.js';
import { BUCKETS as DEFAULT_BUCKETS } from '../data/defaults.js';
import { mountSecurity } from './lock.js';
import { mountInstall } from './install.js';
import { VERSION } from '../core/changelog.js';
import { mountModels, mountTags, mountTrash, mountData } from './manage.js';
import { mountReview } from './review.js';
import { mountReminders } from './reminders.js';

const SECTIONS = [
  { id: 'review',  icon: 'chart',    title: 'مرور ماه و سال',  sub: 'گزارش، گرمانگار خرج، بستن ماه', mount: el => mountReview(el) },
  { id: 'reminders', icon: 'bell',   title: 'یادآورها',        sub: 'قسط، واریزی، پشتیبان، آخر ماه', mount: mountReminders },
  { id: 'look',    icon: 'palette',  title: 'ظاهر و تم',       sub: 'حالت روز/شب، تم رنگی، رنگ اصلی' },
  { id: 'buckets', icon: 'grid',     title: 'صندوق‌ها',        sub: 'رنگ و آیکون هر صندوق' },
  { id: 'text',    icon: 'book',     title: 'متن و فونت',      sub: 'فونت، اندازه‌ی نوشته، شدت شیشه' },
  { id: 'fx',      icon: 'sparkle',  title: 'افکت‌ها',         sub: 'انیمیشن‌ها و حرکت‌ها' },
  { id: 'models',  icon: 'chart',    title: 'مدل‌های درصدی',   sub: 'درصد تقسیم هر واریزی', mount: mountModels },
  { id: 'tags',    icon: 'tag',      title: 'هشتگ‌ها',         sub: 'رنگ، تغییر نام، ادغام', mount: mountTags },
  { id: 'security', icon: 'shield', title: 'امنیت و قفل',   sub: 'PIN ۴ رقمی و قفل خودکار', mount: mountSecurity },
  { id: 'data',    icon: 'download', title: 'داده و پشتیبان',  sub: 'پشتیبان‌گیری، بازیابی، سلامت داده', mount: mountData },
  { id: 'trash',   icon: 'close',    title: 'سطل بازیافت',     sub: 'تراکنش‌های حذف‌شده (۳۰ روز)', mount: mountTrash },
  { id: 'region',  icon: 'calendar', title: 'تاریخ و واحد پول', sub: 'شمسی/میلادی، تومان/ریال' },
  { id: 'install', icon: 'download', title: 'نصب و به‌روزرسانی', sub: 'نصب روی دستگاه، نسخه، تغییرات', mount: mountInstall },
  { id: 'about',   icon: 'info',     title: 'درباره',          sub: 'نسخه، سازنده، توضیحات' },
];

const FX = [
  ['aurora', 'پس‌زمینه‌ی متحرک', 'لکه‌های رنگی نرم پشت صفحه'], ['spot', 'نور دنبال‌کننده‌ی اشاره‌گر', 'روی کارت‌ها (فقط ماوس)'],
  ['tilt', 'کج‌شدن سه‌بعدی کارت‌ها', 'با حرکت ماوس'], ['count', 'شمارش تدریجی اعداد', ''],
  ['ripple', 'موج لمس روی دکمه‌ها', ''], ['transitions', 'انیمیشن جابه‌جایی صفحه‌ها', ''],
  ['confetti', 'کانفتی جشن', ''], ['haptics', 'لرزش لمسی', 'فقط موبایل‌های پشتیبان'],
];

let current = null; // بخش باز (null = لیست در موبایل)
const isWide = () => matchMedia('(min-width:1024px)').matches;

const seg = (name, opts, val) => `<div class="seg" role="radiogroup" data-seg="${name}">${opts.map(([v, l, ic]) =>
  `<button role="radio" aria-checked="${val === v}" class="${val === v ? 'on' : ''}" data-v="${v}">${ic ? icon(ic, 18) : ''}<span>${l}</span></button>`).join('')}</div>`;
const resetBtn = id => `<button class="btn ghost reset" data-reset="${id}">${icon('history', 16)} بازنشانی این بخش</button>`;

function themeGrid(list, activeId, key) {
  return `<div class="theme-grid" data-key="${key}">${list.map(t => `<button class="theme-card ${activeId === t.id ? 'on' : ''}" data-theme-id="${t.id}" aria-pressed="${activeId === t.id}">
    <span class="sw" style="background:linear-gradient(135deg,${t.sw[0]},${t.sw[1]})"></span><span>${t.name}</span>${activeId === t.id ? `<i class="tick">${icon('check', 12)}</i>` : ''}</button>`).join('')}</div>`;
}

const VIEWS = {
  look(p) {
    const dark = THEMES.filter(t => t.dark), light = THEMES.filter(t => !t.dark);
    const eff = effectiveTheme(p);
    const preview = `<div class="mini glass"><div class="mini-top"><span class="chip">${icon('calendar', 12)} آبان 1405</span><span class="logo sm">${icon('coins', 16)}</span></div>
      <div class="dim" style="font-size:.75rem">مجموع دارایی</div><div class="num mini-amt">135,359,396</div>
      <div class="mini-bar"><i style="width:62%"></i></div><div class="mini-btns"><span class="btn primary">واریزی جدید</span><span class="btn">ثبت خرج</span></div></div>`;
    let pickers;
    if (p.mode === 'dark') pickers = `<h3 class="sub">تم شب</h3>${themeGrid(dark, p.theme, 'theme')}`;
    else if (p.mode === 'light') pickers = `<h3 class="sub">تم روز</h3>${themeGrid(light, p.lightTheme, 'lightTheme')}`;
    else pickers = `<p class="note">در حالت خودکار، تم بر اساس تنظیم دستگاه (روز/شب) تغییر می‌کند.</p>
      <h3 class="sub">تم شب</h3>${themeGrid(dark, p.theme, 'theme')}<h3 class="sub">تم روز</h3>${themeGrid(light, p.lightTheme, 'lightTheme')}`;
    return `${preview}
      <h3 class="sub">حالت</h3>${seg('mode', [['dark', 'شب', 'moon'], ['light', 'روز', 'sun'], ['auto', 'خودکار', 'settings']], p.mode)}
      ${pickers}
      <h3 class="sub">رنگ اصلی دلخواه</h3>
      <div class="accent-row"><label class="accent-pick"><input type="color" id="accent" value="${p.accent || '#5b8cff'}" aria-label="رنگ اصلی"><span class="num">${p.accent || 'رنگ تم'}</span></label>
      ${p.accent ? '<button class="btn" id="accentReset">رنگ تم</button>' : ''}</div>${resetBtn('look')}`;
  },

  buckets(p) {
    return `<p class="note">برای ویرایش رنگ و آیکون، روی هر صندوق بزن.</p><div class="acc">${DEFAULT_BUCKETS.map(b => {
      const o = { ...b, ...(p.buckets[b.id] || {}) };
      return `<details class="b-edit glass glass-flat" data-bid="${b.id}"><summary><span class="bubble" style="--bc:${o.color}">${icon(o.icon, 20)}</span><b>${o.name}</b><span class="chev">${icon('chevron', 16)}</span></summary>
        <div class="b-body"><div class="sub">رنگ</div><div class="swatches">${PALETTE.map(c => `<button class="sw-dot ${o.color === c ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="رنگ ${c}"></button>`).join('')}</div>
        <div class="sub">آیکون</div><div class="icon-pick">${PICKABLE.map(n => `<button class="ip ${o.icon === n ? 'on' : ''}" data-icon="${n}" aria-label="${n}">${icon(n, 18)}</button>`).join('')}</div></div></details>`;
    }).join('')}</div>${resetBtn('buckets')}`;
  },

  text(p) {
    const rows = FONTS.map(f => `<button class="font-row ${p.font === f.id ? 'on' : ''}" data-font="${f.id}" role="radio" aria-checked="${p.font === f.id}" ${f.family ? `style="font-family:'${f.family}',var(--font-ui)"` : ''}>
      <span class="fname">${f.name}</span><span class="fsample">مدیریت مالی 1234567890 <b>پررنگ</b></span>
      <small class="fstat" data-fs="${f.id}">${f.system ? 'بدون فایل اضافه' : weightsText(f)}${fontStatus[f.id] === 'missing' ? ' · ' + statusText('missing') : ''}</small></button>`).join('');
    return `<div class="font-list" role="radiogroup">${rows}</div>
      <label class="slider"><span>اندازه‌ی نوشته <b class="num" id="fsv">${p.fontSize}%</b></span><input type="range" id="fs" min="80" max="150" step="5" value="${p.fontSize}"><small class="faint ticks"><span>کوچک</span><span>پیش‌فرض</span><span>بزرگ</span></small></label>
      <label class="slider"><span>شدت شیشه‌ای <b class="num" id="gv">${p.glass}%</b></span><input type="range" id="gl" min="0" max="100" step="5" value="${p.glass}"></label>${resetBtn('text')}`;
  },

  fx(p) {
    const all = Object.values(p.fx).every(Boolean);
    return `<div class="row-actions"><button class="btn" id="fxAll">${all ? 'خاموش‌کردن همه' : 'روشن‌کردن همه'}</button><button class="btn" id="confTest">${icon('sparkle', 18)} آزمایش کانفتی</button></div>
      ${FX.map(([k, l, d]) => `<label class="switch-row"><span>${l}${d ? `<small class="faint">${d}</small>` : ''}</span><input type="checkbox" role="switch" data-fx="${k}" ${p.fx[k] ? 'checked' : ''}><i class="switch"></i></label>`).join('')}
      <label class="switch-row"><span>نادیده‌گرفتن «کاهش حرکت» سیستم‌عامل<small class="faint">اگر در دستگاهت کاهش حرکت روشن است ولی انیمیشن می‌خواهی</small></span><input type="checkbox" role="switch" id="motion" ${p.motionOverride ? 'checked' : ''}><i class="switch"></i></label>${resetBtn('fx')}`;
  },

  region(p) {
    return `<h3 class="sub">تقویم</h3>${seg('calendar', [['jalali', 'شمسی'], ['gregorian', 'میلادی']], p.calendar)}
      <h3 class="sub">واحد پول</h3>${seg('unit', [['toman', 'تومان'], ['rial', 'ریال']], p.unit)}
      <p class="note">همه‌ی مبالغ در برنامه به تومان ذخیره می‌شوند؛ ریال فقط شیوه‌ی نمایش است و داده‌ای تغییر نمی‌کند.</p>`;
  },

  about() {
    return `<div class="about"><span class="logo lg">${icon('coins', 34)}</span><h2>مدیریت مالی</h2><p class="dim">نسخه‌ی <span class="num">${VERSION}</span> · سازنده: P4RS4</p></div>
      <p class="note">این برنامه ابزار ثبت و تقسیم درآمد است و توصیه‌ی مالی یا سرمایه‌گذاری نیست. تصمیم‌های مالی با خود شماست.</p>
      <p class="note">اگر مشکلی دیدی یا پیشنهادی داری، از صفحه‌ی Issues در گیت‌هاب گزارش بده.</p>`;
  },
};

export function renderSettings(root) {
  const p = getPrefs();
  const wide = isWide();
  if (wide && !current) current = 'look';
  const sec = SECTIONS.find(s => s.id === current);

  const list = `<nav class="set-list glass" aria-label="دسته‌های تنظیمات">${SECTIONS.map(s => `<button class="set-item ${s.id === current ? 'on' : ''}" data-sec="${s.id}">
    <span class="bubble">${icon(s.icon, 20)}</span><span class="si-t"><b>${s.title}</b><small class="faint">${s.sub}</small></span><span class="chev">${icon('chevron', 16)}</span></button>`).join('')}</nav>`;
  const detail = sec ? `<section class="set-detail glass pad" aria-labelledby="sd-t">
    <header class="sd-head">${wide ? '' : `<button class="icon-btn" id="back" aria-label="بازگشت">${icon('chevron', 20, 'style="transform:scaleX(-1)"')}</button>`}<h2 id="sd-t">${sec.title}</h2></header>${sec.mount ? '<div id="mount"></div>' : VIEWS[sec.id](p)}</section>` : '';

  root.innerHTML = `<div class="settings2 ${wide ? 'wide' : ''}">${(wide || !sec) ? list : ''}${detail}</div>`;
  if (sec?.mount) sec.mount(root.querySelector('#mount'), () => renderSettings(root));
  bind(root);
}

function bind(root) {
  const re = () => renderSettings(root);
  const $ = s => root.querySelector(s), $$ = s => root.querySelectorAll(s);
  $$('[data-sec]').forEach(b => b.onclick = () => { current = b.dataset.sec; re(); scrollTo(0, 0); });
  $('#back')?.addEventListener('click', () => { current = null; re(); });

  $$('.theme-grid').forEach(g => g.querySelectorAll('[data-theme-id]').forEach(b => b.onclick = () => { setPrefs({ [g.dataset.key]: b.dataset.themeId }); re(); }));
  $$('[data-seg]').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => { setPrefs({ [s.dataset.seg]: b.dataset.v }); re(); }));
  $('#accent')?.addEventListener('input', e => setPrefs({ accent: e.target.value }));
  $('#accent')?.addEventListener('change', re);
  $('#accentReset')?.addEventListener('click', () => { setPrefs({ accent: '' }); re(); });

  $$('[data-font]').forEach(b => b.onclick = async () => {
    setPrefs({ font: b.dataset.font });
    $$('.font-row').forEach(r => { r.classList.toggle('on', r === b); r.setAttribute('aria-checked', r === b); });
    const st = await applyFont(b.dataset.font);
    if (st === 'missing') $(`[data-fs="${b.dataset.font}"]`).append(' · ' + statusText('missing'));
  });
  $('#fs')?.addEventListener('input', e => { $('#fsv').textContent = e.target.value + '%'; setPrefs({ fontSize: +e.target.value }); });
  $('#gl')?.addEventListener('input', e => { $('#gv').textContent = e.target.value + '%'; setPrefs({ glass: +e.target.value }); });

  $$('[data-fx]').forEach(i => i.onchange = () => { setPrefs({ fx: { [i.dataset.fx]: i.checked } }); re(); });
  $('#motion')?.addEventListener('change', e => setPrefs({ motionOverride: e.target.checked }));
  $('#fxAll')?.addEventListener('click', () => { const all = Object.values(getPrefs().fx).every(Boolean); setPrefs({ fx: Object.fromEntries(Object.keys(getPrefs().fx).map(k => [k, !all])) }); re(); });
  $('#confTest')?.addEventListener('click', e => confetti({ x: e.clientX, y: e.clientY }));

  $$('.b-edit').forEach(card => {
    const id = card.dataset.bid;
    const upd = patch => { const cur = getPrefs().buckets; setPrefs({ buckets: { ...cur, [id]: { ...(cur[id] || {}), ...patch } } }); card.open = true; openId = id; re(); };
    card.querySelectorAll('[data-color]').forEach(b => b.onclick = () => upd({ color: b.dataset.color }));
    card.querySelectorAll('[data-icon]').forEach(b => b.onclick = () => upd({ icon: b.dataset.icon }));
    card.addEventListener('toggle', () => { if (card.open) { $$('.b-edit').forEach(o => { if (o !== card) o.open = false; }); openId = id; } });
    if (openId === id) card.open = true;
  });

  $$('[data-reset]').forEach(b => b.onclick = () => {
    const k = b.dataset.reset, d = DEFAULTS;
    const patch = { look: { theme: d.theme, lightTheme: d.lightTheme, mode: d.mode, accent: '' }, buckets: { buckets: {} },
      text: { font: d.font, fontSize: d.fontSize, glass: d.glass }, fx: { fx: d.fx, motionOverride: false } }[k];
    setPrefs(patch); if (k === 'text') applyFont(d.font); re();
  });
  FONTS.filter(f => !f.system).forEach(f => loadFont(f.id).then(() => {
    const el = $(`[data-fs="${f.id}"]`); if (el && fontStatus[f.id] === 'missing' && !el.textContent.includes('پیدا نشد')) el.append(' · ' + statusText('missing'));
  }));
}
let openId = null;
export const resetSettingsNav = () => { current = null; };
