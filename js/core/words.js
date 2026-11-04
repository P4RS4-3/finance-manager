// عدد به حروف فارسی (برای نمایش زیر فیلد مبلغ)
const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد'];

function triple(n) {
  const h = Math.floor(n / 100), r = n % 100, parts = [];
  if (h) parts.push(hundreds[h]);
  if (r) parts.push(r < 20 ? ones[r] : tens[Math.floor(r / 10)] + (r % 10 ? ' و ' + ones[r % 10] : ''));
  return parts.join(' و ');
}

export function numberToWords(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'صفر';
  if (n >= 1e15) return '';
  const groups = [];
  let i = 0, x = n;
  while (x > 0) { groups.push(x % 1000); x = Math.floor(x / 1000); i++; }
  const out = [];
  for (let k = groups.length - 1; k >= 0; k--) {
    if (!groups[k]) continue;
    out.push(triple(groups[k]) + (scales[k] ? ' ' + scales[k] : ''));
  }
  return out.join(' و ');
}
