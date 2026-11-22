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
      <div class="form-group" style="margin-bottom: 12px;">
        <label class="form-label" style="font-weight: 700; color: #1e293b; margin-bottom: 6px; display: block;">
          Asal / Sumber Barang <span class="required">*</span>
        </label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label id="card-source-production" style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 2px solid ${!isPurchase ? '#10b981' : '#e2e8f0'}; background: ${!isPurchase ? '#f0fdf4' : '#ffffff'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
            <input type="radio" name="source_type" value="production" ${!isPurchase ? 'checked' : ''} style="margin-top: 3px; accent-color: #10b981;" />
            <div>
              <div style="font-weight: 700; font-size: 13px; color: ${!isPurchase ? '#065f46' : '#1e293b'};">
                🏭 Produksi Sendiri / Gudang
              </div>
              <div style="font-size: 11px; color: #64748b; line-height: 1.35; margin-top: 2px;">
                Barang dibuat/dirakit di bengkel pabrik atau ada stok di gudang sendiri
              </div>
            </div>
          </label>
          <label id="card-source-purchase" style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 2px solid ${isPurchase ? '#3b82f6' : '#e2e8f0'}; background: ${isPurchase ? '#eff6ff' : '#ffffff'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
            <input type="radio" name="source_type" value="purchase" ${isPurchase ? 'checked' : ''} style="margin-top: 3px; accent-color: #3b82f6;" />
            <div>
              <div style="font-weight: 700; font-size: 13px; color: ${isPurchase ? '#1e40af' : '#1e293b'};">
                🛒 Beli Luar / Kulakan (Supplier)
              </div>
              <div style="font-size: 11px; color: #64748b; line-height: 1.35; margin-top: 2px;">
                Barang jadi kulakan dibeli dari supplier luar, distributor, atau reseller
              </div>
            </div>
          </label>
        </div>
      </div>

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
            <span id="label-cost-title">${!isPurchase ? 'HPP Modal Produksi (Rp)' : 'Harga Beli / Kulakan (Rp)'}</span>
            <span id="label-cost-sub" class="optional">${!isPurchase ? '(biaya modal bahan & tukang)' : '(saat belanja supplier)'}</span>
          </label>
          <input class="form-control" id="prod-purchase" name="purchase_price" type="number" min="0" step="1" value="${escapeHtml(product?.purchase_price ?? '')}" placeholder="0" />
        </div>
        <div class="form-group">
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
    const cardProd = form.querySelector('#card-source-production');
    const cardPurch = form.querySelector('#card-source-purchase');
    const radioProd = form.querySelector('input[name="source_type"][value="production"]');
    const radioPurch = form.querySelector('input[name="source_type"][value="purchase"]');
    const labelCostTitle = form.querySelector('#label-cost-title');
    const labelCostSub = form.querySelector('#label-cost-sub');
    const labelStockTitle = form.querySelector('#label-stock-title');

    function updateSourceUi(val) {
      const isP = val === 'production';
      if (cardProd) {
        cardProd.style.borderColor = isP ? '#10b981' : '#e2e8f0';
        cardProd.style.background = isP ? '#f0fdf4' : '#ffffff';
        const title = cardProd.querySelector('div > div:first-child');
        if (title) title.style.color = isP ? '#065f46' : '#1e293b';
      }
      if (cardPurch) {
        cardPurch.style.borderColor = !isP ? '#3b82f6' : '#e2e8f0';
        cardPurch.style.background = !isP ? '#eff6ff' : '#ffffff';
        const title = cardPurch.querySelector('div > div:first-child');
        if (title) title.style.color = !isP ? '#1e40af' : '#1e293b';
      }
      if (labelCostTitle) {
        labelCostTitle.textContent = isP ? 'HPP Modal Produksi (Rp)' : 'Harga Beli / Kulakan (Rp)';
      }
      if (labelCostSub) {
        labelCostSub.textContent = isP ? '(biaya modal bahan & tukang)' : '(saat belanja supplier)';
      }
      if (labelStockTitle) {
        if (product) {
          labelStockTitle.textContent = isP ? 'Tambah / Koreksi Stok Pabrik' : 'Tambah / Koreksi Stok Kulakan';
        } else {
          labelStockTitle.textContent = isP ? 'Stok Awal di Gudang' : 'Stok Awal Kulakan';
        }
      }
    }

    if (radioProd) {
      radioProd.addEventListener('change', () => {
        if (radioProd.checked) updateSourceUi('production');
      });
    }
    if (radioPurch) {
      radioPurch.addEventListener('change', () => {
        if (radioPurch.checked) updateSourceUi('purchase');
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
