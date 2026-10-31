export function openDialog(title, body, isWide = false) {
  const d = document.querySelector('#app-dialog');
  if (d) { if (isWide) d.classList.add('dialog-wide'); else d.classList.remove('dialog-wide'); }
  const dialog = document.querySelector('#app-dialog');
  if (!dialog) return;
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
  if (dialog) dialog.close();
}
