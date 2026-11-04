// منطق دفتر مالی — توابع خالص، بدون DOM (قابل تست در node)
// همه‌ی مبالغ عدد صحیح تومان‌اند. موجودی هر صندوق همیشه از روی تراکنش‌ها محاسبه می‌شود
// (هیچ موجودی جداگانه‌ای ذخیره نمی‌شود، پس ناسازگاری ممکن نیست).
import { allocate } from './format.js';
import { toJalali } from './jalali.js';
import { BUCKETS, BALANCED } from '../data/defaults.js';

export const SCHEMA = 1;
const pad = n => String(n).padStart(2, '0');

export const uid = () => (globalThis.crypto?.randomUUID?.() ?? 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

/** تاریخ محلی به شکل YYYY-MM-DD */
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** کلید ماه بر اساس تقویم انتخابی: مثل 1405-08 یا 2026-10 */
export function monthKey(iso, calendar = 'jalali') {
  const [y, m, d] = iso.split('-').map(Number);
  if (calendar === 'jalali') { const j = toJalali(y, m, d); return `${j.jy}-${pad(j.jm)}`; }
  return `${y}-${pad(m)}`;
}

export function newState() {
  return {
    schema: SCHEMA,
    createdAt: new Date().toISOString(),
    settings: { birthDate: null, activeModelId: 'balanced', onboarded: false, demo: false },
    buckets: BUCKETS.map(b => ({ ...b })),
    models: [structuredClone(BALANCED)],
    txs: [],
    trash: [],
    tags: {},
    closedMonths: [],
    loans: [],
    loanRequest: null,
    audit: [],
  };
}

/* ------------------------------ اعتبارسنجی ------------------------------ */

/** تبدیل ارقام فارسی/عربی به انگلیسی و حذف جداکننده‌ها؛ فقط عدد صحیح مثبت یا null */
export function parseAmount(input) {
  if (typeof input === 'number') return Number.isSafeInteger(input) && input > 0 ? input : null;
  const s = String(input ?? '')
    .replace(/[۰-۹]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x6f0 + 48))
    .replace(/[٠-٩]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x660 + 48))
    .replace(/[,٬،\s]/g, '');
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function validateModel(split, buckets = BUCKETS) {
  const errors = [], warnings = [];
  let sum = 0;
  for (const b of buckets) {
    const v = Number(split[b.id] ?? 0);
    if (!Number.isFinite(v) || v < 0) errors.push(`درصد «${b.name}» معتبر نیست`);
    if (Math.round(v * 10) !== v * 10 && Math.abs(v * 10 - Math.round(v * 10)) > 1e-9) errors.push(`درصد «${b.name}» فقط یک رقم اعشار می‌تواند داشته باشد`);
    sum += v;
  }
  if (Math.abs(sum - 100) > 1e-9) errors.push(`جمع درصدها باید دقیقاً ۱۰۰ باشد (الان ${Math.round(sum * 10) / 10})`);
  const saving = buckets.filter(b => b.kind !== 'spend').every(b => !(Number(split[b.id]) > 0));
  if (saving) warnings.push('هیچ درصدی به صندوق‌های پس‌انداز نرفته است');
  return { ok: errors.length === 0, errors, warnings };
}

/* ------------------------------ تقسیم واریزی ------------------------------ */

export function splitDeposit(amount, model, buckets = BUCKETS) {
  const pcts = buckets.map(b => Number(model.split[b.id] ?? 0));
  // درصدها را به دهم درصد تبدیل می‌کنیم تا اعشار دقیق بماند
  const parts = allocate(amount, pcts.map(p => Math.round(p * 10)));
  const split = {}, pct = {};
  buckets.forEach((b, i) => { split[b.id] = parts[i]; pct[b.id] = pcts[i]; });
  return { split, pct };
}

export function makeDeposit(state, { amount, date, title = '', source = '', note = '', tags = [], modelId }) {
  const amt = parseAmount(amount);
  if (!amt) throw new Error('مبلغ واریزی باید عدد صحیح مثبت باشد');
  const model = state.models.find(m => m.id === (modelId || state.settings.activeModelId)) || state.models[0];
  const v = validateModel(model.split, state.buckets);
  if (!v.ok) throw new Error(v.errors[0]);
  const { split, pct } = splitDeposit(amt, model, state.buckets);
  return { id: uid(), type: 'deposit', date: date || isoDate(), createdAt: new Date().toISOString(),
    amount: amt, title: title.trim(), source: source.trim(), note: note.trim(), tags: [...tags], modelId: model.id, modelName: model.name, pct, split };
}

export function makeExpense(state, { amount, date, bucket, title = '', note = '', tags = [] }) {
  const amt = parseAmount(amount);
  if (!amt) throw new Error('مبلغ خرج باید عدد صحیح مثبت باشد');
  const b = state.buckets.find(x => x.id === bucket);
  if (!b) throw new Error('صندوق نامعتبر است');
  if (b.kind === 'locked') throw new Error('از صندوق ۶۰ سالگی خرج مستقیم ممکن نیست؛ فقط وام');
  return { id: uid(), type: 'expense', date: date || isoDate(), createdAt: new Date().toISOString(), amount: amt, bucket, title: title.trim(), note: note.trim(), tags: [...tags] };
}

export function makeTransfer(state, { amount, date, from, to, note = '', tags = [] }) {
  const amt = parseAmount(amount);
  if (!amt) throw new Error('مبلغ انتقال باید عدد صحیح مثبت باشد');
  const f = state.buckets.find(x => x.id === from), t = state.buckets.find(x => x.id === to);
  if (!f || !t) throw new Error('صندوق نامعتبر است');
  if (f.id === t.id) throw new Error('مبدأ و مقصد نباید یکی باشد');
  if (f.kind === 'locked') throw new Error('از صندوق ۶۰ سالگی انتقال آزاد ممکن نیست؛ فقط وام');
  return { id: uid(), type: 'transfer', date: date || isoDate(), createdAt: new Date().toISOString(), amount: amt, from, to, title: '', note: note.trim(), tags: [...tags] };
}

/* ------------------------------ موجودی‌ها ------------------------------ */

/** اثر یک تراکنش روی هر صندوق: {bucketId: delta} */
export function effects(tx) {
  switch (tx.type) {
    case 'deposit': return { ...tx.split };
    case 'opening': return { ...tx.split };
    case 'expense': return { [tx.bucket]: -tx.amount };
    case 'transfer': return { [tx.from]: -tx.amount, [tx.to]: tx.amount };
    case 'loan_out': { const e = { retire: -tx.amount }; if (tx.to) e[tx.to] = (e[tx.to] || 0) + tx.amount; return e; }
    case 'loan_pay': { const sum = tx.principal + tx.interest + (tx.fee || 0), e = { retire: sum }; if (tx.from) e[tx.from] = (e[tx.from] || 0) - sum; return e; }
    default: return {};
  }
}

export function computeBalances(state, upToISO = null) {
  const bal = Object.fromEntries(state.buckets.map(b => [b.id, 0]));
  let receivable = 0;
  for (const tx of state.txs) {
    if (upToISO && tx.date > upToISO) continue;
    for (const [id, d] of Object.entries(effects(tx))) if (id in bal) bal[id] += d;
    if (tx.type === 'loan_out') receivable += tx.amount;
    if (tx.type === 'loan_pay') receivable -= tx.principal;
  }
  const total = Object.values(bal).reduce((a, b) => a + b, 0) + receivable;
  return { bal, receivable, total };
}

/** آمار یک ماه برای یک صندوق: سرریز ماه قبل، ورودی، خرج و سقف قابل‌خرج */
export function monthStats(state, bucketId, key, calendar = 'jalali') {
  let carry = 0, inflow = 0, spent = 0;
  for (const tx of state.txs) {
    const d = effects(tx)[bucketId];
    if (!d) continue;
    const k = monthKey(tx.date, calendar);
    if (k < key) carry += d;
    else if (k === key) { if (d > 0) inflow += d; else spent += -d; }
  }
  const available = carry + inflow;
  return { carry, inflow, spent, available, ratio: available > 0 ? spent / available : (spent > 0 ? Infinity : 0) };
}

/** هشدار خرج: 'over' بیش از موجودی، 'cap100'، 'cap80' یا null */
export function expenseCheck(state, bucketId, amount, dateISO, calendar = 'jalali') {
  const { bal } = computeBalances(state);
  const key = monthKey(dateISO, calendar);
  const ms = monthStats(state, bucketId, key, calendar);
  const after = bal[bucketId] - amount;
  const ratioAfter = ms.available > 0 ? (ms.spent + amount) / ms.available : Infinity;
  let level = null;
  if (after < 0) level = 'over';
  else if (ratioAfter >= 1) level = 'cap100';
  else if (ratioAfter >= 0.8) level = 'cap80';
  return { level, balanceAfter: after, ratioAfter, available: ms.available };
}

export function isMonthClosed(state, iso, calendar = 'jalali') {
  return state.closedMonths.includes(monthKey(iso, calendar));
}

/* ------------------------------ هشتگ‌ها ------------------------------ */

export const normTag = t => String(t).trim().replace(/^#+/, '').replace(/\s+/g, '_');

export function tagUsage(state) {
  const m = {};
  for (const tx of state.txs) for (const t of tx.tags || []) m[t] = (m[t] || 0) + 1;
  return m;
}

export function renameTag(state, from, to) {
  to = normTag(to);
  if (!to) throw new Error('نام هشتگ خالی است');
  for (const tx of state.txs) tx.tags = [...new Set((tx.tags || []).map(t => (t === from ? to : t)))];
  if (state.tags[from]) { state.tags[to] = state.tags[to] || state.tags[from]; delete state.tags[from]; }
}
export function deleteTag(state, name) {
  for (const tx of state.txs) tx.tags = (tx.tags || []).filter(t => t !== name);
  delete state.tags[name];
}

/* ------------------------------ فیلتر و جستجو ------------------------------ */

export function filterTxs(state, f = {}) {
  const q = (f.q || '').trim().toLowerCase();
  return state.txs.filter(tx => {
    if (f.type && tx.type !== f.type) return false;
    if (f.bucket) { const e = effects(tx); if (!(f.bucket in e)) return false; }
    if (f.from && tx.date < f.from) return false;
    if (f.to && tx.date > f.to) return false;
    if (f.tag && !(tx.tags || []).includes(f.tag)) return false;
    if (f.min && tx.amount < f.min) return false;
    if (f.max && tx.amount > f.max) return false;
    if (q) {
      const hay = [tx.title, tx.note, tx.source, ...(tx.tags || []).map(t => '#' + t), String(tx.amount)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
}

/* ------------------------------ بررسی سلامت داده ------------------------------ */

export function healthCheck(state) {
  const issues = [];
  const ids = new Set(state.buckets.map(b => b.id));
  const seen = new Set();
  for (const tx of state.txs) {
    if (seen.has(tx.id)) issues.push({ level: 'error', txId: tx.id, text: 'شناسه‌ی تراکنش تکراری است' });
    seen.add(tx.id);
    if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) issues.push({ level: 'error', txId: tx.id, text: 'مبلغ تراکنش معتبر نیست' });
    if (tx.type === 'deposit') {
      const sum = Object.values(tx.split || {}).reduce((a, b) => a + b, 0);
      if (sum !== tx.amount) issues.push({ level: 'error', txId: tx.id, text: `جمع تقسیم واریزی (${sum}) با مبلغ (${tx.amount}) برابر نیست` });
      for (const id of Object.keys(tx.split || {})) if (!ids.has(id)) issues.push({ level: 'error', txId: tx.id, text: `صندوق ناشناس «${id}»` });
    }
    if (tx.type === 'expense' && !ids.has(tx.bucket)) issues.push({ level: 'error', txId: tx.id, text: 'خرج به صندوق ناشناس اشاره دارد' });
    if (tx.type === 'transfer' && (!ids.has(tx.from) || !ids.has(tx.to))) issues.push({ level: 'error', txId: tx.id, text: 'انتقال به صندوق ناشناس اشاره دارد' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date || '')) issues.push({ level: 'error', txId: tx.id, text: 'تاریخ تراکنش معتبر نیست' });
  }
  const loans = state.txs.filter(t => t.type === 'loan_out');
  for (const l of loans) {
    const sum = (l.schedule?.installments || []).reduce((a, i) => a + i.principal, 0);
    if (sum !== l.amount) issues.push({ level: 'error', txId: l.id, text: 'جمع اصل اقساط وام با مبلغ وام برابر نیست' });
  }
  const paidSeen = new Set();
  for (const t of state.txs.filter(x => x.type === 'loan_pay')) {
    if (!loans.some(l => l.id === t.loanId)) issues.push({ level: 'error', txId: t.id, text: 'پرداخت وام به وامِ ناموجود اشاره دارد' });
    for (const n of t.ns || []) { const k = t.loanId + ':' + n; if (paidSeen.has(k)) issues.push({ level: 'error', txId: t.id, text: `قسط ${n} دوبار پرداخت شده` }); paidSeen.add(k); }
  }
  const { bal } = computeBalances(state);
  for (const b of state.buckets) {
    if (b.kind !== 'spend' && bal[b.id] < 0) issues.push({ level: 'warn', text: `موجودی «${b.name}» منفی است` });
  }
  const m = state.models.find(x => x.id === state.settings.activeModelId);
  if (!m) issues.push({ level: 'error', text: 'مدل درصدی فعال پیدا نشد' });
  else if (!validateModel(m.split, state.buckets).ok) issues.push({ level: 'error', text: 'جمع درصدهای مدل فعال ۱۰۰ نیست' });
  return issues;
}
