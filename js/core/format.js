import { toJalali, JALALI_MONTHS, GREG_MONTHS_FA } from './jalali.js';

export const fmtInt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** مبلغ بر اساس واحد انتخابی (toman | rial) */
export function money(n, unit = 'toman') {
  const v = unit === 'rial' ? n * 10 : n;
  return fmtInt(v);
}
export const unitLabel = unit => (unit === 'rial' ? 'ریال' : 'تومان');

/** فشرده: 1.2M / 350K */
export function compact(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(Math.round(n));
}

export const pct = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace(/\.0$/, '') + '%';

export function formatDate(date, calendar = 'jalali', opts = {}) {
  const d = date instanceof Date ? date : new Date(date);
  if (calendar === 'jalali') {
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return opts.short ? `${j.jy}/${j.jm}/${j.jd}` : `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`;
  }
  return opts.short ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    : `${d.getDate()} ${GREG_MONTHS_FA[d.getMonth()]} ${d.getFullYear()}`;
}
export function monthName(date, calendar = 'jalali') {
  const d = date instanceof Date ? date : new Date(date);
  if (calendar === 'jalali') {
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${JALALI_MONTHS[j.jm - 1]} ${j.jy}`;
  }
  return `${GREG_MONTHS_FA[d.getMonth()]} ${d.getFullYear()}`;
}
export function shortMonth(date, calendar = 'jalali') {
  const d = date instanceof Date ? date : new Date(date);
  if (calendar === 'jalali') return JALALI_MONTHS[toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()).jm - 1];
  return GREG_MONTHS_FA[d.getMonth()];
}

/** تقسیم مبلغ با روش بیشترین باقی‌مانده؛ جمع همیشه دقیقاً برابر total */
export function allocate(total, percents) {
  const sum = percents.reduce((a, b) => a + b, 0);
  const raw = percents.map(p => (total * p) / sum);
  const base = raw.map(Math.floor);
  let left = total - base.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) base[order[k][1]]++;
  return base;
}
