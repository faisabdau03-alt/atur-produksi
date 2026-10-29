import { openDialog } from '../../components/Dialog.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { runMutation } from '../../utils/mutation.js';
import { db } from '../../api/db.js';

export function openProductModal(product = null, onSaved = null) {
  openDialog(product ? 'Ubah produk' : 'Tambah produk', `
    <form id="product-form" class="form-stack">
      <label>Nama produk<input name="name" maxlength="120" value="${escapeHtml(product?.name || '')}" placeholder="Contoh: Kemasan ukuran sedang" required /></label>
      <div class="form-row"><label>SKU <span class="optional">(opsional)</span><input name="sku" maxlength="60" value="${escapeHtml(product?.sku || '')}" placeholder="Contoh: KMS-001" /></label>
      <label>Satuan<input name="unit" maxlength="24" value="${escapeHtml(product?.unit || 'pcs')}" placeholder="pcs, kg, box" required /></label></div>
      <div class="form-row">
        <label>Harga beli per unit (Rp) <span class="optional">(saat belanja)</span>
          <input name="purchase_price" type="number" min="0" step="1" value="${escapeHtml(product?.purchase_price ?? '')}" placeholder="0" />
        </label>
        <label>Harga jual per unit (Rp) <span class="optional">(saat keluar)</span>
          <input name="selling_price" type="number" min="0" step="1" value="${escapeHtml(product?.selling_price ?? '')}" placeholder="0" />
        </label>
      </div>
      <div class="dialog-actions"><button type="button" class="button button-quiet" data-action="close-dialog">Batal</button><button class="button button-primary" type="submit">${product ? 'Simpan perubahan' : 'Simpan produk'}</button></div>
    </form>`);

  const form = document.querySelector('#product-form');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(form);
      const payload = {
        name: fd.get('name').trim(),
        sku: fd.get('sku').trim() || null,
        unit: fd.get('unit').trim(),
        purchase_price: Number(fd.get('purchase_price')) || 0,
        selling_price: Number(fd.get('selling_price')) || 0,
      };
      await runMutation(async () => {
        const result = product
          ? await db.from('products').update(payload).eq('id', product.id)
          : await db.from('products').insert(payload);
        return result.error;
      }, product ? 'Perubahan produk disimpan.' : 'Produk berhasil ditambahkan.', onSaved);
    });
  }
}
