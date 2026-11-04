// ذخیره‌سازی: IndexedDB (کلید/مقدار). اگر در دسترس نبود (مثلاً حالت خصوصی) به localStorage برمی‌گردد.
const DB = 'finance-manager', STORE = 'kv';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no idb'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('blocked'));
  });
  return dbp;
}

export let backend = 'idb';

export async function get(key) {
  try {
    const db = await open();
    return await new Promise((res, rej) => { const q = db.transaction(STORE).objectStore(STORE).get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  } catch {
    backend = 'localStorage';
    try { const v = localStorage.getItem('fm.db.' + key); return v ? JSON.parse(v) : undefined; } catch { return undefined; }
  }
}

export async function set(key, value) {
  try {
    const db = await open();
    await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  } catch {
    backend = 'localStorage';
    localStorage.setItem('fm.db.' + key, JSON.stringify(value)); // اگر پر باشد خطا بالا می‌رود تا کاربر باخبر شود
  }
}

export async function del(key) {
  try { const db = await open(); await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
  catch { try { localStorage.removeItem('fm.db.' + key); } catch { /* */ } }
}

/** درخواست ذخیره‌ی پایدار تا مرورگر داده را خودسرانه پاک نکند */
export async function persistStorage() {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}
