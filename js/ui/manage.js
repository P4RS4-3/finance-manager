import { mountExports } from './exports.js';
// بخش‌های مدیریتی تنظیمات: مدل‌های درصدی، هشتگ‌ها، سطل بازیافت، داده و پشتیبان
import { icon } from './icons.js';
import { openSheet, confirmDialog, alertDialog } from './modal.js';
import { textField } from './fields.js';
import { toast } from './shell.js';
import { PALETTE, getPrefs, setPrefs } from '../core/prefs.js';
import { money, unitLabel } from '../core/format.js';
import { dateText } from '../core/months.js';
import { validateModel, uid, tagUsage, renameTag, deleteTag, normTag, healthCheck } from '../core/ledger.js';
import { buildBackup, parseBackup, backupFileName } from '../core/backup.js';
import * as store from '../data/store.js';

const S = () => store.getState();

/* ============================== مدل‌های درصدی ============================== */
export function mountModels(el, rerender) {
  const s = S();
  el.innerHTML = `<p class="note">هر واریزی با درصدهای مدلِ لحظه‌ی ثبت تقسیم می‌شود و همان درصدها روی آن واریزی می‌ماند. تغییر مدل فقط روی واریزی‌های بعدی اثر دارد.</p>
    <div class="acc">${s.models.map(m => {
      const active = m.id === s.settings.activeModelId;
      return `<div class="model glass glass-flat ${active ? 'on' : ''}"><div class="m-head"><b>${m.name}</b>${active ? '<span class="chip pos-chip">فعال</span>' : ''}${m.builtin ? '<span class="chip">پیش‌فرض</span>' : ''}</div>
        <div class="m-bar">${s.buckets.map(b => `<i style="flex:${m.split[b.id] || 0};background:${b.color}" title="${b.name} ${m.split[b.id] || 0}%"></i>`).join('')}</div>
        <div class="m-legend">${s.buckets.map(b => `<span><i style="background:${b.color}"></i>${b.name} <b class="num">${m.split[b.id] || 0}%</b></span>`).join('')}</div>
        <div class="c-actions">${active ? '' : `<button class="btn" data-use="${m.id}">فعال‌کردن</button>`}<button class="btn" data-edit="${m.id}">${m.builtin ? 'کپی و ویرایش' : 'ویرایش'}</button>${m.builtin || active ? '' : `<button class="btn danger" data-del="${m.id}">حذف</button>`}</div></div>`;
    }).join('')}</div><button class="btn primary big" id="newModel">${icon('plus', 18)} مدل جدید</button>`;
  el.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { store.commit(st => { st.settings.activeModelId = b.dataset.use; }, 'model', 'activate ' + b.dataset.use); toast('مدل فعال شد'); rerender(); });
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editModel(s.models.find(m => m.id === b.dataset.edit), rerender));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (await confirmDialog({ title: 'حذف مدل', message: 'واریزی‌های قبلی که با این مدل ثبت شده‌اند تغییری نمی‌کنند.', confirmText: 'حذف', danger: true })) { store.commit(st => { st.models = st.models.filter(m => m.id !== b.dataset.del); }, 'model', 'delete'); rerender(); }
  });
  el.querySelector('#newModel').onclick = () => editModel(null, rerender);
}

function editModel(base, rerender) {
  const s = S(), isNew = !base || base.builtin;
  const m = base ? structuredClone(base) : { id: uid(), name: '', split: Object.fromEntries(s.buckets.map(b => [b.id, 0])) };
  if (base?.builtin) { m.id = uid(); m.builtin = false; m.name = base.name + ' (کپی)'; }
  const name = textField({ label: 'نام مدل', value: m.name, optional: false });
  const wrap = document.createElement('form'); wrap.className = 'form'; wrap.noValidate = true;
  wrap.append(name.el);
  const rows = document.createElement('div'); rows.className = 'm-rows';
  rows.innerHTML = s.buckets.map(b => `<label class="m-row" style="--bc:${b.color}"><span class="bubble sm">${icon(b.icon, 16)}</span><span class="m-n">${b.name}</span>
    <input class="num" data-b="${b.id}" inputmode="decimal" dir="ltr" value="${m.split[b.id] ?? 0}" aria-label="درصد ${b.name}"><span>%</span></label>`).join('');
  const status = document.createElement('div'); status.className = 'm-status';
  wrap.append(rows, status);
  wrap.insertAdjacentHTML('beforeend', '<div class="c-actions"><button class="btn primary" type="submit">ذخیره</button></div>');
  const read = () => { const o = {}; rows.querySelectorAll('input').forEach(i => { o[i.dataset.b] = Number(i.value.replace(/[۰-۹]/g, c => c.charCodeAt(0) - 0x6f0).replace('٫', '.').replace(',', '.')) || 0; }); return o; };
  const upd = () => {
    const sp = read(), v = validateModel(sp, s.buckets), sum = Math.round(Object.values(sp).reduce((a, b) => a + b, 0) * 10) / 10;
    status.innerHTML = `<div class="m-sum ${sum === 100 ? 'ok' : 'bad'}">جمع: <b class="num">${sum}%</b></div>${v.errors.map(e => `<p class="w err">${e}</p>`).join('')}${v.warnings.map(e => `<p class="w">${icon('info', 14)} ${e}</p>`).join('')}`;
    return v;
  };
  rows.addEventListener('input', upd); upd();
  const sheet = openSheet({ title: isNew && !base ? 'مدل جدید' : 'ویرایش مدل', body: wrap });
  wrap.onsubmit = e => {
    e.preventDefault();
    const sp = read(), v = validateModel(sp, s.buckets), nm = name.value();
    if (!nm) return toast('برای مدل یک نام بنویس');
    if (!v.ok) return toast(v.errors[0]);
    store.commit(st => { const i = st.models.findIndex(x => x.id === m.id); const nmod = { id: m.id, name: nm, split: sp }; if (i >= 0) st.models[i] = nmod; else st.models.push(nmod); }, 'model', nm);
    sheet.close(); toast('مدل ذخیره شد'); rerender();
  };
}

/* ============================== هشتگ‌ها ============================== */
export function mountTags(el, rerender) {
  const s = S(), usage = tagUsage(s), names = Object.keys({ ...s.tags, ...usage });
  if (!names.length) { el.innerHTML = '<p class="note">هنوز هشتگی استفاده نشده. موقع ثبت تراکنش هشتگ بزن تا اینجا مدیریتشان کنی.</p>'; return; }
  names.sort((a, b) => (usage[b] || 0) - (usage[a] || 0));
  el.innerHTML = `<ul class="tag-list">${names.map(t => `<li><span class="tag" style="--tc:${s.tags[t]?.color || 'var(--a1)'}">#${t}</span><span class="faint num">${usage[t] || 0} بار</span>
    <span class="grow"></span><button class="btn sm" data-color="${t}">رنگ</button><button class="btn sm" data-ren="${t}">تغییر نام / ادغام</button><button class="btn sm danger" data-rm="${t}">حذف</button></li>`).join('')}</ul>`;
  el.querySelectorAll('[data-color]').forEach(b => b.onclick = () => {
    const t = b.dataset.color;
    const body = document.createElement('div'); body.className = 'swatches';
    body.innerHTML = PALETTE.map(c => `<button class="sw-dot" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
    const m = openSheet({ title: 'رنگ #' + t, body });
    body.onclick = e => { const c = e.target.closest('[data-c]')?.dataset.c; if (c) { store.commit(st => { st.tags[t] = { ...(st.tags[t] || {}), color: c }; }, 'tag', 'color ' + t); m.close(); rerender(); } };
  });
  el.querySelectorAll('[data-ren]').forEach(b => b.onclick = () => {
    const t = b.dataset.ren, f = textField({ label: 'نام جدید', value: t, optional: false });
    const form = document.createElement('form'); form.className = 'form'; form.append(f.el);
    form.insertAdjacentHTML('beforeend', '<p class="note">اگر نام جدید با هشتگ دیگری یکی باشد، این دو ادغام می‌شوند.</p><div class="c-actions"><button class="btn primary">ذخیره</button></div>');
    const m = openSheet({ title: 'تغییر نام #' + t, body: form });
    form.onsubmit = async e => {
      e.preventDefault(); const to = normTag(f.value()); if (!to || to === t) return m.close();
      if (names.includes(to) && !(await confirmDialog({ title: 'ادغام هشتگ‌ها', message: `#${t} با #${to} ادغام می‌شود و دیگر وجود نخواهد داشت.`, confirmText: 'ادغام' }))) return;
      store.commit(st => renameTag(st, t, to), 'tag', `${t} → ${to}`); m.close(); rerender();
    };
  });
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
    const t = b.dataset.rm;
    if (await confirmDialog({ title: 'حذف هشتگ', message: `#${t} از همه‌ی تراکنش‌ها برداشته می‌شود (خود تراکنش‌ها می‌مانند).`, confirmText: 'حذف', danger: true })) { store.commit(st => deleteTag(st, t), 'tag', 'delete ' + t); rerender(); }
  });
}

/* ============================== سطل بازیافت ============================== */
export function mountTrash(el, rerender) {
  const s = S(), p = getPrefs();
  if (!s.trash.length) { el.innerHTML = '<p class="note">سطل بازیافت خالی است. تراکنش‌های حذف‌شده تا ۳۰ روز اینجا می‌مانند.</p>'; return; }
  el.innerHTML = `<p class="note">تراکنش‌های حذف‌شده پس از ۳۰ روز برای همیشه پاک می‌شوند.</p><ul class="tx-list">${s.trash.map(({ tx, deletedAt }) => {
    const left = Math.max(0, 30 - Math.floor((Date.now() - new Date(deletedAt)) / 864e5));
    return `<li class="tx"><span class="tx-main"><b>${tx.title || tx.type}</b><span class="tags faint">${dateText(tx.date, p.calendar)} · ${left} روز مانده</span></span><span class="num tx-amt">${money(tx.amount, p.unit)}</span>
      <button class="btn sm" data-res="${tx.id}">بازگردانی</button><button class="btn sm danger" data-pg="${tx.id}">حذف همیشگی</button></li>`;
  }).join('')}</ul>`;
  el.querySelectorAll('[data-res]').forEach(b => b.onclick = () => { store.restoreTx(b.dataset.res); toast('بازگردانده شد'); rerender(); });
  el.querySelectorAll('[data-pg]').forEach(b => b.onclick = async () => { if (await confirmDialog({ title: 'حذف همیشگی', message: 'این تراکنش دیگر قابل بازگردانی نخواهد بود.', confirmText: 'حذف', danger: true })) { store.purgeNow(b.dataset.pg); rerender(); } });
}

/* ============================== داده و پشتیبان ============================== */
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function mountData(el, rerender) {
  const s = S();
  el.innerHTML = `<div class="data-grid">
    <button class="btn primary big" id="bk">${icon('download', 18)} دانلود فایل پشتیبان</button>
    <label class="btn big file">${icon('arrowUp', 18)} بازیابی از فایل پشتیبان<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
    <p class="note">فایل پشتیبان فقط روی دستگاه خودت ذخیره می‌شود. هر چند وقت یک بار آن را جای امنی (فلش، ایمیل به خودت) نگه دار؛ اگر داده‌های مرورگر پاک شود، فقط همین فایل نجاتت می‌دهد.</p>
    <h3 class="sub">خروجی گرفتن (برای حسابداری، چاپ یا تقویم)</h3><div id="exp"></div>
    <h3 class="sub">بررسی سلامت داده</h3><button class="btn" id="hc">اجرای بررسی</button><div id="hcres"></div>
    <h3 class="sub">پشتیبان‌های خودکار داخل برنامه</h3><div id="auto" class="faint">در حال خواندن…</div>
    <h3 class="sub">گزارش تغییرات</h3><details class="glass glass-flat audit"><summary>نمایش ۵۰ مورد آخر</summary><ul>${s.audit.slice(0, 50).map(a => `<li><span class="faint num">${new Date(a.at).toLocaleString('en-GB')}</span> <b>${a.action}</b> ${a.detail || ''}</li>`).join('') || '<li class="faint">خالی</li>'}</ul></details>
    <h3 class="sub">حالت نمایشی و پاک‌سازی</h3>
    <div class="data-grid"><button class="btn" id="demo">${icon('sparkle', 16)} ورود به حالت نمایشی</button><button class="btn danger" id="wipe">پاک‌کردن همه‌ی داده‌ها</button></div>`;

  mountExports(el.querySelector('#exp'));
  el.querySelector('#bk').onclick = () => { download(backupFileName(), JSON.stringify(buildBackup(S(), getPrefs()), null, 1)); localStorage.setItem('fm.lastBackup', String(Date.now())); toast('فایل پشتیبان دانلود شد'); };

  el.querySelector('#imp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const r = parseBackup(await f.text());
    if (!r.ok) return alertDialog('فایل پذیرفته نشد', r.error);
    const sm = r.summary;
    const warn = r.issues.length ? `<p class="w err">${r.issues.length} ناسازگاری در داده‌ها پیدا شد (بعد از بازیابی در «بررسی سلامت» ببین).</p>` : '';
    const ok = await confirmDialog({ title: 'بازیابی از پشتیبان', confirmText: 'جایگزین کن', danger: true,
      message: `<p>این فایل شامل <b class="num">${sm.txs}</b> تراکنش${sm.from ? ` از ${dateText(sm.from, getPrefs().calendar)} تا ${dateText(sm.to, getPrefs().calendar)}` : ''} و مجموع دارایی <b class="num">${money(sm.total, getPrefs().unit)}</b> است.</p><p>داده‌های فعلی جایگزین می‌شوند؛ قبلش خودکار یک پشتیبان از وضعیت فعلی گرفته می‌شود.</p>${warn}` });
    if (!ok) return;
    await store.replaceState(r.state, 'import');
    if (r.prefs) setPrefs(r.prefs);
    toast('بازیابی انجام شد'); rerender();
  };

  el.querySelector('#hc').onclick = () => {
    const is = healthCheck(S()), box = el.querySelector('#hcres');
    box.innerHTML = is.length ? `<ul class="hc">${is.map(i => `<li class="${i.level}">${i.text}</li>`).join('')}</ul>` : `<p class="ok-line">${icon('check', 16)} همه‌چیز سالم است؛ مجموع تقسیم‌ها و موجودی‌ها با تراکنش‌ها می‌خواند.</p>`;
  };

  store.listBackups().then(list => {
    const box = el.querySelector('#auto');
    box.innerHTML = list.length ? `<ul class="tx-list">${list.map((b, i) => `<li class="tx"><span class="tx-main"><b class="num">${new Date(b.at).toLocaleString('en-GB')}</b><span class="faint">${b.state.txs.length} تراکنش</span></span><button class="btn sm" data-rb="${i}">بازگردانی</button></li>`).join('')}</ul>` : 'هنوز پشتیبانی گرفته نشده (قبل از هر بازیابی/پاک‌سازی خودکار گرفته می‌شود).';
    box.querySelectorAll('[data-rb]').forEach(b => b.onclick = async () => {
      if (await confirmDialog({ title: 'بازگردانی پشتیبان', message: 'داده‌های فعلی با این نسخه جایگزین می‌شوند (قبلش یک پشتیبان تازه گرفته می‌شود).', confirmText: 'بازگردانی', danger: true })) { await store.replaceState(list[+b.dataset.rb].state, 'restore-auto'); toast('بازگردانی شد'); rerender(); }
    });
  });
  store.rollingBackup(false);

  el.querySelector('#demo').onclick = async () => {
    if (S().txs.length && !(await confirmDialog({ title: 'حالت نمایشی', message: 'داده‌های فعلی با داده‌ی نمونه جایگزین می‌شوند. (قبلش پشتیبان خودکار گرفته می‌شود و می‌توانی برگردانی.)', confirmText: 'ادامه', danger: true }))) return;
    await store.enterDemo(); toast('حالت نمایشی فعال شد'); rerender();
  };
  el.querySelector('#wipe').onclick = async () => {
    if (await confirmDialog({ title: 'پاک‌کردن همه‌ی داده‌ها', message: 'همه‌ی تراکنش‌ها و مدل‌ها پاک می‌شوند. (یک پشتیبان خودکار گرفته می‌شود.)', confirmText: 'پاک کن', danger: true, typeToConfirm: 'پاک شود' })) { await store.resetAll(); toast('همه‌چیز پاک شد'); rerender(); }
  };
}
