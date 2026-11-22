import { openDialog } from '../../components/Dialog.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { runMutation } from '../../utils/mutation.js';
import { formatQuantity } from '../../utils/formatters.js';
import { stockFor } from '../../store/state.js';
import { db } from '../../api/db.js';

export function openProductModal(product = null, onSaved = null) {
  const currentStock = product ? stockFor(product.id) : 0;
  const isPurchase = product?.source_type === 'purchase';

  openDialog(product ? 'Ubah Produk' : 'Tambah Produk Baru', `
    <form id="product-form" class="form-stack">
      <!-- OPSI ASAL BARANG (SLIM & MINIMALIS SEGMENTED CONTROL) -->
      <div class="form-group" style="margin-bottom: 10px;">
        <label class="form-label" style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
          <span>Asal / Sumber Barang <span class="required">*</span></span>
          <span id="source-subtitle-hint" style="font-size: 11px; font-weight: 500; color: ${!isPurchase ? '#047857' : '#1d4ed8'};">
            ${!isPurchase ? '🏭 Buatan bengkel/pabrik sendiri' : '🛒 Kulakan/beli dari supplier luar'}
          </span>
        </label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; background: #f1f5f9; padding: 3px; border-radius: 8px; border: 1px solid #e2e8f0; gap: 4px;">
          <label id="card-source-production" style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 10px; font-size: 12.5px; font-weight: 600; border-radius: 6px; transition: all 0.15s ease; ${!isPurchase ? 'background: #ffffff; color: #047857; box-shadow: 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #a7f3d0;' : 'background: transparent; color: #64748b; border: 1px solid transparent;'} user-select: none; margin: 0;">
            <input type="radio" name="source_type" value="production" ${!isPurchase ? 'checked' : ''} style="display: none;" />
            <span>🏭 Produksi Sendiri / Gudang</span>
          </label>
          <label id="card-source-purchase" style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 10px; font-size: 12.5px; font-weight: 600; border-radius: 6px; transition: all 0.15s ease; ${isPurchase ? 'background: #ffffff; color: #1d4ed8; box-shadow: 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #bfdbfe;' : 'background: transparent; color: #64748b; border: 1px solid transparent;'} user-select: none; margin: 0;">
            <input type="radio" name="source_type" value="purchase" ${isPurchase ? 'checked' : ''} style="display: none;" />
            <span>🛒 Beli Luar / Kulakan</span>
          </label>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 10px;">
        <label class="form-label" for="prod-name">
          Nama Produk <span class="required">*</span>
        </label>
        <input class="form-control" id="prod-name" name="name" maxlength="120" value="${escapeHtml(product?.name || '')}" placeholder="Contoh: Pel Lantai Katun Putih Gagang Kayu" required />
      </div>

      <div class="form-grid-2" style="gap: 10px; margin-bottom: 10px;">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="prod-sku">
            Kode SKU <span class="optional">(opsional)</span>
          </label>
          <input class="form-control" id="prod-sku" name="sku" maxlength="60" value="${escapeHtml(product?.sku || '')}" placeholder="Contoh: PL-KTN-01" />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="prod-unit">
            Satuan Barang <span class="required">*</span>
          </label>
          <input class="form-control" id="prod-unit" name="unit" maxlength="24" value="${escapeHtml(product?.unit || 'pcs')}" placeholder="Contoh: pcs, batang, ikat, dus" required />
        </div>
      </div>

      <div class="form-grid-2" style="gap: 10px; margin-bottom: 10px;">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="prod-purchase">
            <span id="label-cost-title">${!isPurchase ? 'HPP Modal Produksi (Rp)' : 'Harga Beli / Kulakan (Rp)'}</span>
            <span id="label-cost-sub" class="optional">${!isPurchase ? '(biaya bahan & tukang)' : '(saat belanja)'}</span>
          </label>
          <input class="form-control" id="prod-purchase" name="purchase_price" type="number" min="0" step="1" value="${escapeHtml(product?.purchase_price ?? '')}" placeholder="0" />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="prod-stock">
            <span id="label-stock-title">${product ? 'Tambah / Koreksi Stok' : (!isPurchase ? 'Stok Awal di Gudang' : 'Stok Awal Kulakan')}</span>
            <span class="optional">(opsional)</span>
          </label>
          <div style="position: relative; display: flex; align-items: center;">
            <input class="form-control" id="prod-stock" name="${product ? 'adjust_stock' : 'initial_stock'}" type="number" ${product ? 'step="any"' : 'min="0" step="any"'} value="${product ? '' : '0'}" placeholder="0" style="padding-right: 52px;" />
            <span id="prod-stock-unit-badge" style="position: absolute; right: 8px; font-size: 11px; font-weight: 600; color: #475569; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; pointer-events: none;">${escapeHtml(product?.unit || 'pcs')}</span>
          </div>
        </div>
      </div>

      <!-- TINGKAT HARGA JUAL (SATUAN, SALES, GROSIR) -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
        <div style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span style="display: flex; align-items: center; gap: 5px;">
            <span>🏷️</span> TINGKAT HARGA JUAL PRODUK
          </span>
          <span style="font-size: 10.5px; font-weight: normal; color: #64748b;">3 Tingkatan Harga</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="prod-sale" style="color: #166534; font-weight: 600; font-size: 11px; margin-bottom: 3px;">
              Harga Jual Satuan (Rp) <span class="required">*</span>
            </label>
            <input class="form-control" id="prod-sale" name="selling_price" type="number" min="0" step="1" value="${escapeHtml(product?.selling_price ?? '')}" placeholder="0" required />
            <span style="font-size: 9.5px; color: #64748b; margin-top: 2px; display: block;">Eceran umum</span>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="prod-sales" style="color: #1d4ed8; font-weight: 600; font-size: 11px; margin-bottom: 3px;">
              Harga Jual Sales (Rp)
            </label>
            <input class="form-control" id="prod-sales" name="price_sales" type="number" min="0" step="1" value="${escapeHtml(product?.price_sales ?? '')}" placeholder="0" />
            <span style="font-size: 9.5px; color: #64748b; margin-top: 2px; display: block;">Reseller / agen</span>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="prod-wholesale" style="color: #b45309; font-weight: 600; font-size: 11px; margin-bottom: 3px;">
              Harga Jual Grosir (Rp)
            </label>
            <input class="form-control" id="prod-wholesale" name="price_wholesale" type="number" min="0" step="1" value="${escapeHtml(product?.price_wholesale ?? '')}" placeholder="0" />
            <span style="font-size: 9.5px; color: #64748b; margin-top: 2px; display: block;">Partai besar</span>
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
    const cardProd = form.querySelector('#card-source-production');
    const cardPurch = form.querySelector('#card-source-purchase');
    const radioProd = form.querySelector('input[name="source_type"][value="production"]');
    const radioPurch = form.querySelector('input[name="source_type"][value="purchase"]');
    const hint = form.querySelector('#source-subtitle-hint');
    const labelCostTitle = form.querySelector('#label-cost-title');
    const labelCostSub = form.querySelector('#label-cost-sub');
    const labelStockTitle = form.querySelector('#label-stock-title');

    function updateSourceUi(val) {
      const isP = val === 'production';
      if (cardProd) {
        cardProd.style.background = isP ? '#ffffff' : 'transparent';
        cardProd.style.color = isP ? '#047857' : '#64748b';
        cardProd.style.borderColor = isP ? '#a7f3d0' : 'transparent';
        cardProd.style.boxShadow = isP ? '0 1px 2px rgba(0,0,0,0.06)' : 'none';
      }
      if (cardPurch) {
        cardPurch.style.background = !isP ? '#ffffff' : 'transparent';
        cardPurch.style.color = !isP ? '#1d4ed8' : '#64748b';
        cardPurch.style.borderColor = !isP ? '#bfdbfe' : 'transparent';
        cardPurch.style.boxShadow = !isP ? '0 1px 2px rgba(0,0,0,0.06)' : 'none';
      }
      if (hint) {
        hint.textContent = isP ? '🏭 Buatan bengkel/pabrik sendiri' : '🛒 Kulakan/beli dari supplier luar';
        hint.style.color = isP ? '#047857' : '#1d4ed8';
      }
      if (labelCostTitle) {
        labelCostTitle.textContent = isP ? 'HPP Modal Produksi (Rp)' : 'Harga Beli / Kulakan (Rp)';
      }
      if (labelCostSub) {
        labelCostSub.textContent = isP ? '(biaya bahan & tukang)' : '(saat belanja)';
      }
      if (labelStockTitle) {
        if (product) {
          labelStockTitle.textContent = isP ? 'Tambah / Koreksi Stok Pabrik' : 'Tambah / Koreksi Stok Kulakan';
        } else {
          labelStockTitle.textContent = isP ? 'Stok Awal di Gudang' : 'Stok Awal Kulakan';
        }
      }
    }

    if (cardProd) {
      cardProd.addEventListener('click', () => {
        if (radioProd) radioProd.checked = true;
        updateSourceUi('production');
      });
    }
    if (cardPurch) {
      cardPurch.addEventListener('click', () => {
        if (radioPurch) radioPurch.checked = true;
        updateSourceUi('purchase');
      });
    }

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
      const sourceType = fd.get('source_type') || 'production';

      const payload = {
        name: fd.get('name').trim(),
        sku: fd.get('sku').trim() || null,
        unit: fd.get('unit').trim(),
        source_type: sourceType,
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
