import { escapeHtml } from '../../utils/sanitize.js';
import { Icons } from '../../components/Icons.js';

export function renderLoginCard(message = '', state = {}) {
  const isMysql = Boolean(state.mysqlAvailable);

  return `
    <div class="login-box">
      <div class="login-logo">
        <a href="#"><b>Jaya</b>Wijaya App</a>
      </div>

      <div class="login-box-body">
        <img src="/images/logo-jaya-wijaya.png" alt="Logo Jaya Wijaya" class="login-logo-img" />
        <p class="login-box-msg">Sistem Informasi Inventaris & Produksi Gudang</p>

        <!-- Status Indikator Database -->
        <div class="db-status-badge ${isMysql ? '' : 'offline'}" style="display:flex; justify-content:center; margin-bottom:15px; background:${isMysql ? '#e8f5e9' : '#ffebee'}; color:${isMysql ? '#2e7d32' : '#c62828'}; border:1px solid ${isMysql ? '#a5d6a7' : '#ef9a9a'}; padding:6px 10px;">
          <span class="dot" style="background-color:${isMysql ? '#2e7d32' : '#c62828'};"></span>
          <span>${isMysql ? 'Database MySQL 3306 Terhubung' : 'Server MySQL Offline'}</span>
        </div>

        ${message ? `
        <div style="background:#f2dede; border:1px solid #ebccd1; color:#a94442; padding:10px; border-radius:3px; margin-bottom:15px; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${Icons.alertCircle('icon-svg', 16)}
          <span>${escapeHtml(message)}</span>
        </div>` : ''}

        <form id="login-form">
          <div class="form-group login-input-group">
            <span class="login-input-icon">${Icons.user('icon-svg', 16)}</span>
            <input type="text" id="input-userId" name="userId" class="form-control" placeholder="Username (contoh: admin)" required autofocus />
          </div>

          <div class="form-group login-input-group">
            <span class="login-input-icon">${Icons.lock('icon-svg', 16)}</span>
            <input type="password" id="input-password" name="password" class="form-control" placeholder="Kata Sandi" required />
            <button type="button" class="login-input-toggle" id="btn-toggle-password" aria-label="Tampilkan kata sandi">
              ${Icons.eye('icon-svg', 16)}
            </button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size:12px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:normal;">
              <input type="checkbox" id="remember-me" checked /> Ingat sesi
            </label>
            <span style="color:#888;">Port 3306</span>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="width:100%; height:38px; font-size:14px;">
            MASUK KE SISTEM →
          </button>
        </form>

        <div class="login-quick-creds">
          <div class="login-quick-creds-title">
            ${Icons.shield('icon-svg', 13)}
            <span>Pilihan Akun Cepat:</span>
          </div>
          <button type="button" class="login-quick-btn" data-user="admin" data-pw="admin123">
            <strong style="color:#3c8dbc;">Admin (Pimpinan)</strong>
            <code>admin / admin123</code>
          </button>
          <button type="button" class="login-quick-btn" data-user="mandor" data-pw="mandor123">
            <strong style="color:#f39c12;">Mandor (Gudang)</strong>
            <code>mandor / mandor123</code>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderAuthLayout(message = '', state = {}) {
  return `
    <main class="login-page">
      ${renderLoginCard(message, state)}
    </main>
  `;
}

export function bindAuthEvents(handleLogin) {
  const loginForm = document.querySelector('#login-form');
  if (loginForm && handleLogin) {
    loginForm.onsubmit = handleLogin;
  }

  // Quick fill handler
  const quickButtons = document.querySelectorAll('.login-quick-btn');
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
