import { escapeHtml } from '../../utils/sanitize.js';

export function renderAuthBrandHeader() {
  return `
    <div class="auth-center-brand">
      <div class="auth-center-logo-box">
        <img src="/images/logo-jaya-wijaya.png" alt="Logo Jaya Wijaya Wooden Cleaning Tools" class="auth-center-logo-img" />
      </div>
      <div class="auth-center-brand-name">JAYA WIJAYA</div>
      <div class="auth-center-brand-badge">PRODUKSI • DISTRIBUSI • GROSIR</div>
      <p class="auth-center-brand-slogan">“Produksi Berkualitas, Harga Bersahabat, Mitra Terpercaya.”</p>
    </div>`;
}

export function renderLoginCard(message = '', state = {}) {
  const isMysql = Boolean(state.mysqlAvailable);
  return `
    <section class="auth-card-centered">
      ${renderAuthBrandHeader()}

      <div class="auth-center-header">
        <h1 class="auth-center-title">Portal Masuk Panel Admin</h1>
        <p class="auth-center-desc">Sistem Manajemen Produksi, Inventaris Kayu, Kas Keuangan, dan Penggajian</p>
      </div>

      <!-- Status Indikator Sistem Database -->
      <div class="auth-status-compact ${isMysql ? 'is-connected' : ''}" style="${isMysql ? 'background:#f0fdf4; border:1.5px solid #86efac;' : 'background:#fefce8; border:1.5px solid #fde047;'}">
        <span class="status-pulse-dot" style="${isMysql ? 'background:#16a34a;' : 'background:#ca8a04;'}"></span>
        <div class="status-compact-text">
          <strong style="${isMysql ? 'color:#14532d;' : 'color:#854d0e;'}">
            ${isMysql ? 'Server Database MySQL: Terhubung (jaya_wijaya)' : 'Server MySQL 127.0.0.1:3306 Offline'}
          </strong>
          <span style="${isMysql ? 'color:#166534;' : 'color:#a16207;'}">
            ${isMysql ? 'Data transaksi riil langsung tersinkronisasi ke MySQL phpMyAdmin.' : 'Penyimpanan lokal aman aktif. Nyalakan MySQL di XAMPP Control Panel untuk koneksi penuh.'}
          </span>
        </div>
      </div>

      <!-- Error Alert if any -->
      ${message ? `
      <div class="auth-error-alert" role="alert" style="margin-bottom:16px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>${escapeHtml(message)}</span>
      </div>` : ''}

      <!-- Form Login Resmi -->
      <form id="login-form" class="auth-form-center">
        <div class="form-group-center">
          <label for="input-userId">ID Pengguna / Username / Email</label>
          <div class="input-with-icon">
            <span class="input-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </span>
            <input id="input-userId" name="userId" type="text" autocomplete="username" placeholder="Masukkan ID (contoh: admin)" required autofocus />
          </div>
        </div>

        <div class="form-group-center">
          <label for="input-password">Kata Sandi</label>
          <div class="input-with-icon">
            <span class="input-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </span>
            <input id="input-password" name="password" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" required />
            <button type="button" class="btn-toggle-pw" id="btn-toggle-password" aria-label="Tampilkan kata sandi">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="3" r="3"></circle></svg>
            </button>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin: 4px 0 14px; font-size: 13px; color: #4b5563;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" id="remember-me" checked style="accent-color:#145a42; cursor:pointer;" />
            <span>Ingat sesi masuk</span>
          </label>
          <span style="color:#6b7280; font-size:12px;">Port: 3306</span>
        </div>

        <button class="btn-primary-forest-center" type="submit" style="background:#145a42; font-weight:700;">
          <span>Masuk ke Panel Kontrol</span>
          <span class="btn-arrow" aria-hidden="true">→</span>
        </button>
      </form>

      <div style="margin-top:20px; padding:12px 14px; border-radius:10px; background:#f8fafc; border:1px solid #e2e8f0; font-size:12px; color:#475569; display:flex; flex-direction:column; gap:4px;">
        <div style="display:flex; align-items:center; gap:6px; font-weight:700; color:#1e293b;">
          <span>🔒</span> <span>Akses Otorisasi Resmi Jaya Wijaya</span>
        </div>
        <div>
          Kredensial Default Admin: Username <code>admin</code> | Password <code>admin123</code>
        </div>
        <div style="color:#64748b;">
          Kredensial Staf Mandor: Username <code>mandor</code> | Password <code>mandor123</code>
        </div>
      </div>
    </section>`;
}

export function renderAuthLayout(message = '', state = {}) {
  return `
    <main class="auth-page">
      ${renderLoginCard(message, state)}
    </main>`;
}

export function bindAuthEvents(handleLogin) {
  const loginForm = document.querySelector('#login-form');
  if (loginForm && handleLogin) {
    loginForm.onsubmit = handleLogin;
  }

  const togglePwBtn = document.querySelector('#btn-toggle-password');
  if (togglePwBtn) {
    togglePwBtn.onclick = (e) => {
      e.preventDefault();
      const pwInput = document.querySelector('#input-password');
      if (!pwInput) return;
      const isPw = pwInput.type === 'password';
      pwInput.type = isPw ? 'text' : 'password';
      togglePwBtn.setAttribute('aria-label', isPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      togglePwBtn.innerHTML = isPw
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="3" r="3"></circle></svg>`;
    };
  }
}

export const renderLoginView = (state, message = '') => renderAuthLayout(message, state);
export const attachLoginHandlers = bindAuthEvents;
