// دیالوگ‌ها: شیت پایین (موبایل) / پنجره‌ی وسط (دسکتاپ)، تأیید، هشدار
import { icon } from './icons.js';

let stack = [];

export function openSheet({ title, body = '', wide = false, onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="backdrop"></div><section class="sheet glass ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${title || ''}" tabindex="-1">
    <header class="sheet-head"><span class="grab" aria-hidden="true"></span><h2>${title || ''}</h2><button class="icon-btn" data-close aria-label="بستن">${icon('close', 20)}</button></header>
    <div class="sheet-body"></div></section>`;
  const bodyEl = wrap.querySelector('.sheet-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.append(body);
  document.body.append(wrap);
  document.documentElement.classList.add('modal-open');
  const prevFocus = document.activeElement;
  const sheet = wrap.querySelector('.sheet');
  requestAnimationFrame(() => { wrap.classList.add('on'); (bodyEl.querySelector('[autofocus],input,button') || sheet).focus?.({ preventScroll: true }); });

  const api = {
    el: wrap, body: bodyEl,
    close(result) {
      if (api.closed) return; api.closed = true;
      wrap.classList.remove('on');
      stack = stack.filter(x => x !== api);
      if (!stack.length) document.documentElement.classList.remove('modal-open');
      setTimeout(() => wrap.remove(), 260);
      prevFocus?.focus?.({ preventScroll: true });
      onClose?.(result);
    },
  };
  wrap.querySelector('.backdrop').addEventListener('click', () => api.close());
  wrap.querySelector('[data-close]').addEventListener('click', () => api.close());
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); api.close(); }
    if (e.key === 'Tab') { // نگه‌داشتن فوکوس داخل دیالوگ
      const f = [...sheet.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  stack.push(api);
  return api;
}

/** تأیید: Promise<boolean>. typeToConfirm: متنی که کاربر باید عیناً تایپ کند */
export function confirmDialog({ title, message = '', confirmText = 'تأیید', cancelText = 'انصراف', danger = false, typeToConfirm = '' }) {
  return new Promise(resolve => {
    const body = `<div class="confirm"><div class="c-msg">${message}</div>
      ${typeToConfirm ? `<label class="field"><span>برای ادامه این جمله را عیناً بنویس:<br><b>${typeToConfirm}</b></span><input type="text" id="cc" autocomplete="off" autofocus></label>` : ''}
      <div class="c-actions"><button class="btn" data-no>${cancelText}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes ${typeToConfirm ? 'disabled' : ''}>${confirmText}</button></div></div>`;
    let done = false;
    const m = openSheet({ title, body, onClose: () => { if (!done) { done = true; resolve(false); } } });
    const yes = m.body.querySelector('[data-yes]');
    m.body.querySelector('[data-no]').onclick = () => m.close();
    if (typeToConfirm) m.body.querySelector('#cc').oninput = e => { yes.disabled = e.target.value.trim() !== typeToConfirm; };
    yes.onclick = () => { done = true; resolve(true); m.close(); };
  });
}

export const alertDialog = (title, message, okText = 'باشه') => new Promise(resolve => {
  const m = openSheet({ title, body: `<div class="confirm"><div class="c-msg">${message}</div><div class="c-actions"><button class="btn primary" data-ok autofocus>${okText}</button></div></div>`, onClose: () => resolve() });
  m.body.querySelector('[data-ok]').onclick = () => m.close();
});
