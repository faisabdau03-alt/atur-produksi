/**
 * SVG Vector Icons Module - Modern Industrial & Clean Warehouse Style
 * Standard 24x24 viewport, 1.8px stroke, scalable and monochrome.
 */

function svg(paths, className = 'icon-svg', size = 18) {
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export const Icons = {
  // Navigation & Core Sections
  dashboard: (cls, sz) => svg(`<rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/>`, cls, sz),
  inventory: (cls, sz) => svg(`<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>`, cls, sz),
  cash: (cls, sz) => svg(`<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><circle cx="16" cy="14" r="1.5"/>`, cls, sz),
  products: (cls, sz) => svg(`<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`, cls, sz),
  payroll: (cls, sz) => svg(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>`, cls, sz),
  users: (cls, sz) => svg(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`, cls, sz),
  reports: (cls, sz) => svg(`<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>`, cls, sz),
  
  // Industrial Operations
  factory: (cls, sz) => svg(`<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4H2z"/><circle cx="6" cy="18" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="18" cy="18" r="1"/>`, cls, sz),
  truck: (cls, sz) => svg(`<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>`, cls, sz),
  box: (cls, sz) => svg(`<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>`, cls, sz),
  pallet: (cls, sz) => svg(`<rect width="20" height="12" x="2" y="6" rx="1.5"/><line x1="2" x2="22" y1="14" y2="14"/><line x1="6" x2="6" y1="18" y2="21"/><line x1="12" x2="12" y1="18" y2="21"/><line x1="18" x2="18" y1="18" y2="21"/>`, cls, sz),
  wrench: (cls, sz) => svg(`<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`, cls, sz),

  // Actions
  plus: (cls, sz) => svg(`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`, cls, sz),
  edit: (cls, sz) => svg(`<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>`, cls, sz),
  trash: (cls, sz) => svg(`<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>`, cls, sz),
  close: (cls, sz) => svg(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`, cls, sz),
  check: (cls, sz) => svg(`<polyline points="20 6 9 17 4 12"/>`, cls, sz),
  checkCircle: (cls, sz) => svg(`<circle cx="12" cy="12" r="10"/><polyline points="16 9 10 15 8 13"/>`, cls, sz),
  search: (cls, sz) => svg(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`, cls, sz),
  printer: (cls, sz) => svg(`<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>`, cls, sz),
  download: (cls, sz) => svg(`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`, cls, sz),
  copy: (cls, sz) => svg(`<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`, cls, sz),
  logout: (cls, sz) => svg(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`, cls, sz),
  clipboard: (cls, sz) => svg(`<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`, cls, sz),
  receipt: (cls, sz) => svg(`<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h6"/>`, cls, sz),

  // Trends & Movement Directions
  arrowIn: (cls, sz) => svg(`<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>`, cls, sz),
  arrowOut: (cls, sz) => svg(`<line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/>`, cls, sz),
  arrowRight: (cls, sz) => svg(`<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`, cls, sz),
  trendingUp: (cls, sz) => svg(`<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`, cls, sz),
  trendingDown: (cls, sz) => svg(`<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>`, cls, sz),
  zap: (cls, sz) => svg(`<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`, cls, sz),
  
  // Status, Security & Utility
  calendar: (cls, sz) => svg(`<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>`, cls, sz),
  clock: (cls, sz) => svg(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`, cls, sz),
  shield: (cls, sz) => svg(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`, cls, sz),
  lock: (cls, sz) => svg(`<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`, cls, sz),
  user: (cls, sz) => svg(`<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`, cls, sz),
  menu: (cls, sz) => svg(`<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>`, cls, sz),
  database: (cls, sz) => svg(`<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`, cls, sz),
  filter: (cls, sz) => svg(`<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`, cls, sz),
  eye: (cls, sz) => svg(`<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`, cls, sz),
  alertCircle: (cls, sz) => svg(`<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`, cls, sz),
  info: (cls, sz) => svg(`<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`, cls, sz),
};

export function renderIcon(name, cls = 'icon-svg', sz = 18) {
  if (typeof Icons[name] === 'function') {
    return Icons[name](cls, sz);
  }
  return '';
}
