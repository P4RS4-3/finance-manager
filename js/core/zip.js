// نویسنده‌ی ساده‌ی ZIP (بدون فشرده‌سازی) برای ساخت فایل‌های xlsx و docx بدون هیچ کتابخانه‌ی بیرونی
const te = new TextEncoder();
let T;
const crc32 = bytes => {
  if (!T) { T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } }
  let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = T[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
/** files: {path: string|Uint8Array} → Uint8Array */
export function zip(files) {
  const parts = [], central = []; let offset = 0;
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const [name, data] of Object.entries(files)) {
    const nb = te.encode(name), db = typeof data === 'string' ? te.encode(data) : data, crc = crc32(db);
    const head = Uint8Array.from([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), 0, 0]);
    parts.push(head, nb, db);
    central.push(Uint8Array.from([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(offset)]), nb);
    offset += head.length + nb.length + db.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0), n = Object.keys(files).length;
  const end = Uint8Array.from([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(n), ...u16(n), ...u32(cdSize), ...u32(offset), 0, 0]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0; for (const b of all) { out.set(b, p); p += b.length; }
  return out;
}
