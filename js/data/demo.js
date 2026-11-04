// داده‌ی نمونه برای پیش‌نمایش (ساخت قطعی با seed تا هر بار یکسان باشد)
import { allocate } from '../core/format.js';

export const DEFAULT_BUCKETS = [
  { id: 'needs',  name: 'نیاز ضروری',      icon: 'home',    color: '#38bdf8', pct: 45, spendable: true },
  { id: 'fun',    name: 'تفریح',            icon: 'sparkle', color: '#f472b6', pct: 10, spendable: true },
  { id: 'learn',  name: 'یادگیری',          icon: 'book',    color: '#a78bfa', pct: 10, spendable: true, goal: 40_000_000 },
  { id: 'save',   name: 'پس‌انداز',         icon: 'coins',   color: '#fbbf24', pct: 20, goal: 400_000_000 },
  { id: 'retire', name: 'پس‌انداز ۶۰ سالگی', icon: 'lock',    color: '#34d399', pct: 15, locked: true },
];

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function buildDemo(now = new Date('2026-10-29T12:00:00')) {
  const r = rng(42);
  const buckets = DEFAULT_BUCKETS.map(b => ({ ...b, balance: 0, series: [], spent: 0 }));
  const months = [];
  const monthlyIncome = [];
  let income = 22_000_000;
  const txs = [];
  const assetTrend = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 5);
    income = Math.round((income * (1 + (r() * 0.05 + 0.005))) / 100000) * 100000;
    const parts = allocate(income, buckets.map(b => b.pct));
    buckets.forEach((b, k) => {
      b.balance += parts[k];
      if (b.spendable) {
        const spend = Math.round(parts[k] * (0.78 + r() * 0.2));
        b.balance -= spend;
        if (i === 0) b.spent = spend;
      }
      b.series.push(b.balance);
    });
    months.push(d);
    monthlyIncome.push(income);
    assetTrend.push(buckets.reduce((a, b) => a + b.balance, 0));
    if (i === 0) {
      buckets.forEach((b, k) => { b.share = parts[k]; });
    }
  }
  const total = buckets.reduce((a, b) => a + b.balance, 0);

  const day = n => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  txs.push(
    { id: 1, type: 'deposit',  title: 'حقوق مهر',          amount: monthlyIncome[11], date: day(24), tags: ['حقوق'] },
    { id: 2, type: 'expense',  title: 'خرید هفتگی',        amount: 1_850_000, date: day(3), bucket: 'needs', tags: ['خوراکی'] },
    { id: 3, type: 'expense',  title: 'سینما با دوستان',   amount: 420_000, date: day(5), bucket: 'fun', tags: ['تفریح', 'دوستان'] },
    { id: 4, type: 'transfer', title: 'پس‌انداز به یادگیری', amount: 2_000_000, date: day(8), from: 'save', to: 'learn', tags: [] },
    { id: 5, type: 'expense',  title: 'دوره‌ی آنلاین',     amount: 1_200_000, date: day(12), bucket: 'learn', tags: ['دوره'] },
  );

  return {
    buckets, months, monthlyIncome, assetTrend, total, txs,
    birthYear: 1990,
    loan: { due: day(-6), amount: 1_250_000, remaining: 6_250_000 },
  };
}
