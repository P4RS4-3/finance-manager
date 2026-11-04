import { getPrefs } from '../core/prefs.js';

const on = k => getPrefs().fx[k];

/** نور دنبال‌کننده‌ی اشاره‌گر + کج‌شدن سه‌بعدی */
export function initPointerFx() {
  document.addEventListener('pointermove', e => {
    const el = e.target.closest?.('.glass');
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    if (on('tilt') && el.classList.contains('tilt')) {
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty('--ry', (px * -7).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (py * 7).toFixed(2) + 'deg');
    }
  }, { passive: true });
  document.addEventListener('pointerout', e => {
    const el = e.target.closest?.('.glass.tilt');
    if (el && !el.contains(e.relatedTarget)) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
  });
  // ripple
  document.addEventListener('pointerdown', e => {
    if (!on('ripple')) return;
    const b = e.target.closest?.('.btn,.icon-btn,.tab,.nav-item,.theme-card,.font-row');
    if (!b) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2;
    const i = document.createElement('span');
    i.className = 'ripple';
    i.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.style.overflow = 'hidden';
    b.appendChild(i);
    setTimeout(() => i.remove(), 650);
  });
}

/** شمارش تدریجی عدد */
export function countUp(el, to, fmt, ms = 1100) {
  if (!on('count')) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4);
    el.textContent = fmt(Math.round(to * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function haptic(ms = 12) { if (on('haptics') && navigator.vibrate) navigator.vibrate(ms); }

/** کانفتی روی canvas */
export function confetti(origin) {
  if (!on('confetti')) return;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999';
  cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
  document.body.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
  const cs = getComputedStyle(document.documentElement);
  const colors = ['--a1', '--a2', '--a3'].map(v => cs.getPropertyValue(v).trim()).concat(['#fbbf24', '#f472b6', '#34d399']);
  const ox = origin?.x ?? innerWidth / 2, oy = origin?.y ?? innerHeight * 0.4;
  const ps = Array.from({ length: 120 }, () => ({
    x: ox, y: oy, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 3,
    s: 5 + Math.random() * 6, c: colors[(Math.random() * colors.length) | 0], r: Math.random() * 6, vr: (Math.random() - .5) * .4,
  }));
  let t0 = performance.now();
  (function frame(t) {
    const dt = t - t0; g.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = Math.max(0, 1 - dt / 2600);
      g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
    if (dt < 2600) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

/** تغییر صفحه با انیمیشن (View Transitions در صورت پشتیبانی) */
export function transition(fn) {
  if (on('transitions') && document.startViewTransition && !matchMedia('(prefers-reduced-motion:reduce)').matches) document.startViewTransition(fn);
  else fn();
}
