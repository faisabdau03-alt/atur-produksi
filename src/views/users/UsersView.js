import { state, localDate } from '../../store/state.js';
import { heading } from '../../components/Header.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { formatDate } from '../../utils/formatters.js';
import { tableToolbar, tableFooter } from '../../components/Table.js';
import { Icons } from '../../components/Icons.js';

export function renderUsers() {
  const users = state.systemUsers || [];

  return `
    ${heading('', 'Data Pengguna', 'Kelola otorisasi akun pengguna dan hak akses sistem')}

    <div class="box box-primary">
      <div class="box-header">
        <h3 class="box-title">${Icons.users('icon-svg', 18)} Daftar Pengguna Sistem</h3>
        <div class="box-tools">
          <button type="button" class="btn btn-info btn-sm" data-action="add-user">
            ${Icons.plus('icon-svg', 13)} Tambah Pengguna Baru
          </button>
        </div>
      </div>

      <div class="box-body">
        ${tableToolbar('search-users')}

        <div class="table-responsive">
          <table class="table table-bordered table-hover table-striped">
            <thead>
              <tr>
                <th style="width: 45px;" class="align-center">NO</th>
                <th>USERNAME / ID</th>
                <th>NAMA LENGKAP</th>
                <th>ROLE / AKSES</th>
                <th>TERDAFTAR</th>
                <th style="width: 85px;" class="align-center">OPSI</th>
              </tr>
            </thead>
            <tbody>
              ${users.length === 0 ? `
                <tr>
                  <td colspan="6" class="align-center" style="padding: 24px; color: #777;">
                    Memuat data pengguna...
                  </td>
                </tr>
              ` : users.map((u, idx) => {
                const isAdmin = u.role === 'admin';
                const roleClass = isAdmin ? 'status-paid' : 'status-pending';
                const roleLabel = isAdmin ? 'ADMINISTRATOR' : 'MANDOR GUDANG';

                return `
                  <tr>
                    <td class="align-center">${idx + 1}</td>
                    <td><code>${escapeHtml(u.username)}</code></td>
                    <td><strong>${escapeHtml(u.full_name)}</strong></td>
                    <td>
                      <span class="status-pill ${roleClass}">
                        ${roleLabel}
                      </span>
                    </td>
                    <td class="date-cell">${formatDate(u.created_at ? u.created_at.slice(0, 10) : localDate)}</td>
                    <td class="align-center">
                      <div class="btn-group-opsi">
                        <button type="button" class="btn-opsi-edit" data-action="edit-user" data-id="${u.id}" title="Edit pengguna">
                          ${Icons.wrench('icon-svg', 13)}
                        </button>
                        ${u.id !== state.user?.id ? `
                          <button type="button" class="btn-opsi-delete" data-action="delete-user" data-id="${u.id}" title="Hapus pengguna">
                            ${Icons.trash('icon-svg', 13)}
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="box-footer">
        ${tableFooter(users.length, users.length)}
      </div>
    </div>
  `;
}
