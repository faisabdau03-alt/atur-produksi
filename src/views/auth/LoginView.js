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

        ${!isMysql ? `
        <div class="db-status-badge offline" style="display:flex; justify-content:center; margin-bottom:15px; background:#fff3cd; color:#856404; border:1px solid #ffeeba; padding:6px 10px; font-size:12px; border-radius:4px;">
          <span class="dot" style="background-color:#856404;"></span>
          <span>Mode Offline (Penyimpanan Lokal Aktif)</span>
        </div>` : ''}

        ${message ? `
        <div style="background:#f2dede; border:1px solid #ebccd1; color:#a94442; padding:10px; border-radius:3px; margin-bottom:15px; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${Icons.alertCircle('icon-svg', 16)}
          <span>${escapeHtml(message)}</span>
        </div>` : ''}

        <form id="login-form">
          <div class="form-group login-input-group">
            <span class="login-input-icon">${Icons.user('icon-svg', 16)}</span>
            <input type="text" id="input-userId" name="userId" class="form-control" placeholder="Username" required autofocus />
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
