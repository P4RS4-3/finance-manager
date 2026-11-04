// ماه‌ها بر اساس تقویم انتخابی (شمسی/میلادی): کلید، جابه‌جایی، بازه و برچسب
import { toJalali, toGregorian, jalaliMonthLength, JALALI_MONTHS, GREG_MONTHS_FA } from './jalali.js';
import { monthKey } from './ledger.js';

const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export const currentKey = (todayISO, cal) => monthKey(todayISO, cal);

export function shiftKey(key, delta, cal) {
  let [y, m] = key.split('-').map(Number);
  const n = y * 12 + (m - 1) + delta;
  y = Math.floor(n / 12); m = (n % 12) + 1;
  return `${y}-${pad(m)}`;
}

export function monthRange(key, cal) {
  const [y, m] = key.split('-').map(Number);
  if (cal === 'jalali') {
    const a = toGregorian(y, m, 1), b = toGregorian(y, m, jalaliMonthLength(y, m));
    return { from: iso(a.gy, a.gm, a.gd), to: iso(b.gy, b.gm, b.gd) };
  }
  const last = new Date(y, m, 0).getDate();
  return { from: iso(y, m, 1), to: iso(y, m, last) };
}

export const monthName = (key, cal) => {
  const [y, m] = key.split('-').map(Number);
  return `${(cal === 'jalali' ? JALALI_MONTHS : GREG_MONTHS_FA)[m - 1]} ${y}`;
};
export const monthShort = (key, cal) => (cal === 'jalali' ? JALALI_MONTHS : GREG_MONTHS_FA)[Number(key.split('-')[1]) - 1];

/** تاریخ ISO را به متن نمایشی تبدیل می‌کند */
export function dateText(isoStr, cal, short = false) {
  const [y, m, d] = isoStr.split('-').map(Number);
  if (cal === 'jalali') { const j = toJalali(y, m, d); return short ? `${j.jy}/${pad(j.jm)}/${pad(j.jd)}` : `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`; }
  return short ? `${y}-${pad(m)}-${pad(d)}` : `${d} ${GREG_MONTHS_FA[m - 1]} ${y}`;
}

/** ISO ← اجزای تاریخ در تقویم انتخابی */
export function toISO(y, m, d, cal) {
  if (cal === 'jalali') { const g = toGregorian(y, m, d); return iso(g.gy, g.gm, g.gd); }
  return iso(y, m, d);
}
export function fromISO(isoStr, cal) {
  const [y, m, d] = isoStr.split('-').map(Number);
  if (cal === 'jalali') { const j = toJalali(y, m, d); return { y: j.jy, m: j.jm, d: j.jd }; }
  return { y, m, d };
}
export const monthLength = (y, m, cal) => (cal === 'jalali' ? jalaliMonthLength(y, m) : new Date(y, m, 0).getDate());
