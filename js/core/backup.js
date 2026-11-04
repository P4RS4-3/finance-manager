// فایل پشتیبان: نسخه‌دار، قابل اعتبارسنجی، و سازگار با نسخه‌های بعدی
import { SCHEMA, healthCheck, computeBalances } from './ledger.js';

export const APP_ID = 'finance-manager';
export const APP_VERSION = '1.1.0';

export function buildBackup(state, prefs = null) {
  return { app: APP_ID, appVersion: APP_VERSION, schema: state.schema, exportedAt: new Date().toISOString(), state, prefs };
}
export const backupFileName = (d = new Date()) => `finance-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;

const isArr = Array.isArray;
/** بررسی ساختار؛ خطا را به فارسی برمی‌گرداند */
export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, error: 'فایل JSON معتبر نیست یا خراب شده است.' }; }
  if (!obj || obj.app !== APP_ID) return { ok: false, error: 'این فایل پشتیبان این برنامه نیست.' };
  if (!obj.state || typeof obj.state !== 'object') return { ok: false, error: 'محتوای پشتیبان ناقص است (بخش داده‌ها وجود ندارد).' };
  const s = obj.state;
  if (typeof s.schema !== 'number') return { ok: false, error: 'نسخه‌ی داده در فایل مشخص نیست.' };
  if (s.schema > SCHEMA) return { ok: false, error: `این پشتیبان با نسخه‌ی جدیدتری از برنامه ساخته شده (داده‌ی نسخه ${s.schema}). اول برنامه را به‌روز کن.` };
  for (const k of ['buckets', 'models', 'txs']) if (!isArr(s[k])) return { ok: false, error: `بخش «${k}» در فایل پشتیبان معتبر نیست.` };
  if (!s.buckets.length) return { ok: false, error: 'فایل پشتیبان هیچ صندوقی ندارد.' };
  for (const k of ['trash', 'closedMonths', 'loans', 'audit']) if (s[k] === undefined) s[k] = [];
  if (s.loanRequest === undefined) s.loanRequest = null;
  if (!s.tags || typeof s.tags !== 'object') s.tags = {};
  if (!s.settings || typeof s.settings !== 'object') s.settings = { activeModelId: s.models[0]?.id };
  const issues = healthCheck(s).filter(i => i.level === 'error');
  const dates = s.txs.map(t => t.date).sort();
  const { total } = computeBalances(s);
  return { ok: true, state: s, prefs: obj.prefs || null, issues,
    summary: { txs: s.txs.length, from: dates[0] || null, to: dates[dates.length - 1] || null, total, exportedAt: obj.exportedAt, appVersion: obj.appVersion, models: s.models.length, tags: Object.keys(s.tags).length } };
}
