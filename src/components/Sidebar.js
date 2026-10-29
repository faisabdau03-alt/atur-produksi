import { escapeHtml } from '../utils/sanitize.js';
import { userDisplayId } from '../store/state.js';
import { Icons } from './Icons.js';

export function navItem(page, iconSvg, label, currentPage) {
  const isActive = currentPage === page;
  return `
    <button class="nav-link ${isActive ? 'is-active' : ''}" data-page="${page}">
      ${iconSvg}
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

export function renderSidebar(state) {
  return `
    <aside class="sidebar" id="app-sidebar">
      <div class="sidebar-header">
        <a class="brand-wrapper" href="#" data-page="dashboard" title="Jaya Wijaya ERP">
          <div class="brand-mark">
            ${Icons.factory('icon-svg', 20)}
          </div>
          <div class="brand-info">
            <span class="brand-title">JAYA WIJAYA</span>
            <span class="brand-subtitle">Workshop & Warehouse</span>
          </div>
        </a>
        <div class="connection-status-pill">
          <span class="pulse-dot"></span>
          <span>${state.mysqlAvailable ? 'MySQL XAMPP Live' : 'Database Offline'}</span>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Navigasi Utama">
        <div class="nav-label">Ringkasan</div>
        ${navItem('dashboard', Icons.dashboard('icon-svg', 17), 'Dashboard', state.page)}

        <div class="nav-label">Operasional Pabrik</div>
        ${navItem('inventory', Icons.inventory('icon-svg', 17), 'Persediaan Stok', state.page)}
        ${navItem('cash', Icons.cash('icon-svg', 17), 'Buku Kas', state.page)}
        ${navItem('products', Icons.products('icon-svg', 17), 'Katalog Produk', state.page)}

        ${state.isAdmin ? `
          <div class="nav-label">Manajemen SDM & Akses</div>
          ${navItem('payroll', Icons.payroll('icon-svg', 17), 'Absensi & Upah', state.page)}
          ${navItem('users', Icons.users('icon-svg', 17), 'Kelola Pengguna', state.page)}
        ` : ''}

        <div class="nav-label">Laporan Bisnis</div>
        ${navItem('reports', Icons.reports('icon-svg', 17), 'Laporan Keuangan', state.page)}
      </nav>

      <div class="sidebar-footer">
        <button class="signout-btn" data-action="signout" title="Keluar dari sesi sistem">
          ${Icons.logout('icon-svg', 15)}
          <span>Keluar (${escapeHtml(userDisplayId())})</span>
        </button>
      </div>
    </aside>
  `;
}
