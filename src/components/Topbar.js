import { escapeHtml } from '../utils/sanitize.js';
import { userDisplayId } from '../store/state.js';
import { Icons } from './Icons.js';

export function renderTopbar(state) {
  const isOnline = Boolean(state.mysqlAvailable);

  return `
    <header class="main-header">
      <!-- Logo -->
      <a href="#" class="logo" data-page="dashboard" title="Jaya Wijaya ERP">
        <span class="logo-mini"><b>J</b>W</span>
        <span class="logo-lg"><b>Jaya</b>Wijaya</span>
      </a>

      <!-- Navbar -->
      <nav class="navbar" role="navigation">
        <!-- Sidebar Toggle -->
        <button type="button" class="sidebar-toggle" id="mobile-menu-toggle" aria-label="Toggle Navigation">
          ${Icons.menu('icon-svg', 18)}
        </button>

        <!-- Navbar Right Menu -->
        <div class="navbar-custom-menu">
          <!-- Database status -->
          <div class="db-status-badge ${isOnline ? '' : 'offline'}" title="${isOnline ? 'Sistem Cloud Jaya Wijaya Terhubung & Aktif' : 'Koneksi Terputus / Mode Offline'}">
            <span class="dot"></span>
            <span>${isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <!-- User info -->
          <div class="user-nav-item">
            <div class="user-nav-avatar">${state.isAdmin ? 'A' : 'M'}</div>
            <span>${escapeHtml(userDisplayId())} (${state.isAdmin ? 'Administrator' : 'Mandor'})</span>
          </div>

          <!-- Logout button -->
          <button type="button" class="btn-topbar-logout" data-action="signout" title="Keluar dari sistem">
            ${Icons.logout('icon-svg', 13)} LOGOUT
          </button>
        </div>
      </nav>
    </header>
  `;
}
