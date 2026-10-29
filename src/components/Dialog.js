export function openDialog(title, body) {
  const dialog = document.querySelector('#app-dialog');
  if (!dialog) return;
  document.querySelector('#dialog-content').innerHTML = `
    <div class="dialog-heading">
      <div><p class="eyebrow">RUANG KERJA</p><h2>${title}</h2></div>
      <button class="icon-button" data-action="close-dialog" aria-label="Tutup">×</button>
    </div>
    ${body}
  `;
  dialog.showModal();
}

export function closeDialog() {
  const dialog = document.querySelector('#app-dialog');
  if (dialog) dialog.close();
}
