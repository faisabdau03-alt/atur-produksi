export function openDialog(title, body, size = 'default') {
  const dialog = document.querySelector('#app-dialog');
  if (!dialog) return;
  if (size === 'wide' || size === 'lg') {
    dialog.classList.add('dialog-wide');
  } else {
    dialog.classList.remove('dialog-wide');
  }
  document.querySelector('#dialog-content').innerHTML = `
    <div class="modal-dialog-inner">
      <div class="modal-dialog-header">
        <h4 class="modal-dialog-title">${title}</h4>
        <button type="button" class="modal-dialog-close" data-action="close-dialog" aria-label="Tutup">×</button>
      </div>
      <div class="modal-dialog-body">
        ${body}
      </div>
    </div>
  `;
  dialog.showModal();
}

export function closeDialog() {
  const dialog = document.querySelector('#app-dialog');
  if (dialog) {
    dialog.close();
    dialog.classList.remove('dialog-wide');
  }
}
