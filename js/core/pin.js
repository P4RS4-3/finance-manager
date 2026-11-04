// قفل ۴ رقمی. فقط قفل صفحه است، رمزنگاری داده نیست (در راهنما صادقانه گفته می‌شود).
// PIN هرگز ذخیره نمی‌شود؛ فقط هش PBKDF2 با salt در localStorage همین دستگاه.
const K = 'fm.pin', KF = 'fm.pin.fail', KA = 'fm.pin.auto';
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rd = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const wr = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };

async function derive(pin, salt) {
  if (globalThis.crypto?.subtle) {
    const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
  }
  // جایگزین ساده اگر WebCrypto در دسترس نبود
  let h = 5381; const s = salt + pin; for (let i = 0; i < 20000; i++) h = ((h << 5) + h + s.charCodeAt(i % s.length)) | 0; return String(h);
}

export const hasPin = () => !!rd(K);
export const validPinFormat = p => /^\d{4}$/.test(p);

export async function setPin(pin) {
  if (!validPinFormat(pin)) throw new Error('PIN باید دقیقاً ۴ رقم باشد');
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  wr(K, { salt, hash: await derive(pin, salt) }); wr(KF, null);
}
export const removePin = () => { wr(K, null); wr(KF, null); };

const DELAYS = [0, 0, 0, 30, 60, 300, 900]; // ثانیه، بعد از هر اشتباه (۳ اشتباه اول بدون تأخیر)
export function lockInfo() {
  const f = rd(KF) || { n: 0, until: 0 };
  return { fails: f.n, wait: Math.max(0, Math.ceil((f.until - Date.now()) / 1000)) };
}

/** 'ok' | 'wrong' | 'locked' */
export async function checkPin(pin) {
  const rec = rd(K); if (!rec) return 'ok';
  if (lockInfo().wait > 0) return 'locked';
  if ((await derive(pin, rec.salt)) === rec.hash) { wr(KF, null); return 'ok'; }
  const f = rd(KF) || { n: 0, until: 0 }; f.n++;
  f.until = Date.now() + DELAYS[Math.min(f.n, DELAYS.length - 1)] * 1000; wr(KF, f);
  return lockInfo().wait > 0 ? 'locked' : 'wrong';
}

export const getAutoLock = () => rd(KA) ?? 5; // دقیقه؛ 0 = خاموش
export const setAutoLock = m => wr(KA, m);
