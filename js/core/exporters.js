// خروجی‌ها: CSV، Excel (xlsx)، Word (docx)، گزارش چاپی (PDF) و تقویم (ICS). همه خالص و بدون DOM (جز download).
import { zip } from './zip.js';
import { computeBalances, monthKey, effects } from './ledger.js';
import { dateText, monthRange, monthName, currentKey, shiftKey } from './months.js';
import { allLoans } from './loans.js';

const TYPE = { deposit: 'واریزی', expense: 'خرج', transfer: 'انتقال', opening: 'موجودی اولیه', loan_out: 'دریافت وام', loan_pay: 'پرداخت وام' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const bn = (state, prefs) => id => (prefs.buckets?.[id]?.name) || state.buckets.find(b => b.id === id)?.name || id;

/** فیلتر بازه: scope = all | month | year */
export function scopeRange(scope, cal, today) {
  if (scope === 'all') return { from: '0000-01-01', to: '9999-12-31', label: 'همه‌ی تراکنش‌ها' };
  const key = currentKey(today, cal);
  if (scope === 'month') { const r = monthRange(key, cal); return { ...r, label: monthName(key, cal) }; }
  const y = key.split('-')[0], a = monthRange(`${y}-01`, cal), b = monthRange(`${y}-12`, cal);
  return { from: a.from, to: b.to, label: 'سال ' + y };
}

export function txTable(state, prefs, range) {
  const name = bn(state, prefs), cal = prefs.calendar;
  const head = ['تاریخ', 'تاریخ (میلادی)', 'نوع', 'عنوان', 'مبلغ (تومان)', 'صندوق', 'منبع', 'هشتگ‌ها', 'یادداشت'];
  const rows = state.txs.filter(t => t.date >= range.from && t.date <= range.to).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)).map(t => {
    let box = '';
    if (t.type === 'expense') box = name(t.bucket);
    else if (t.type === 'transfer') box = `${name(t.from)} ← ${name(t.to)}`;
    else if (t.type === 'deposit' || t.type === 'opening') { const ks = Object.keys(t.split).filter(k => t.split[k]); box = ks.length === state.buckets.length ? 'تقسیم بین همه‌ی صندوق‌ها' : ks.map(name).join('، '); }
    else box = name('retire');
    return [dateText(t.date, cal, true), t.date, TYPE[t.type] || t.type, t.title || '', t.amount, box, t.source || '', (t.tags || []).map(x => '#' + x).join(' '), t.note || ''];
  });
  return { head, rows };
}
export function balanceTable(state, prefs) {
  const name = bn(state, prefs), { bal, receivable, total } = computeBalances(state);
  const rows = state.buckets.map(b => [name(b.id), bal[b.id]]);
  if (receivable) rows.push(['طلب وام', receivable]);
  rows.push(['مجموع دارایی', total]);
  return { head: ['صندوق', 'موجودی (تومان)'], rows };
}
export function monthlyTable(state, prefs, today) {
  const cal = prefs.calendar, cur = currentKey(today, cal);
  const first = state.txs.length ? monthKey(state.txs.map(t => t.date).sort()[0], cal) : cur;
  const rows = []; let k = first, guard = 0;
  while (k <= cur && guard++ < 600) {
    const r = monthRange(k, cal);
    let inc = 0, exp = 0;
    for (const t of state.txs) { if (t.date < r.from || t.date > r.to) continue; if (t.type === 'deposit') inc += t.amount; if (t.type === 'expense') exp += t.amount; }
    rows.push([monthName(k, cal), inc, exp, inc - exp]);
    k = shiftKey(k, 1, cal);
  }
  return { head: ['ماه', 'درآمد', 'خرج', 'درآمد منهای خرج'], rows };
}

/* ------------------------------ CSV ------------------------------ */
const csvCell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const toCSV = ({ head, rows }) => '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');

/* ------------------------------ XLSX ------------------------------ */
const colName = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
function sheetXml({ head, rows }) {
  const cell = (v, r, c, hdr) => {
    const ref = colName(c) + (r + 1);
    if (typeof v === 'number') return `<c r="${ref}" s="2"><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${hdr ? ' s="1"' : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  };
  const all = [head, ...rows];
  const data = all.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cell(v, r, c, r === 0)).join('')}</row>`).join('');
  const widths = head.map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(40, Math.max(12, ...all.map(r => String(r[i] ?? '').length + 2)))}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${data}</sheetData></worksheet>`;
}
export function toXLSX(sheets) { // [{name, table}]
  const n = sheets.length, files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(s.table); });
  return zip(files);
}

/* ------------------------------ DOCX ------------------------------ */
const wRun = (t, o = {}) => `<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/>${o.b ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${o.sz || 22}"/><w:szCs w:val="${o.sz || 22}"/><w:rtl/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const wPara = (t, o = {}) => `<w:p><w:pPr><w:bidi/><w:jc w:val="${o.jc || 'left'}"/><w:spacing w:after="${o.after ?? 120}"/></w:pPr>${wRun(t, o)}</w:p>`;
const fmtN = n => (typeof n === 'number' ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : n);
function wTable({ head, rows }) {
  const cell = (v, h) => `<w:tc><w:tcPr><w:tcBorders>${['top', 'left', 'bottom', 'right'].map(s => `<w:${s} w:val="single" w:sz="4" w:color="BBBBBB"/>`).join('')}</w:tcBorders>${h ? '<w:shd w:val="clear" w:color="auto" w:fill="E8EEF9"/>' : ''}</w:tcPr><w:p><w:pPr><w:bidi/><w:spacing w:after="0"/></w:pPr>${wRun(fmtN(v), { b: h, sz: 18 })}</w:p></w:tc>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:bidiVisual/></w:tblPr><w:tr>${head.map(h => cell(h, true)).join('')}</w:tr>${rows.map(r => `<w:tr>${r.map(v => cell(v)).join('')}</w:tr>`).join('')}</w:tbl>`;
}
export function toDOCX({ title, subtitle, tables }) { // tables: [{heading, table}]
  const body = [wPara(title, { b: true, sz: 36, jc: 'left' }), wPara(subtitle, { sz: 20 })];
  for (const t of tables) body.push(wPara(t.heading, { b: true, sz: 26, after: 80 }), wTable(t.table), wPara(''));
  return zip({
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="900" w:bottom="1000" w:left="900" w:header="500" w:footer="500" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`,
  });
}

/* ------------------------------ گزارش چاپی (PDF) ------------------------------ */
export function reportHTML({ title, subtitle, tables }) {
  const tb = ({ head, rows }) => `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${esc(fmtN(v))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  body{font-family:Vazirmatn,Vazir,Tahoma,sans-serif;color:#111;margin:24px;font-size:12px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:22px 0 6px}.sub{color:#555;margin:4px 0 12px}
  table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:right}th{background:#eef2fb}tr{break-inside:avoid}thead{display:table-header-group}
  @page{size:A4;margin:14mm}</style></head><body><h1>${esc(title)}</h1><p class="sub">${esc(subtitle)}</p>${tables.map(t => `<h2>${esc(t.heading)}</h2>${tb(t.table)}`).join('')}</body></html>`;
}

/* ------------------------------ ICS (اقساط وام) ------------------------------ */
const icsEsc = s => String(s).replace(/[\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
const d8 = iso => iso.replace(/-/g, '');
const nextDay = iso => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(y, m - 1, d + 1); return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}`; };
export function toICS(state, today) {
  const ev = [];
  for (const l of allLoans(state, today)) for (const i of l.installments) {
    if (i.paid) continue;
    ev.push(['BEGIN:VEVENT', `UID:${l.id}-${i.n}@finance-manager`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`, `DTSTART;VALUE=DATE:${d8(i.due)}`, `DTEND;VALUE=DATE:${nextDay(i.due)}`,
      `SUMMARY:${icsEsc(`قسط ${i.n} وام (${Math.round(i.total).toLocaleString('en-US')} تومان)`)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Loan installment', 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//finance-manager//FA', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

/* ------------------------------ دانلود ------------------------------ */
export function download(name, data, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export function printHTML(html) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;inset-inline-start:-9999px;width:800px;height:600px;border:0';
  document.body.append(f); f.srcdoc = html;
  f.onload = () => { setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } finally { setTimeout(() => f.remove(), 60000); } }, 300); };
}
export { effects };
