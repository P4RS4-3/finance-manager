// مرور ماه و سال: آمار، هشتگ‌ها، گرمانگار هزینه‌ی روزانه — توابع خالص
import { monthKey, parseISO, isoDate } from './ledger.js';
import { monthRange, shiftKey, monthShort, currentKey } from './months.js';
import { monthStats } from './ledger.js';

const inRange = (t, r) => t.date >= r.from && t.date <= r.to;

export function monthSums(state, key, cal) {
  const r = monthRange(key, cal); let income = 0, expense = 0, count = 0;
  for (const t of state.txs) { if (!inRange(t, r)) continue; count++; if (t.type === 'deposit') income += t.amount; else if (t.type === 'expense') expense += t.amount; }
  return { income, expense, net: income - expense, count };
}

export function monthReview(state, key, cal) {
  const r = monthRange(key, cal), cur = monthSums(state, key, cal), prev = monthSums(state, shiftKey(key, -1, cal), cal);
  const exps = state.txs.filter(t => t.type === 'expense' && inRange(t, r));
  const perBucket = state.buckets.map(b => { const m = monthStats(state, b.id, key, cal); return { id: b.id, name: b.name, color: b.color, carry: m.carry, inflow: m.inflow, spent: m.spent, left: m.carry + m.inflow - m.spent }; });
  const tagMap = {};
  for (const t of exps) for (const g of t.tags || []) tagMap[g] = (tagMap[g] || 0) + t.amount;
  const tags = Object.entries(tagMap).map(([tag, amount]) => ({ tag, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);
  const daily = {}; for (const t of exps) daily[t.date] = (daily[t.date] || 0) + t.amount;
  const days = []; const first = parseISO(r.from), last = parseISO(r.to);
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) { const iso = isoDate(d); days.push({ iso, amount: daily[iso] || 0, dow: (d.getDay() + 1) % 7 }); }
  const max = Math.max(0, ...days.map(d => d.amount));
  return {
    key, ...cur, prev, perBucket, tags, days, maxDay: max,
    savingsRate: cur.income > 0 ? (cur.income - cur.expense) / cur.income : null,
    top: [...exps].sort((a, b) => b.amount - a.amount).slice(0, 5),
    topDay: days.reduce((a, d) => (d.amount > (a?.amount || 0) ? d : a), null),
    avgDaily: exps.length ? Math.round(cur.expense / days.length) : 0,
    closed: state.closedMonths.includes(key),
    finished: r.to < isoDate(),
  };
}

export function yearReview(state, year, cal) {
  const months = Array.from({ length: 12 }, (_, i) => { const key = `${year}-${String(i + 1).padStart(2, '0')}`; return { key, label: monthShort(key, cal), ...monthSums(state, key, cal) }; });
  const income = months.reduce((a, m) => a + m.income, 0), expense = months.reduce((a, m) => a + m.expense, 0);
  const active = months.filter(m => m.count);
  const best = active.length ? active.reduce((a, m) => (m.net > a.net ? m : a)) : null;
  const worst = active.length ? active.reduce((a, m) => (m.net < a.net ? m : a)) : null;
  return { year, months, income, expense, net: income - expense, rate: income > 0 ? (income - expense) / income : null, best, worst, activeMonths: active.length };
}
export const yearOf = (today, cal) => Number(currentKey(today, cal).split('-')[0]);
