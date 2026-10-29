import { escapeHtml } from '../utils/sanitize.js';
import { userDisplayId } from '../store/state.js';

export function navItem(page, icon, label, currentPage) {
  return `<button class="nav-link ${currentPage === page ? 'active' : ''}" data-page="${page}">
    <span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>
  </button>`;
}

export function renderSidebar(state) {
  return `
    <aside class="sidebar" id="sidebar">
      <a class="brand brand-jaya-wijaya" href="#" data-page="dashboard" title="Jaya Wijaya — Produksi • Distribusi • Grosir">
        <img src="/images/logo-jaya-wijaya.png" alt="Logo Jaya Wijaya Wooden Cleaning Tools" class="sidebar-logo-img" />
        <div class="sidebar-brand-text">
          <span class="sidebar-brand-title">JAYA WIJAYA</span>
          <span class="sidebar-brand-sub">PRODUKSI • DISTRIBUSI • GROSIR</span>
        </div>
      </a>
      <div class="workspace-label">RUANG KERJA</div>
      <nav class="main-nav" aria-label="Navigasi utama">
        ${navItem('dashboard', '◫', 'Ringkasan', state.page)}
        <div class="nav-section-label">OPERASIONAL</div>
        ${navItem('inventory', '▦', 'Persediaan', state.page)}
        ${navItem('cash', '↗', 'Keuangan', state.page)}
        ${navItem('products', '◇', 'Produk', state.page)}
        ${state.isAdmin ? `<div class="nav-section-label">MANAJEMEN</div>${navItem('payroll', '◎', 'Absensi & gaji', state.page)}${navItem('users', '👥', 'Kelola Pengguna', state.page)}` : ''}
        ${navItem('reports', '▤', 'Laporan', state.page)}
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note" style="${state.mysqlAvailable ? 'background: #f0fdf4; border-color: #86efac;' : 'background: #fefce8; border-color: #fde047;'} margin-bottom: 8px;">
          <span class="status-dot" style="${state.mysqlAvailable ? 'background: #16a34a; box-shadow: 0 0 0 3px #dcfce7;' : 'background: #ca8a04; box-shadow: 0 0 0 3px #fef08a;'}"></span>
          <span><strong>${state.mysqlAvailable ? 'MySQL XAMPP (Live)' : 'Mode Server Lokal'}</strong><br /><small style="${state.mysqlAvailable ? 'color: #166534;' : 'color: #854d0e;'}">${state.mysqlAvailable ? 'Database: jaya_wijaya' : 'MySQL 3306 Offline'}</small></span>
        </div>
        <button class="profile-button" id="sign-out">
          <span class="avatar">${escapeHtml((userDisplayId() || 'A').slice(0, 1).toUpperCase())}</span>
          <span class="profile-copy"><strong>${escapeHtml(userDisplayId())}</strong><small>${state.isAdmin ? 'Administrator' : 'Anggota tim'}</small></span>
          <span class="signout-icon" aria-label="Keluar">↪</span>
        </button>
      </div>
    </aside>
  `;
}
