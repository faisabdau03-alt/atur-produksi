import { escapeHtml } from '../utils/sanitize.js';
import { userDisplayId } from '../store/state.js';
import { Icons } from './Icons.js';

export function renderTopbar(state) {

  return `
    <header class="main-header">
      <!-- Logo -->
      <a href="#" class="logo" data-page="dashboard" title="Jaya Wijaya ERP">
        <span class="logo-mini"><img src="/images/logo-jaya-wijaya.png" alt="JW" style="width:28px; height:28px; border-radius:50%; vertical-align:middle; object-fit:cover;" onerror="this.onerror=null; this.src='/images/logo-jaya-wijaya.jpg';" /></span>
        <span class="logo-lg" style="display:inline-flex; align-items:center; gap:8px;">
          <img src="/images/logo-jaya-wijaya.png" alt="Logo" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(255,255,255,0.7); box-shadow:0 1px 3px rgba(0,0,0,0.2);" onerror="this.onerror=null; this.src='/images/logo-jaya-wijaya.jpg';" />
          <span><b>Jaya</b>Wijaya</span>
        </span>
      </a>

      <!-- Navbar -->
      <nav class="navbar" role="navigation">
        <!-- Sidebar Toggle -->
        <button type="button" class="sidebar-toggle" id="mobile-menu-toggle" aria-label="Toggle Navigation">
          ${Icons.menu('icon-svg', 18)}
        </button>

        <!-- Navbar Right Menu -->
        <div class="navbar-custom-menu">

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
