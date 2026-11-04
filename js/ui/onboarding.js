// ویزارد اولین اجرا: همه‌ی مراحل اختیاری‌اند و بعداً از تنظیمات قابل تغییرند
import { icon } from './icons.js';
import { amountField, dateField } from './fields.js';
import { createPinFlow } from './lock.js';
import { toast } from './shell.js';
import { THEMES, getPrefs, setPrefs } from '../core/prefs.js';
import { money, unitLabel } from '../core/format.js';
import { isoDate, uid } from '../core/ledger.js';
import * as store from '../data/store.js';

export function startOnboarding() {
  const s = store.getState(), p = getPrefs();
  const wrap = document.createElement('div'); wrap.className = 'onboard'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'شروع');
  document.body.append(wrap); document.documentElement.classList.add('modal-open');
  let step = 0, birth = null, pinSet = false; const opening = {};
  const total = 6;

  const dots = () => `<div class="steps" aria-label="مرحله ${step + 1} از ${total}">${Array.from({ length: total }, (_, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('')}</div>`;
  const nav = (next = 'ادامه', skip = false) => `<div class="c-actions">${step > 0 ? '<button class="btn" data-back>قبلی</button>' : ''}${skip ? '<button class="btn" data-skip>رد کردن</button>' : ''}<button class="btn primary" data-next>${next}</button></div>`;

  function draw() {
    const cur = getPrefs();
    let body = '';
    if (step === 0) body = `<span class="logo lg">${icon('coins', 34)}</span><h1>خوش آمدی به مدیریت مالی</h1>
      <p class="dim">هر وقت پولی گرفتی، مبلغش را وارد کن. برنامه آن را بر اساس درصدهای تو بین صندوق‌ها تقسیم می‌کند و می‌گوید هر صندوق برای چیست. همه‌چیز فقط روی همین دستگاه می‌ماند و آفلاین هم کار می‌کند.</p>
      <p class="note">چند سؤال کوتاه می‌پرسم؛ همه‌شان اختیاری‌اند.</p>${nav('شروع')}<button class="btn ghost" data-demo>اول با داده‌ی نمونه ببینم</button>`;
    if (step === 1) body = `<h2>ظاهر برنامه</h2><div class="seg" data-seg>${[['dark', 'شب'], ['light', 'روز'], ['auto', 'خودکار']].map(([v, l]) => `<button class="${cur.mode === v ? 'on' : ''}" data-mode="${v}">${l}</button>`).join('')}</div>
      <div class="theme-grid">${THEMES.filter(t => (cur.mode === 'light' ? !t.dark : t.dark)).map(t => `<button class="theme-card ${(cur.mode === 'light' ? cur.lightTheme : cur.theme) === t.id ? 'on' : ''}" data-theme-id="${t.id}"><span class="sw" style="background:linear-gradient(135deg,${t.sw[0]},${t.sw[1]})"></span><span>${t.name}</span></button>`).join('')}</div>
      <p class="note">هر وقت خواستی از تنظیمات عوضش کن؛ ۲۴ تم داری.</p>${nav()}`;
    if (step === 2) body = `<h2>تاریخ تولد <small class="faint">(اختیاری)</small></h2><p class="dim">فقط برای اینکه نشان بدهم تا آزادشدن صندوق ۶۰ سالگی چند سال مانده.</p><div id="bd"></div>${nav('ادامه', true)}`;
    if (step === 3) body = `<h2>الان در هر صندوق چقدر داری؟ <small class="faint">(اختیاری)</small></h2><p class="dim">اگر از قبل پس‌اندازی داری، اینجا وارد کن. خالی بگذاری صفر حساب می‌شود.</p><div class="form" id="ob">${''}</div>${nav('ادامه', true)}`;
    if (step === 4) { const m = s.models[0]; body = `<h2>درصد تقسیم</h2><p class="dim">مدل پیش‌فرض «${m.name}» است. درصدها را بعداً در «تنظیمات ← مدل‌های درصدی» عوض کن یا مدل خودت را بساز.</p>
      <ul class="split big">${s.buckets.map(b => `<li style="--bc:${b.color}"><span class="bubble sm">${icon(b.icon, 16)}</span><div class="sp-main"><div class="sp-top"><b>${b.name}</b><span class="num faint">${m.split[b.id]}%</span></div><div class="pbar"><i style="width:${m.split[b.id]}%;background:${b.color}"></i></div><small class="faint">${b.desc}</small></div></li>`).join('')}</ul>${nav()}`; }
    if (step === 5) body = `<h2>قفل PIN <small class="faint">(اختیاری)</small></h2><p class="dim">اگر می‌خواهی کسی با برداشتن گوشی/کامپیوترت مبالغ را نبیند، یک PIN ۴ رقمی بگذار.</p>
      <div class="c-actions">${pinSet ? `<span class="ok-line">${icon('check', 16)} PIN فعال شد</span>` : '<button class="btn" data-pin>تنظیم PIN</button>'}</div>${nav('پایان و شروع')}`;
    wrap.innerHTML = `<div class="ob-card glass">${dots()}<div class="ob-body">${body}</div></div><div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>`;
    bind();
  }

  function bind() {
    if (step === 2) { const f = dateField({ value: isoDate(new Date(new Date().getFullYear() - 30, 5, 15)), calendar: getPrefs().calendar, label: 'تاریخ تولد', back: 90, forward: 0 }); wrap.querySelector('#bd').append(f.el); wrap._bd = f; }
    if (step === 3) {
      const box = wrap.querySelector('#ob');
      s.buckets.forEach(b => { const f = amountField({ unit: getPrefs().unit, label: b.name, value: opening[b.id] || '', onInput: v => { opening[b.id] = v || 0; } }); box.append(f.el); });
    }
    wrap.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { setPrefs({ mode: b.dataset.mode }); draw(); });
    wrap.querySelectorAll('[data-theme-id]').forEach(b => b.onclick = () => { const t = THEMES.find(x => x.id === b.dataset.themeId); setPrefs(t.dark ? { theme: t.id } : { lightTheme: t.id }); draw(); });
    wrap.querySelector('[data-pin]')?.addEventListener('click', async () => { if (await createPinFlow()) { pinSet = true; draw(); } });
    wrap.querySelector('[data-demo]')?.addEventListener('click', async () => { await store.enterDemo(); finish(true); });
    wrap.querySelector('[data-back]')?.addEventListener('click', () => { step--; draw(); });
    wrap.querySelector('[data-skip]')?.addEventListener('click', () => { if (step === 2) birth = null; if (step === 3) Object.keys(opening).forEach(k => delete opening[k]); step++; draw(); });
    wrap.querySelector('[data-next]')?.addEventListener('click', () => {
      if (step === 2 && wrap._bd) { const [y, m, d] = wrap._bd.value().split('-').map(Number); birth = { y, m, d }; }
      if (step === total - 1) return finish(false);
      step++; draw();
    });
  }

  function finish(demo) {
    if (!demo) store.commit(st => {
      st.settings.onboarded = true; if (birth) st.settings.birthDate = birth;
      const sp = {}; let sum = 0; for (const b of st.buckets) { const v = opening[b.id] || 0; if (v > 0) { sp[b.id] = v; sum += v; } }
      if (sum > 0) st.txs.push({ id: uid(), type: 'opening', date: isoDate(), createdAt: new Date().toISOString(), amount: sum, split: sp, title: 'موجودی اولیه', note: '', tags: [] });
    }, 'onboarding', '');
    wrap.classList.add('out'); setTimeout(() => wrap.remove(), 350); document.documentElement.classList.remove('modal-open');
    toast(demo ? 'حالت نمایشی فعال شد' : 'آماده‌ای! اولین واریزی‌ات را ثبت کن');
  }
  draw();
}
