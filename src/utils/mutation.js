import { notify, showError } from '../components/Toast.js';
import { refreshData } from '../store/state.js';

export async function runMutation(operation, successMessage, onDone) {
  const submit = document.querySelector('#dialog-content form button[type="submit"]');
  if (submit) {
    submit.disabled = true;
    submit.textContent = 'Menyimpan…';
  }
  try {
    const error = await operation();
    if (error) {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Coba lagi';
      }
      showError(error.message || 'Data gagal disimpan. Silakan coba lagi.');
      return;
    }
    const dialog = document.querySelector('#app-dialog');
    if (dialog) dialog.close();
    await refreshData();
    notify(successMessage);
    if (onDone) onDone();
  } catch (err) {
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'Coba lagi';
    }
    showError(err.message || 'Terjadi kesalahan sistem.');
  }
}
