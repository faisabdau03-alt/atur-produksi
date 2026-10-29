import { escapeHtml } from '../utils/sanitize.js';
import { userDisplayId } from '../store/state.js';
import { Icons } from './Icons.js';

export function renderSidebar(state) {
  const currentPage = state.page || 'dashboard';

  const menu = [
    { page: 'dashboard', label: 'DASHBOARD', icon: Icons.dashboard('icon-svg', 15) },
    { page: 'products', label: 'DATA BARANG', icon: Icons.products('icon-svg', 15) },
    { page: 'inventory', label: 'PERSEDIAAN GUDANG', icon: Icons.inventory('icon-svg', 15) },
    { page: 'cash', label: 'TRANSAKSI KAS', icon: Icons.cash('icon-svg', 15) },
  ];

  if (state.isAdmin) {
    menu.push(
      { page: 'payroll', label: 'PENGGAJIAN & ABSENSI', icon: Icons.payroll('icon-svg', 15) },
      { page: 'users', label: 'DATA PENGGUNA', icon: Icons.users('icon-svg', 15) }
    );
  }

  menu.push({ page: 'reports', label: 'LAPORAN', icon: Icons.reports('icon-svg', 15) });

  return `
    <aside class="main-sidebar" id="app-sidebar">
      <div class="user-panel">
        <div class="user-panel-avatar">
          ${Icons.user('icon-svg', 22)}
        </div>
        <div class="user-panel-info">
          <p class="user-panel-name">${escapeHtml(userDisplayId())}</p>
          <span class="user-panel-status">
            <span class="dot-online"></span> Online
          </span>
        </div>
      </div>

      <ul class="sidebar-menu">
        <li class="header">MAIN NAVIGATION</li>
        ${menu.map((item) => `
          <li class="${currentPage === item.page ? 'active' : ''}">
            <a href="#" data-page="${item.page}">
              ${item.icon}
              <span>${escapeHtml(item.label)}</span>
            </a>
          </li>
        `).join('')}

        <li class="header">AKUN & SESI</li>
        <li>
          <a href="#" data-action="signout">
            ${Icons.logout('icon-svg', 15)}
            <span>LOGOUT</span>
          </a>
        </li>
      </ul>
    </aside>
  `;
}
