// پیش‌فرض‌های برنامه: صندوق‌ها و مدل درصدی «متعادل»
export const BUCKETS = [
  { id: 'needs',  name: 'نیاز ضروری',       icon: 'home',    color: '#38bdf8', kind: 'spend',
    desc: 'خرج‌های ضروری زندگی: اجاره، غذا، قبض، رفت‌وآمد' },
  { id: 'fun',    name: 'تفریح',             icon: 'sparkle', color: '#f472b6', kind: 'spend',
    desc: 'تفریح و خوشی بدون عذاب وجدان' },
  { id: 'learn',  name: 'یادگیری',           icon: 'book',    color: '#a78bfa', kind: 'spend',
    desc: 'سرمایه‌گذاری روی مهارت و دانش خودت' },
  { id: 'save',   name: 'پس‌انداز',          icon: 'coins',   color: '#fbbf24', kind: 'save',
    desc: 'پس‌انداز میان‌مدت برای حفظ ارزش پول' },
  { id: 'retire', name: 'پس‌انداز ۶۰ سالگی', icon: 'lock',    color: '#34d399', kind: 'locked',
    desc: 'پس‌انداز قفل‌شده برای ۶۰ سالگی؛ برداشت فقط به‌صورت وام' },
];

export const BALANCED = { id: 'balanced', name: 'متعادل', builtin: true,
  split: { needs: 45, fun: 10, learn: 10, save: 20, retire: 15 } };

export const BUCKET_ORDER = BUCKETS.map(b => b.id);
