import { state, localDate } from '../../store/state.js';
import { heading } from '../../components/Header.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { formatDate } from '../../utils/formatters.js';

export function renderUsers() {
  const users = state.systemUsers || [];
  return `
    ${heading(
      'MANAJEMEN PENGGUNA',
      'Kelola Akun & Hak Akses Sistem',
      'Kelola akun administrator, mandor gudang, dan operator lini produksi Jaya Wijaya.',
      `<button class="button button-primary" data-action="add-user"><span>+ Tambah Pengguna</span></button>`
    )}
    <div class="card" style="margin-top:16px;">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb; padding-bottom:12px; margin-bottom:14px;">
        <div>
          <h3 style="margin:0 0 4px; font-size:16px; font-weight:700; color:#1f2937;">Daftar Akun Terdaftar (${users.length})</h3>
          <p class="muted" style="margin:0; font-size:13px;">Pengguna dapat masuk ke portal menggunakan Username/ID dan kata sandi yang ditentukan.</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table" style="width:100%; text-align:left; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1.5px solid #e5e7eb; color:#4b5563; font-size:12px; text-transform:uppercase;">
              <th style="padding:10px 12px;">ID / Username</th>
              <th style="padding:10px 12px;">Nama Lengkap</th>
              <th style="padding:10px 12px;">Email</th>
              <th style="padding:10px 12px;">Peran (Role)</th>
              <th style="padding:10px 12px;">Terdaftar Sejak</th>
              <th style="padding:10px 12px; text-align:right;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${users.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:32px; color:#6b7280;">Memuat atau belum ada pengguna tambahan.</td></tr>` : users.map((u) => `
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:12px;"><code>${escapeHtml(u.username)}</code></td>
                <td style="padding:12px; font-weight:600; color:#111827;">${escapeHtml(u.full_name)}</td>
                <td style="padding:12px; color:#6b7280;">${escapeHtml(u.email || '-')}</td>
                <td style="padding:12px;">
                  <span class="status-pill" style="${u.role === 'admin' ? 'background:#dcfce7; color:#166534;' : (u.role === 'kasir' ? 'background:#e0f2fe; color:#0369a1;' : 'background:#fef3c7; color:#92400e;')} font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px;">
                    ${u.role === 'admin' ? 'Administrator' : (u.role === 'kasir' ? 'Kasir' : 'Operator')}
                  </span>
                </td>
                <td style="padding:12px; color:#6b7280; font-size:13px;">${formatDate(u.created_at ? u.created_at.slice(0, 10) : localDate)}</td>
                <td style="padding:12px; text-align:right;">
                  <button class="button button-quiet button-sm" data-action="edit-user" data-id="${u.id}" style="padding:4px 8px; font-size:12px;">Edit</button>
                  ${u.id !== state.user?.id ? `<button class="button button-danger button-sm" data-action="delete-user" data-id="${u.id}" style="padding:4px 8px; font-size:12px; margin-left:6px; color:#dc2626; border-color:#fecaca;">Hapus</button>` : `<span style="color:#9ca3af; font-size:11px; margin-left:8px;">(Akun Anda)</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
