import { openDialog } from '../../components/Dialog.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { runMutation } from '../../utils/mutation.js';
import { db } from '../../api/db.js';

export function openProductModal(product = null, onSaved = null) {
  openDialog(product ? 'Ubah Produk' : 'Tambah Produk Baru', `
    <form id="product-form" class="form-stack">
      <div class="form-group">
        <label class="form-label" for="prod-name">
          Nama Produk <span class="required">*</span>
        </label>
        <input class="form-control" id="prod-name" name="name" maxlength="120" value="${escapeHtml(product?.name || '')}" placeholder="Contoh: Pel Lantai Katun Putih Gagang Kayu" required />
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="prod-sku">
            Kode SKU <span class="optional">(opsional)</span>
          </label>
          <input class="form-control" id="prod-sku" name="sku" maxlength="60" value="${escapeHtml(product?.sku || '')}" placeholder="Contoh: PL-KTN-01" />
        </div>
        <div class="form-group">
          <label class="form-label" for="prod-unit">
            Satuan Barang <span class="required">*</span>
          </label>
          <input class="form-control" id="prod-unit" name="unit" maxlength="24" value="${escapeHtml(product?.unit || 'pcs')}" placeholder="Contoh: pcs, batang, ikat, dus" required />
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="prod-purchase">
            Harga Beli / HPP Modal (Rp) <span class="optional">(saat belanja)</span>
          </label>
          <input class="form-control" id="prod-purchase" name="purchase_price" type="number" min="0" step="1" value="${escapeHtml(product?.purchase_price ?? '')}" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label" for="prod-sale">
            Harga Jual Satuan (Rp) <span class="optional">(saat keluar)</span>
          </label>
          <input class="form-control" id="prod-sale" name="selling_price" type="number" min="0" step="1" value="${escapeHtml(product?.selling_price ?? '')}" placeholder="0" />
        </div>
      </div>

      <div class="modal-form-actions">
        <button type="button" class="btn btn-default" data-action="close-dialog">Batal</button>
        <button class="btn btn-primary" type="submit">
          ${product ? 'Simpan Perubahan' : '+ Simpan Produk'}
        </button>
      </div>
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
