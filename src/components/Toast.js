export function notify(message, type = 'success') {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${type} is-visible`;
  window.clearTimeout(notify.timeout);
  notify.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 4200);
}

export function showError(message) {
  notify(message, 'error');
}
