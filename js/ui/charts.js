// نمودارهای SVG سفارشی — بدون کتابخانه
import { compact } from '../core/format.js';

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

/** منحنی نرم از نقاط (Catmull-Rom → Bezier) */
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function sparkline(values, color, w = 96, h = 32) {
  const id = 'sp' + ++uid;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
  const line = smooth(pts);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${line}L${w},${h}L0,${h}Z" fill="url(#${id})"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

/** نمودار دونات؛ items: [{label,value,color}] */
export function donut(items, { size = 200, thick = 22, center = '' } = {}) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thick) / 2, c = size / 2, circ = 2 * Math.PI * r, gap = 3;
  let off = 0;
  const arcs = items.map(it => {
    const len = Math.max(0, (it.value / total) * circ - gap);
    const s = `<circle class="arc" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${thick}" stroke-linecap="round"
      stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})"
      data-label="${it.label}" data-value="${it.value}" tabindex="0"/>`;
    off += (it.value / total) * circ;
    return s;
  }).join('');
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="سهم هر صندوق">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${thick}"/>${arcs}
    <foreignObject x="${thick + 8}" y="${thick + 8}" width="${size - 2 * thick - 16}" height="${size - 2 * thick - 16}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="donut-center">${center}</div></foreignObject></svg>`;
}

/** نمودار خطی/ناحیه‌ای با برچسب محور */
export function lineChart(values, labels, { color = 'var(--a1)', w = 560, h = 220 } = {}) {
  const id = 'lc' + ++uid, padL = 8, padR = 8, padT = 14, padB = 26;
  const min = Math.min(...values) * 0.9, max = Math.max(...values), span = max - min || 1;
  const x = i => padL + (i / (values.length - 1)) * (w - padL - padR);
  const y = v => padT + (1 - (v - min) / span) * (h - padT - padB);
  const pts = values.map((v, i) => [x(i), y(v)]);
  const line = smooth(pts);
  const grid = [0, .5, 1].map(k => { const yy = padT + k * (h - padT - padB); return `<line x1="${padL}" x2="${w - padR}" y1="${yy}" y2="${yy}" stroke="var(--track)" stroke-dasharray="3 5"/>`; }).join('');
  const lab = labels.map((l, i) => (i % 2 === (labels.length - 1) % 2) ? `<text x="${x(i)}" y="${h - 6}" text-anchor="middle" class="axis">${l}</text>` : '').join('');
  const dots = pts.map((p, i) => `<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="9" fill="transparent" data-i="${i}" data-label="${labels[i]}" data-value="${values[i]}"/>`).join('');
  const last = pts[pts.length - 1];
  return `<svg class="line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="روند دارایی">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".4"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${line}L${x(values.length - 1)},${h - padB}L${x(0)},${h - padB}Z" fill="url(#${id})"/>
    <path class="stroke" d="${line}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" pathLength="1"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="${color}"/><circle cx="${last[0]}" cy="${last[1]}" r="9" fill="${color}" opacity=".25"/>
    ${lab}${dots}</svg>`;
}

export function barChart(values, labels, { color = 'var(--a1)', w = 560, h = 200 } = {}) {
  const padB = 26, padT = 10, max = Math.max(...values) || 1, n = values.length;
  const bw = (w / n) * 0.56;
  const bars = values.map((v, i) => {
    const bh = (v / max) * (h - padT - padB), cx = (i + 0.5) * (w / n);
    return `<rect class="bar" x="${cx - bw / 2}" y="${h - padB - bh}" width="${bw}" height="${bh}" rx="${Math.min(8, bw / 2)}" fill="${color}" opacity="${i === n - 1 ? 1 : .55}"
      data-label="${labels[i]}" data-value="${v}" style="--d:${i * 40}ms"/>
      <text x="${cx}" y="${h - 7}" text-anchor="middle" class="axis">${labels[i]}</text>`;
  }).join('');
  return `<svg class="bar-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="واریزی ماهانه">${bars}</svg>`;
}

/** حلقه‌ی پیشرفت */
export function ring(frac, color, size = 56, thick = 6, label = '') {
  const r = (size - thick) / 2, c = size / 2, circ = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${thick}"/>
    <circle class="ring-v" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${thick}" stroke-linecap="round"
      stroke-dasharray="${f * circ} ${circ}" transform="rotate(-90 ${c} ${c})"/>
    <text x="${c}" y="${c + 4}" text-anchor="middle" class="ring-t">${label}</text></svg>`;
}

/** tooltip مشترک برای عناصر دارای data-label/data-value */
export function attachTooltips(root, fmt) {
  let tip = document.querySelector('.chart-tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip glass'; document.body.appendChild(tip); }
  const show = (el, e) => {
    tip.innerHTML = `<b>${el.dataset.label}</b><span class="num">${fmt(+el.dataset.value)}</span>`;
    tip.classList.add('on');
    const rect = el.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX : rect.left + rect.width / 2;
    tip.style.left = Math.min(innerWidth - 10, Math.max(10, x)) + 'px';
    tip.style.top = (rect.top - 8 + scrollY) + 'px';
  };
  const hide = () => tip.classList.remove('on');
  root.querySelectorAll('[data-value]').forEach(el => {
    el.addEventListener('pointerenter', e => show(el, e));
    el.addEventListener('pointermove', e => show(el, e));
    el.addEventListener('pointerleave', hide);
    el.addEventListener('focus', () => show(el));
    el.addEventListener('blur', hide);
  });
}
export { compact };
