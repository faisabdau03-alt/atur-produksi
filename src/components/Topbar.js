import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, localDate } from '../utils/formatters.js';
import { userDisplayId } from '../store/state.js';
import { Icons } from './Icons.js';

export function renderTopbar(state, pageCrumb = 'Ringkasan') {
  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="mobile-menu-btn" id="mobile-menu-toggle" aria-label="Buka Menu">
          ${Icons.menu('icon-svg', 18)}
        </button>
        <div class="breadcrumb">
          <span class="breadcrumb-root">Jaya Wijaya</span>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current" id="page-crumb">${pageCrumb}</span>
        </div>
      </div>
      <div class="topbar-right">
        <div class="user-badge">
          ${Icons.user('icon-svg', 15)}
          <strong>${escapeHtml(userDisplayId())}</strong>
          <span class="user-badge-role ${state.isAdmin ? 'admin' : ''}">
            ${state.isAdmin ? 'Administrator' : 'Mandor / Operator'}
          </span>
        </div>
      </div>
    </header>
  `;
}
