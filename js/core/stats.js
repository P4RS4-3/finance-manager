// آمار صفحه‌ی خانه از روی state
import { computeBalances, monthStats, filterTxs, isoDate } from './ledger.js';
import { currentKey, shiftKey, monthRange, monthShort } from './months.js';

export function homeData(state, cal, today = isoDate()) {
  const key = currentKey(today, cal);
  const keys = Array.from({ length: 12 }, (_, i) => shiftKey(key, i - 11, cal));
  const ranges = keys.map(k => monthRange(k, cal));
  const nowBal = computeBalances(state);
  const perMonth = ranges.map(r => computeBalances(state, r.to));
  const buckets = state.buckets.map(b => {
    const ms = monthStats(state, b.id, key, cal);
    return { ...b, balance: nowBal.bal[b.id], series: perMonth.map(m => m.bal[b.id]), month: ms };
  });
  const monthlyIncome = ranges.map(r => state.txs.filter(t => t.type === 'deposit' && t.date >= r.from && t.date <= r.to).reduce((a, t) => a + t.amount, 0));
  const assetTrend = perMonth.map(m => m.total);
  const prev = assetTrend[10];
  return {
    key, keys, labels: keys.map(k => monthShort(k, cal)), buckets, monthlyIncome, assetTrend,
    total: nowBal.total, receivable: nowBal.receivable,
    delta: prev > 0 ? (nowBal.total - prev) / prev * 100 : null,
    recent: filterTxs(state, {}).slice(0, 6),
    empty: state.txs.length === 0,
  };
}
