// آیکون‌های خطی ۲۴×۲۴ (stroke) — دست‌ساز و بدون وابستگی
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  sparkle: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 18.5V5.5"/><path d="M8.5 7.5h7"/>',
  coins: '<ellipse cx="9" cy="7" rx="5.5" ry="3"/><path d="M3.5 7v4c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3V7"/><path d="M14.5 10.5c3 0 6 1 6 2.5v4c0 1.7-2.5 3-5.5 3-2.2 0-4-.6-5-1.6"/><path d="M3.5 11v4c0 1.7 2.5 3 5.5 3"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8"/><path d="M6.2 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.3 3.8-.8"/><path d="M10 10a3 3 0 0 0 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  swap: '<path d="M4 8h14l-3.5-3.5"/><path d="M20 16H6l3.5 3.5"/>',
  arrowDown: '<path d="M12 4v15"/><path d="M6 13l6 6 6-6"/>',
  arrowUp: '<path d="M12 20V5"/><path d="M6 11l6-6 6 6"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4"/><path d="M12 7.5V12l3 2"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  more: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.5-1-2.7 0-1 .8-1.6 1.8-1.6h2.2a3.2 3.2 0 0 0 3.2-3.2C20 7 16.4 3.5 12 3.5z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.8" r="1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 15l3.5-4 3 2.5L19 7.5"/>',
  tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.3 7.3a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.3-7.3a1 1 0 0 1-.3-.7z"/><circle cx="8" cy="8" r="1.4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M15 6l-6 6 6 6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3.5" y="7.5" width="17" height="12" rx="3"/><circle cx="16.5" cy="13.5" r="1.1"/>',
  bank: '<path d="M3.5 9.5 12 4l8.5 5.5z"/><path d="M5.5 11v6M10 11v6M14 11v6M18.5 11v6"/><path d="M3.5 20h17"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3.5 9h17v3.5h-17z"/><path d="M12 9v11"/><path d="M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9zm0 0c1.5-3 5-3.5 5-1.5S14 9 12 9z"/>',
  car: '<path d="M5 15.5V12l1.8-4.5A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.5L19 12v3.5"/><path d="M3.5 12h17v5a1 1 0 0 1-1 1H18v-1.5H6V18H4.5a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="14.5" r=".8"/><circle cx="16.5" cy="14.5" r=".8"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  star: '<path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z"/>',
  bolt: '<path d="M13 3L5.5 13.5H11L10 21l7.5-10.5H12z"/>',
  gamepad: '<rect x="3" y="7.5" width="18" height="10" rx="5"/><path d="M8 10.5v4M6 12.5h4"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="17.5" cy="13.5" r=".9"/>',
  cart: '<path d="M3.5 4.5h2.2l2 10h9.6l2-7.5H7"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/>',
  coffee: '<path d="M5 8.5h11v6a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5z"/><path d="M16 10h1.5a2.2 2.2 0 0 1 0 4.4H16"/><path d="M8 3.5v2M12 3.5v2"/>',
  plane: '<path d="M21 4.5 3.5 11l6 2.3L12 20l2.3-5.5z"/><path d="M9.5 13.3 21 4.5"/>',
  shield: '<path d="M12 3.5l7.5 3v5.5c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6.5z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  rocket: '<path d="M14 4.5c3.5-.5 5.5 1.5 5.5 5.5-1.5 3.5-4 6-7.5 7.5l-5-5C8.5 8.5 11 6 14 4.5z"/><circle cx="14.5" cy="9.5" r="1.4"/><path d="M7.5 13.5l-3 .5 1-3.5M10.5 16.5l-.5 3 3.5-1"/>',
  trophy: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H4.5c0 3 1 4.5 3 5M16.5 6h3c0 3-1 4.5-3 5"/><path d="M12 13.5V17M8.5 20.5h7M9.5 17h5"/>',
  download: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.2"/>',
};
export const ICON_NAMES = Object.keys(P);
/** آیکون‌هایی که کاربر می‌تواند برای صندوق انتخاب کند */
export const PICKABLE = ['home','sparkle','book','coins','lock','wallet','bank','gift','car','heart','star','bolt','gamepad','cart','coffee','plane','shield','rocket','trophy','tag'];

export function icon(name, size = 22, extra = '') {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name] || P.coins}</svg>`;
}
