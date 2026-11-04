export const fa = {
  app: 'مدیریت مالی',
  total: 'مجموع دارایی',
  hide: 'پنهان‌کردن موجودی', show: 'نمایش موجودی',
  newDeposit: 'واریزی جدید', addExpense: 'ثبت خرج', transfer: 'انتقال',
  nav: { home: 'خانه', deposits: 'واریزی', buckets: 'صندوق‌ها', history: 'تاریخچه', more: 'بیشتر' },
  sections: {
    buckets: 'صندوق‌ها', split: 'سهم هر صندوق', trend: 'روند دارایی', monthly: 'واریزی ماهانه',
    recent: 'آخرین تراکنش‌ها', appearance: 'ظاهر و تنظیمات',
  },
  bucketDesc: {
    needs: 'خرج‌های ضروری زندگی: اجاره، غذا، قبض، رفت‌وآمد',
    fun: 'تفریح و خوشی بدون عذاب وجدان',
    learn: 'سرمایه‌گذاری روی مهارت و دانش خودت',
    save: 'پس‌انداز میان‌مدت برای حفظ ارزش پول',
    retire: 'پس‌انداز قفل‌شده برای ۶۰ سالگی',
  },
  spentOf: 'خرج‌شده از سهم این ماه',
  lockedUntil: 'تا آزادسازی',
  years: 'سال',
  installmentDue: 'قسط وام',
  soon: 'این بخش در مرحله‌ی بعد ساخته می‌شود',
  demo: 'حالت نمایشی: داده‌ها نمونه‌اند',
};
export const t = (path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), fa) ?? path;
