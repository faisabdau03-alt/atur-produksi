import { escapeHtml } from '../../utils/sanitize.js';
import { Icons } from '../../components/Icons.js';

export function renderLoginCard(message = '', state = {}) {
  const isMysql = Boolean(state.mysqlAvailable);

  return `
    <section class="auth-card">
      <div class="auth-card-header">
        <div class="auth-logo-box">
          <img src="/images/logo-jaya-wijaya.png" alt="Jaya Wijaya" class="auth-logo-img" />
        </div>
        <h1 class="auth-brand-name">JAYA WIJAYA</h1>
        <div class="auth-brand-badge">PRODUKSI • DISTRIBUSI • GROSIR</div>
        <p class="auth-portal-title">Sistem Kontrol Pabrik, Inventaris & Keuangan</p>
      </div>

      <div class="auth-card-body">
        <!-- Status Koneksi Database -->
        <div class="auth-db-status ${isMysql ? 'is-connected' : 'is-offline'}">
          <span class="auth-db-dot"></span>
          <div class="auth-db-text">
            <strong>${isMysql ? 'MySQL Aktif (Database jaya_wijaya)' : 'MySQL 127.0.0.1:3306 Offline'}</strong>
            <span>${isMysql ? 'Tersinkronisasi otomatis ke localhost phpMyAdmin.' : 'Penyimpanan aman lokal aktif. Nyalakan XAMPP untuk sync penuh.'}</span>
          </div>
        </div>

        <!-- Alert Error Jika Ada -->
        ${message ? `
        <div class="auth-error-alert" role="alert">
          ${Icons.alertCircle('icon-svg', 16)}
          <span>${escapeHtml(message)}</span>
        </div>` : ''}

        <!-- Form Login -->
        <form id="login-form" class="auth-form">
          <div class="auth-field">
            <label class="auth-label" for="input-userId">ID Pengguna / Username</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">${Icons.user('icon-svg', 16)}</span>
              <input class="auth-input" id="input-userId" name="userId" type="text" autocomplete="username" placeholder="Masukkan ID (contoh: admin)" required autofocus />
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-label" for="input-password">Kata Sandi</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">${Icons.lock('icon-svg', 16)}</span>
              <input class="auth-input" id="input-password" name="password" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" required />
              <button type="button" class="auth-toggle-pw" id="btn-toggle-password" aria-label="Tampilkan kata sandi">
                ${Icons.eye('icon-svg', 16)}
              </button>
            </div>
          </div>

          <div class="auth-aux-row">
            <label class="auth-checkbox-label">
              <input type="checkbox" id="remember-me" checked />
              <span>Ingat sesi masuk</span>
            </label>
            <span class="auth-port-tag">Port 3306</span>
          </div>

          <button class="auth-submit-btn" type="submit">
            <span>Masuk ke Panel Kontrol</span>
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <!-- Informasi Akses Resmi / Tombol Isi Cepat -->
        <div class="auth-accounts-box">
          <div class="auth-accounts-header">
            ${Icons.shield('icon-svg', 13)}
            <span>Akses Resmi Sistem</span>
          </div>
          <div class="auth-accounts-grid">
            <button type="button" class="auth-quick-fill-btn" data-user="admin" data-pw="admin123" title="Klik untuk langsung mengisi akun Pimpinan Admin">
              <span class="auth-role-tag role-admin">Admin</span>
              <span>Username: <code>admin</code> | Sandi: <code>admin123</code></span>
            </button>
            <button type="button" class="auth-quick-fill-btn" data-user="mandor" data-pw="mandor123" title="Klik untuk langsung mengisi akun Mandor Gudang">
              <span class="auth-role-tag role-mandor">Mandor</span>
              <span>Username: <code>mandor</code> | Sandi: <code>mandor123</code></span>
            </button>
          </div>
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

  // Quick fill handler
  const quickButtons = document.querySelectorAll('.auth-quick-fill-btn');
  quickButtons.forEach((btn) => {
    btn.onclick = () => {
      const userInput = document.querySelector('#input-userId');
      const passInput = document.querySelector('#input-password');
      if (userInput && passInput) {
        userInput.value = btn.dataset.user || '';
        passInput.value = btn.dataset.pw || '';
        passInput.focus();
      }
    };
  });

  const togglePwBtn = document.querySelector('#btn-toggle-password');
  if (togglePwBtn) {
    togglePwBtn.onclick = (e) => {
      e.preventDefault();
      const pwInput = document.querySelector('#input-password');
      if (!pwInput) return;
      const isPw = pwInput.type === 'password';
      pwInput.type = isPw ? 'text' : 'password';
      togglePwBtn.setAttribute('aria-label', isPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      togglePwBtn.innerHTML = isPw ? Icons.eye('icon-svg', 16) : Icons.lock('icon-svg', 16);
    };
  }
}

export const renderLoginView = (state, message = '') => renderAuthLayout(message, state);
export const attachLoginHandlers = bindAuthEvents;
