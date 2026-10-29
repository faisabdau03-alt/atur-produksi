import { state, localDate } from '../../store/state.js';
import { heading } from '../../components/Header.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { formatDate } from '../../utils/formatters.js';
import { Icons } from '../../components/Icons.js';

export function renderUsers() {
  const users = state.systemUsers || [];

  const actions = `
    <button class="button button-primary" data-action="add-user">
      ${Icons.plus('icon-svg', 15)}
      <span>Tambah Pengguna</span>
    </button>
  `;

  return `
    ${heading(
      'HAK AKSES SISTEM',
      'Kelola Akun Pengguna',
      'Kelola akun login administrator, mandor gudang, dan operator lini produksi Jaya Wijaya.',
      actions
    )}

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Daftar Akun Pengguna <span class="count-badge">${users.length}</span></h2>
          <p>Otentikasi aman menggunakan username/ID dan password terenkripsi bcrypt</p>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID / Username</th>
              <th>Nama Lengkap</th>
              <th>Email</th>
              <th>Peran (Role)</th>
              <th>Terdaftar Sejak</th>
              <th class="align-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${users.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
                  Memuat data pengguna...
                </td>
              </tr>
            ` : users.map((u) => {
              const isAdmin = u.role === 'admin';
              const isKasir = u.role === 'kasir';
              const pillClass = isAdmin ? 'status-active' : (isKasir ? 'status-permit' : 'status-half_day');
              const roleLabel = isAdmin ? 'Administrator' : (isKasir ? 'Kasir Keuangan' : 'Operator / Mandor');

              return `
                <tr>
                  <td><code>${escapeHtml(u.username)}</code></td>
                  <td class="detail-cell"><strong>${escapeHtml(u.full_name)}</strong></td>
                  <td>${escapeHtml(u.email || '—')}</td>
                  <td>
                    <span class="status-pill ${pillClass}">
                      ${isAdmin ? Icons.shield('icon-svg', 12) : Icons.user('icon-svg', 12)}
                      <span>${roleLabel}</span>
                    </span>
                  </td>
                  <td class="date-cell">${formatDate(u.created_at ? u.created_at.slice(0, 10) : localDate)}</td>
                  <td class="align-right">
                    <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
                      <button class="icon-button" data-action="edit-user" data-id="${u.id}" title="Edit pengguna">
                        ${Icons.edit('icon-svg', 14)}
                      </button>
                      ${u.id !== state.user?.id ? `
                        <button class="icon-button danger-icon" data-action="delete-user" data-id="${u.id}" title="Hapus pengguna">
                          ${Icons.trash('icon-svg', 14)}
                        </button>
                      ` : `
                        <span class="sub-meta" style="margin-left: 6px;">(Akun Anda)</span>
                      `}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
