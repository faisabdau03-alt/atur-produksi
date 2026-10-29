import { openDialog, closeDialog } from '../../components/Dialog.js';
import { notify, showError } from '../../components/Toast.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { refreshData } from '../../store/state.js';

export function userForm(user = null, onSaved = null) {
  openDialog(user ? 'Ubah Pengguna Sistem' : 'Tambah Pengguna Baru', `
    <form id="user-manage-form" class="form-stack">
      <label>Username / ID Masuk
        <input name="username" maxlength="50" value="${escapeHtml(user?.username || '')}" placeholder="Contoh: operator1" ${user ? 'readonly style="background:#f3f4f6;"' : 'required'} />
      </label>
      <label>Nama Lengkap
        <input name="full_name" maxlength="100" value="${escapeHtml(user?.full_name || '')}" placeholder="Contoh: Ahmad Fauzi" required />
      </label>
      <label>Email Perusahaan <span class="optional">(opsional)</span>
        <input name="email" type="email" maxlength="100" value="${escapeHtml(user?.email || '')}" placeholder="Contoh: ahmad@jayawijaya.com" />
      </label>
      <div class="form-row">
        <label>Peran / Hak Akses
          <select name="role">
            <option value="operator" ${user?.role === 'operator' ? 'selected' : ''}>Operator Produksi</option>
            <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrator (Akses Penuh)</option>
            <option value="kasir" ${user?.role === 'kasir' ? 'selected' : ''}>Kasir Keuangan</option>
          </select>
        </label>
        <label>Kata Sandi ${user ? '<span class="optional">(kosongkan jika tetap)</span>' : ''}
          <input name="password" type="password" minlength="5" placeholder="Minimal 5 karakter" ${user ? '' : 'required'} />
        </label>
      </div>
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button type="submit" class="button button-primary">${user ? 'Simpan Perubahan' : 'Buat Pengguna'}</button>
      </div>
    </form>`);

  const form = document.querySelector('#user-manage-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        username: fd.get('username').trim(),
        full_name: fd.get('full_name').trim(),
        email: fd.get('email').trim() || undefined,
        role: fd.get('role'),
        password: fd.get('password') || undefined,
      };
      const token = localStorage.getItem('jw_session_token') || '';
      try {
        const url = user ? `/api/users?id=${encodeURIComponent(user.id)}` : '/api/users';
        const method = user ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload),
        }).then((r) => r.json());

        if (res && res.error) {
          showError(res.error);
          return;
        }

        closeDialog();
        notify(user ? 'Data pengguna berhasil diperbarui.' : 'Pengguna baru berhasil ditambahkan.');
        await refreshData();
        if (typeof onSaved === 'function') {
          onSaved();
        } else {
          window.dispatchEvent(new CustomEvent('app:rerender'));
        }
      } catch (err) {
        showError('Gagal menyimpan pengguna: ' + err.message);
      }
    });
  }
}
