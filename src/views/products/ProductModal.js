import { openDialog } from '../../components/Dialog.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { runMutation } from '../../utils/mutation.js';
import { formatQuantity } from '../../utils/formatters.js';
import { stockFor } from '../../store/state.js';
import { db } from '../../api/db.js';

export function openProductModal(product = null, onSaved = null) {
  const currentStock = product ? stockFor(product.id) : 0;

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
            Harga Beli / HPP Modal (Rp) <span class="optional">(biaya modal)</span>
          </label>
          <input class="form-control" id="prod-purchase" name="purchase_price" type="number" min="0" step="1" value="${escapeHtml(product?.purchase_price ?? '')}" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label" for="prod-stock" style="font-weight: 600; color: #166534;">
            ${product ? 'Tambah / Koreksi Stok (+ / -)' : 'Stok Awal Fisik (Jumlah)'} <span class="optional">(opsional)</span>
          </label>
          <div style="position: relative; display: flex; align-items: center;">
            <input class="form-control" id="prod-stock" name="${product ? 'adjust_stock' : 'initial_stock'}" type="number" ${product ? 'step="any"' : 'min="0" step="any"'} value="${product ? '' : '0'}" placeholder="0" style="padding-right: 56px; font-weight: 700; color: #166534;" />
            <span id="prod-stock-unit-badge" style="position: absolute; right: 8px; font-size: 11px; font-weight: 700; color: #166534; background: #e8f5e9; border: 1px solid #c8e6c9; padding: 2px 7px; border-radius: 4px; pointer-events: none;">${escapeHtml(product?.unit || 'pcs')}</span>
          </div>
          <span style="font-size: 10px; color: #64748b; margin-top: 3px; display: block;">
            ${product 
              ? `Stok saat ini: <strong style="color: #0f172a;">${formatQuantity(currentStock)} ${escapeHtml(product.unit)}</strong>. Masukkan angka untuk menambah (+).` 
              : 'Jumlah fisik stok awal yang langsung tercatat di gudang'}
          </span>
        </div>
      </div>

      <!-- TINGKAT HARGA JUAL (SATUAN, SALES, GROSIR) -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; margin-bottom: 6px;">
        <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span>🏷️</span> TINGKAT HARGA JUAL PRODUK
          </span>
          <span style="font-size: 11px; font-weight: normal; color: #64748b;">3 Tingkatan Harga</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="prod-sale" style="color: #166534; font-weight: 600; font-size: 11.5px;">
              Harga Jual Satuan (Rp) <span class="required">*</span>
            </label>
            <input class="form-control" id="prod-sale" name="selling_price" type="number" min="0" step="1" value="${escapeHtml(product?.selling_price ?? '')}" placeholder="0" required />
            <span style="font-size: 10px; color: #64748b; margin-top: 3px; display: block;">Eceran umum</span>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="prod-sales" style="color: #1d4ed8; font-weight: 600; font-size: 11.5px;">
              Harga Jual Sales (Rp)
            </label>
            <input class="form-control" id="prod-sales" name="price_sales" type="number" min="0" step="1" value="${escapeHtml(product?.price_sales ?? '')}" placeholder="0" />
            <span style="font-size: 10px; color: #64748b; margin-top: 3px; display: block;">Reseller / agen</span>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="prod-wholesale" style="color: #b45309; font-weight: 600; font-size: 11.5px;">
              Harga Jual Grosir (Rp)
            </label>
            <input class="form-control" id="prod-wholesale" name="price_wholesale" type="number" min="0" step="1" value="${escapeHtml(product?.price_wholesale ?? '')}" placeholder="0" />
            <span style="font-size: 10px; color: #64748b; margin-top: 3px; display: block;">Partai besar</span>
          </div>
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
    const unitInput = form.querySelector('#prod-unit');
    const unitBadge = form.querySelector('#prod-stock-unit-badge');
    if (unitInput && unitBadge) {
      unitInput.addEventListener('input', () => {
        unitBadge.textContent = unitInput.value.trim() || 'pcs';
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(form);
      const initialStock = Number(fd.get('initial_stock')) || 0;
      const adjustStock = Number(fd.get('adjust_stock')) || 0;

      const payload = {
        name: fd.get('name').trim(),
        sku: fd.get('sku').trim() || null,
        unit: fd.get('unit').trim(),
        purchase_price: Number(fd.get('purchase_price')) || 0,
        selling_price: Number(fd.get('selling_price')) || 0,
        price_sales: Number(fd.get('price_sales')) || 0,
        price_wholesale: Number(fd.get('price_wholesale')) || 0,
        initial_stock: initialStock,
        adjust_stock: adjustStock,
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
