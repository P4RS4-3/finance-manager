// وضعیت برنامه در حافظه + ذخیره‌ی خودکار + اکشن‌ها. همه‌ی تغییرات از اینجا رد می‌شوند.
import * as db from './db.js';
import { newState, SCHEMA, isoDate, uid, makeDeposit, makeExpense, makeTransfer, splitDeposit, normTag } from '../core/ledger.js';
import { PALETTE } from '../core/prefs.js';
import { makeLoanRequest, makeLoanOut, makeLoanPay, requestReady } from '../core/loans.js';

let state = null;
const subs = new Set();
let saveTimer = null, saving = Promise.resolve();
export const status = { saved: true, error: null };

export const getState = () => state;
export const onState = f => (subs.add(f), () => subs.delete(f));
const emit = () => subs.forEach(f => f(state));

const TRASH_DAYS = 30, AUDIT_MAX = 500, BACKUPS = 5;

export async function init() {
  let s = await db.get('state');
  if (!s) s = newState();
  if (s.schema && s.schema < SCHEMA) { state = structuredClone(s); await rollingBackup(true); } // پشتیبان خودکار قبل از مهاجرت
  s = migrate(s);
  purgeTrash(s);
  state = s;
  db.persistStorage();
  emit();
  return state;
}

/** مهاجرت‌های نسخه‌ی داده؛ هر مرحله یک تابع. قبل از اجرا پشتیبان خودکار گرفته می‌شود. */
const MIGRATIONS = {
  // 1: s => { ... }  ← نمونه برای نسخه‌های بعد
};
export function migrate(s) {
  if (!s.schema) s.schema = 1;
  if (s.schema > SCHEMA) throw new Error('این داده با نسخه‌ی جدیدتری از برنامه ساخته شده؛ برنامه را به‌روز کن');
  if (s.schema < SCHEMA) {
    const before = structuredClone(s);
    try {
      for (let v = s.schema; v < SCHEMA; v++) { MIGRATIONS[v]?.(s); s.schema = v + 1; }
    } catch (e) { return before; } // در صورت خطا به حالت قبل برمی‌گردد
  }
  const base = newState();
  for (const k of Object.keys(base)) if (!(k in s)) s[k] = base[k];
  return s;
}

function purgeTrash(s) {
  const cut = Date.now() - TRASH_DAYS * 864e5;
  s.trash = s.trash.filter(t => new Date(t.deletedAt).getTime() >= cut);
}

export function save() {
  status.saved = false;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}
export function flush() {
  clearTimeout(saveTimer);
  const snapshot = structuredClone(state);
  saving = saving.then(async () => {
    try { await db.set('state', snapshot); status.saved = true; status.error = null; }
    catch (e) { status.error = e; }
  });
  return saving;
}

/** پشتیبان چرخشی داخلی (۵ آخر) — حداکثر ساعتی یک بار مگر force */
export async function rollingBackup(force = false) {
  const list = (await db.get('backups')) || [];
  const last = list[0] && new Date(list[0].at).getTime();
  if (!force && last && Date.now() - last < 36e5) return;
  list.unshift({ at: new Date().toISOString(), state: structuredClone(state) });
  await db.set('backups', list.slice(0, BACKUPS));
}
export const listBackups = async () => (await db.get('backups')) || [];

export function audit(action, detail = '') {
  state.audit.unshift({ at: new Date().toISOString(), action, detail });
  if (state.audit.length > AUDIT_MAX) state.audit.length = AUDIT_MAX;
}

/** اعمال تغییر روی state با ثبت در گزارش تغییرات */
export function commit(mutator, action, detail) {
  mutator(state);
  if (action) audit(action, detail);
  save(); emit();
}

function ensureTags(s, tags) {
  for (const t of tags || []) if (!s.tags[t]) s.tags[t] = { color: PALETTE[Object.keys(s.tags).length % PALETTE.length] };
}

/* ------------------------------ اکشن‌های تراکنش ------------------------------ */
export function addDeposit(input) {
  const tx = makeDeposit(state, { ...input, tags: (input.tags || []).map(normTag).filter(Boolean) });
  commit(s => { ensureTags(s, tx.tags); s.txs.push(tx); }, 'deposit', `${tx.amount}`);
  return tx;
}
export function addExpense(input) {
  const tx = makeExpense(state, { ...input, tags: (input.tags || []).map(normTag).filter(Boolean) });
  commit(s => { ensureTags(s, tx.tags); s.txs.push(tx); }, 'expense', `${tx.amount} ← ${tx.bucket}`);
  return tx;
}
export function addTransfer(input) {
  const tx = makeTransfer(state, { ...input, tags: (input.tags || []).map(normTag).filter(Boolean) });
  commit(s => { ensureTags(s, tx.tags); s.txs.push(tx); }, 'transfer', `${tx.amount}: ${tx.from} → ${tx.to}`);
  return tx;
}

export function deleteTx(id) {
  const tx = state.txs.find(t => t.id === id);
  if (!tx) return;
  if (tx.type === 'loan_out' && state.txs.some(t => t.type === 'loan_pay' && t.loanId === id)) throw new Error('این وام پرداخت ثبت‌شده دارد؛ اول پرداخت‌هایش را حذف کن');
  commit(s => { s.txs = s.txs.filter(t => t.id !== id); s.trash.unshift({ tx, deletedAt: new Date().toISOString() }); }, 'delete', `${tx.type} ${tx.amount}`);
}
export function restoreTx(id) {
  const item = state.trash.find(t => t.tx.id === id);
  if (!item) return;
  if (item.tx.type === 'loan_pay' && !state.txs.some(t => t.id === item.tx.loanId)) throw new Error('وام این پرداخت دیگر وجود ندارد');
  if (item.tx.type === 'loan_out' && state.txs.some(t => t.type === 'loan_out') && state.txs.some(t => t.type === 'loan_out' && t.schedule.installments.some(i => !state.txs.some(p => p.type === 'loan_pay' && p.loanId === t.id && p.ns.includes(i.n))))) throw new Error('هم‌زمان فقط یک وام فعال ممکن است');
  commit(s => { s.trash = s.trash.filter(t => t.tx.id !== id); s.txs.push(item.tx); }, 'restore', `${item.tx.type} ${item.tx.amount}`);
}
export function purgeNow(id) {
  commit(s => { s.trash = s.trash.filter(t => t.tx.id !== id); }, 'purge', id);
}

/** ویرایش تراکنش؛ برای واریزی، مبلغ با همان اسنپ‌شات درصد دوباره تقسیم می‌شود */
export function editTx(id, patch) {
  const tx = state.txs.find(t => t.id === id);
  if (!tx) throw new Error('تراکنش پیدا نشد');
  const next = { ...tx, ...patch };
  if (patch.tags) next.tags = patch.tags.map(normTag).filter(Boolean);
  if (tx.type === 'deposit' && patch.amount && patch.amount !== tx.amount) {
    const { split } = splitDeposit(patch.amount, { split: tx.pct }, state.buckets);
    next.split = split;
  }
  commit(s => { ensureTags(s, next.tags); s.txs = s.txs.map(t => (t.id === id ? next : t)); }, 'edit', `${tx.type} ${tx.id.slice(0, 6)}`);
}

/* ------------------------------ وام ------------------------------ */
export function requestLoan(input) {
  const req = makeLoanRequest(state, input);
  commit(s => { s.loanRequest = req; }, 'loanRequest', `${req.amount} / ${req.months}`);
  return req;
}
export function cancelLoanRequest() { commit(s => { s.loanRequest = null; }, 'loanCancel'); }
export function confirmLoan(date = isoDate()) {
  const req = state.loanRequest;
  if (!req) throw new Error('درخواست وامی وجود ندارد');
  if (!requestReady(req)) throw new Error('هنوز ۲۴ ساعت از درخواست نگذشته است');
  const tx = makeLoanOut(state, { ...req, date });
  commit(s => { s.txs.push(tx); s.loanRequest = null; }, 'loanOut', `${tx.amount}`);
  return tx;
}
export function payLoan(input) {
  const tx = makeLoanPay(state, input);
  commit(s => { s.txs.push(tx); }, 'loanPay', `${tx.amount} (${tx.mode})`);
  return tx;
}

export function closeMonth(key) { commit(s => { if (!s.closedMonths.includes(key)) s.closedMonths.push(key); }, 'closeMonth', key); }
export function reopenMonth(key) { commit(s => { s.closedMonths = s.closedMonths.filter(k => k !== key); }, 'reopenMonth', key); }

/* ------------------------------ داده‌ی نمایشی ------------------------------ */
/** پر کردن حالت نمایشی با ۱۲ ماه داده‌ی نمونه (قطعی با seed) */
export function demoState(now = new Date()) {
  const s = newState();
  s.settings.demo = true; s.settings.onboarded = true; s.settings.birthDate = { y: now.getFullYear() - 36, m: 6, d: 15 };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let income = 22_000_000;
  // تاریخ‌ها نسبت به «امروز» ساخته می‌شوند تا همیشه داخل ماه جاری (شمسی یا میلادی) بیفتند
  const ago = n => isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  for (let i = 11; i >= 0; i--) {
    const o = i * 30;
    income = Math.round((income * (1 + rnd() * 0.05 + 0.005)) / 100000) * 100000;
    s.txs.push(makeDeposit(s, { amount: income, date: ago(o + 5), title: 'حقوق', source: 'کار', tags: ['حقوق'] }));
    const need = Math.round(income * 0.45 * (0.7 + rnd() * 0.25) / 1000) * 1000;
    s.txs.push(makeExpense(s, { amount: Math.round(need * 0.55 / 1000) * 1000, bucket: 'needs', date: ago(o + 4), title: 'اجاره و قبض', tags: ['خانه'] }));
    s.txs.push(makeExpense(s, { amount: Math.round(need * 0.45 / 1000) * 1000, bucket: 'needs', date: ago(o + 3), title: 'خرید خوراکی', tags: ['خوراکی'] }));
    s.txs.push(makeExpense(s, { amount: Math.round(income * 0.1 * (0.5 + rnd() * 0.4) / 1000) * 1000, bucket: 'fun', date: ago(o + 1), title: 'تفریح و بیرون', tags: ['تفریح'] }));
    if (i % 3 === 0) s.txs.push(makeExpense(s, { amount: 1_200_000, bucket: 'learn', date: ago(o + 2), title: 'دوره‌ی آنلاین', tags: ['دوره'] }));
  }
  s.txs.push(makeTransfer(s, { amount: 2_000_000, from: 'save', to: 'learn', date: ago(1), note: 'برای دوره' }));
  s.txs.forEach(t => ensureTags(s, t.tags));
  s.txs = s.txs.filter(t => t.date <= isoDate(now));
  return s;
}

export async function enterDemo() {
  await rollingBackup(true);
  state = demoState(); emit(); await flush();
}
export async function resetAll() {
  await rollingBackup(true);
  state = newState(); emit(); await flush();
}
export async function replaceState(next, note = 'import') {
  await rollingBackup(true);
  state = migrate(next); audit(note); emit(); await flush();
}
export { uid };
