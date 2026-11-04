// صفحه‌ی واریزی جدید: مبلغ ← انتخاب مدل ← پیش‌نمایش تقسیم ← تأیید
import { icon } from './icons.js';
import { amountField, dateField, tagField, textField, chipSelect } from './fields.js';
import { confirmDialog } from './modal.js';
import { confetti, haptic } from './effects.js';
import { toast } from './shell.js';
import { txGroups, bindTxClicks } from './txlist.js';
import { money, unitLabel } from '../core/format.js';
import { getPrefs } from '../core/prefs.js';
import { getState, addDeposit } from '../data/store.js';
import { splitDeposit, validateModel, tagUsage, isMonthClosed, filterTxs } from '../core/ledger.js';

export function renderDeposit(root, { onGoModels } = {}) {
  const p = getPrefs(), s = getState(), hide = p.hideBalances;
  let modelId = s.settings.activeModelId;
  const model = () => s.models.find(m => m.id === modelId) || s.models[0];

  const amt = amountField({ unit: p.unit, label: 'مبلغ درآمد', onInput: () => drawPreview() });
  const models = chipSelect({ label: 'مدل تقسیم', value: modelId, onChange: id => { modelId = id; drawPreview(); },
    items: s.models.map(m => ({ id: m.id, label: m.name, sub: Object.values(m.split).join(' / ') })) });
  const date = dateField({ calendar: p.calendar });
  const title = textField({ label: 'عنوان', placeholder: 'مثلاً حقوق مهر' });
  const source = textField({ label: 'منبع', placeholder: 'مثلاً کار پروژه‌ای' });
  const tags = tagField({ usage: tagUsage(s), colors: s.tags });
  const note = textField({ label: 'یادداشت', area: true });

  const wrap = document.createElement('div');
  wrap.className = 'deposit-page';
  wrap.innerHTML = `<section class="glass pad dep-main"></section><section class="glass pad dep-prev"><h2 class="sec in">پیش‌نمایش تقسیم</h2><div id="prev"></div><div class="warnbox" id="pw"></div></section>`;
  const main = wrap.querySelector('.dep-main');
  const form = document.createElement('form'); form.className = 'form'; form.noValidate = true;
  form.append(amt.el, models.el, date.el, title.el, source.el, tags.el, note.el);
  form.insertAdjacentHTML('beforeend', `<div class="c-actions"><button class="btn primary big" type="submit">${icon('check', 20)} بررسی و ثبت واریزی</button></div>`);
  main.append(form);
  const prevEl = wrap.querySelector('#prev'), pw = wrap.querySelector('#pw');

  function drawPreview() {
    const m = model(), a = amt.value();
    const v = validateModel(m.split, s.buckets);
    const sp = a && v.ok ? splitDeposit(a, m, s.buckets) : null;
    prevEl.innerHTML = `<ul class="split big">${s.buckets.map(b => {
      const pc = m.split[b.id] || 0;
      return `<li style="--bc:${b.color}"><span class="bubble sm">${icon(b.icon, 16)}</span><div class="sp-main"><div class="sp-top"><b>${b.name}</b><span class="faint num">${pc}%</span></div>
        <div class="pbar"><i style="width:${pc}%"></i></div></div><b class="num sp-amt">${sp ? (hide ? '•••' : money(sp.split[b.id], p.unit)) : '—'}</b></li>`;
    }).join('')}</ul>${a ? `<div class="sp-total"><span>جمع</span><b class="num">${money(a, p.unit)} ${unitLabel(p.unit)}</b></div>` : '<p class="note">مبلغ را وارد کن تا تقسیم را ببینی.</p>'}`;
    pw.innerHTML = [...v.errors.map(e => `<p class="w err">${e}</p>`), ...v.warnings.map(e => `<p class="w">${icon('info', 14)} ${e}</p>`)].join('');
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const a = amt.value(); if (!a) { amt.focus(); return toast('مبلغ را درست وارد کن'); }
    const m = model(), v = validateModel(m.split, s.buckets);
    if (!v.ok) return toast(v.errors[0]);
    const iso = date.value();
    if (isMonthClosed(s, iso, p.calendar) && !(await confirmDialog({ title: 'ماه بسته‌شده', message: 'این تاریخ در یک ماه بسته‌شده است. مطمئنی؟', confirmText: 'بله، ادامه' }))) return;
    const sp = splitDeposit(a, m, s.buckets);
    const rows = s.buckets.map(b => `<li style="--bc:${b.color}"><i></i><span>${b.name}</span><span class="faint num">${m.split[b.id]}%</span><b class="num">${money(sp.split[b.id], p.unit)}</b></li>`).join('');
    const ok = await confirmDialog({ title: 'تأیید واریزی', confirmText: 'تأیید و ثبت',
      message: `<p>مبلغ <b class="num">${money(a, p.unit)}</b> ${unitLabel(p.unit)} با مدل «${m.name}» این‌طور تقسیم می‌شود:</p><ul class="split">${rows}</ul>` });
    if (!ok) return;
    addDeposit({ amount: a, date: iso, title: title.value(), source: source.value(), note: note.value(), tags: tags.value(), modelId: m.id });
    haptic(20); confetti(); toast('واریزی ثبت شد و بین صندوق‌ها تقسیم شد');
    renderDeposit(root, { onGoModels });
  };

  const recent = filterTxs(s, { type: 'deposit' }).slice(0, 5);
  root.innerHTML = '';
  root.append(wrap);
  if (recent.length) { const r = document.createElement('section'); r.className = 'glass pad'; r.innerHTML = `<h2 class="sec in">واریزی‌های اخیر</h2>${txGroups(recent, hide)}`; root.append(r); bindTxClicks(r); }
  drawPreview();
  setTimeout(() => amt.focus(), 150);
}
