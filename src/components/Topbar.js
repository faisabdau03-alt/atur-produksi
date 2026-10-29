import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, localDate } from '../utils/formatters.js';
import { userDisplayId } from '../store/state.js';

export function renderTopbar(state, pageCrumb = 'Ringkasan') {
  return `
    <header class="topbar">
      <button class="mobile-menu" id="menu-toggle" aria-label="Buka navigasi">☰</button>
      <div class="breadcrumb">
        <span>Ruang kerja</span><span class="breadcrumb-separator">/</span>
        <strong id="page-crumb">${pageCrumb}</strong>
        <span class="status-pill status-present" style="${state.mysqlAvailable ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'} font-size: 11px; font-weight: 600; padding: 2px 8px; margin-left: 6px; border-radius: 999px;">
          ${state.mysqlAvailable ? 'MySQL: jaya_wijaya' : 'Lokal Aman'}
        </span>
      </div>
      <div class="topbar-right">
        <span class="today-label">${formatDate(localDate)}</span>
        <span class="topbar-divider"></span>
        <span class="topbar-avatar">${escapeHtml((userDisplayId() || 'A').slice(0, 1).toUpperCase())}</span>
      </div>
    </header>
  `;
}
