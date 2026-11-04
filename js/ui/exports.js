// بخش «خروجی گرفتن» در تنظیمات ← داده و پشتیبان
import { chipSelect } from './fields.js';
import { icon } from './icons.js';
import { toast } from './shell.js';
import { getPrefs } from '../core/prefs.js';
import { getState } from '../data/store.js';
import { isoDate } from '../core/ledger.js';
import { activeLoan } from '../core/loans.js';
import { scopeRange, txTable, balanceTable, monthlyTable, toCSV, toXLSX, toDOCX, toICS, reportHTML, download, printHTML } from '../core/exporters.js';

export function mountExports(el) {
  const sc = chipSelect({ label: 'بازه‌ی تراکنش‌ها', value: 'all', items: [{ id: 'all', label: 'همه' }, { id: 'year', label: 'سال جاری' }, { id: 'month', label: 'ماه جاری' }] });
  const act = activeLoan(getState());
  el.append(sc.el);
  el.insertAdjacentHTML('beforeend', `<div class="data-grid">
    <button class="btn" data-x="csv">${icon('download', 16)} CSV</button><button class="btn" data-x="xlsx">${icon('download', 16)} Excel</button>
    <button class="btn" data-x="docx">${icon('download', 16)} Word</button><button class="btn" data-x="pdf">${icon('download', 16)} PDF / چاپ</button>
    ${act ? `<button class="btn" data-x="ics">${icon('calendar', 16)} تقویم اقساط (ICS)</button>` : ''}</div>
    <p class="note">این خروجی‌ها فقط برای مطالعه و حسابداری‌اند و جای «فایل پشتیبان» را نمی‌گیرند (برای بازیابی فقط فایل پشتیبان کار می‌کند). فایل ICS را در تقویم گوشی یا گوگل باز کن تا یک روز قبل از هر قسط یادآوری بگیری.</p>`);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const s = getState(), p = getPrefs(), today = isoDate(), r = scopeRange(sc.value(), p.calendar, today);
    const t = txTable(s, p, r), name = `finance-${today.replace(/-/g, '')}`;
    const tables = [{ heading: 'موجودی صندوق‌ها', table: balanceTable(s, p) }, { heading: 'خلاصه‌ی ماهانه', table: monthlyTable(s, p, today) }, { heading: 'تراکنش‌ها (' + r.label + ')', table: t }];
    const kind = b.dataset.x;
    try {
      if (kind === 'csv') download(name + '.csv', toCSV(t), 'text/csv;charset=utf-8');
      else if (kind === 'xlsx') download(name + '.xlsx', toXLSX([{ name: 'تراکنش‌ها', table: t }, { name: 'موجودی صندوق‌ها', table: tables[0].table }, { name: 'خلاصه ماهانه', table: tables[1].table }]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      else if (kind === 'docx') download(name + '.docx', toDOCX({ title: 'گزارش مالی', subtitle: r.label, tables }), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      else if (kind === 'pdf') { printHTML(reportHTML({ title: 'گزارش مالی', subtitle: r.label, tables })); return toast('در پنجره‌ی چاپ «Save as PDF» را انتخاب کن'); }
      else if (kind === 'ics') download('installments.ics', toICS(s, today), 'text/calendar;charset=utf-8');
      toast('فایل آماده شد');
    } catch (err) { toast('خطا در ساخت فایل: ' + err.message); }
  });
}
