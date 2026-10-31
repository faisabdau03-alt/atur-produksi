import { openDialog } from '../../components/Dialog.js';
import { notify, showError } from '../../components/Toast.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { runMutation } from '../../utils/mutation.js';
import { formatMoney, formatQuantity, localDate } from '../../utils/formatters.js';
import { stockFor, state as appState, refreshData } from '../../store/state.js';
import { db } from '../../api/db.js';
import { Icons } from '../../components/Icons.js';
import { openReportDetailModal } from '../reports/excelExport.js';

export function openInventoryModal(state, initialType = 'out_sale', initialProductId = null, onSaved = null) {
  if (!state.products || !state.products.length) {
    notify('Tambahkan produk terlebih dahulu sebelum mencatat transaksi.', 'error');
    state.page = 'products';
    return;
  }

  const defaultPid = initialProductId || state.products[0]?.id;

  function getProductOptions(selectedId) {
    return state.products.map((p) => {
      const stock = stockFor(p.id);
      const isSel = p.id === selectedId;
      return `<option value="${escapeHtml(p.id)}" data-purchase="${p.purchase_price || 0}" data-selling="${p.selling_price || 0}" data-unit="${escapeHtml(p.unit)}" data-stock="${stock}" ${isSel ? 'selected' : ''}>${escapeHtml(p.name)} · stok ${formatQuantity(stock)} ${escapeHtml(p.unit)}</option>`;
    }).join('');
  }

  let orderItems = [
    {
      id: 1,
      productId: defaultPid,
      quantity: 1,
      unitPrice: Number(state.products.find((p) => p.id === defaultPid)?.selling_price) || 0,
    },
  ];

  const dialogTitle = initialType === 'out_sale'
    ? 'Catat Penjualan (Nota Multi-Item)'
    : (initialType === 'in_production' ? 'Tambah Stok Hasil Produksi Pabrik' : 'Catat Pergerakan Barang');

  openDialog(dialogTitle, `
    <form id="inventory-form" class="form-stack">
      <label>Jenis pergerakan
        <select name="movement_type" id="inv-movement-type" required>
          <option value="out_sale" ${initialType === 'out_sale' ? 'selected' : ''}>Barang Keluar: Penjualan ke Pelanggan (Pesanan Kirim / Nota)</option>
          <option value="in_purchase" ${initialType === 'in_purchase' ? 'selected' : ''}>Barang Masuk: Belanja / Beli dari Supplier (Bahan Baku / Kulakan)</option>
          <option value="in_production" ${initialType === 'in_production' ? 'selected' : ''}>Barang Masuk: Hasil Produksi Sendiri (Barang Jadi)</option>
          <option value="out_usage" ${initialType === 'out_usage' ? 'selected' : ''}>Barang Keluar: Pemakaian Internal / Reject (Rusak)</option>
        </select>
      </label>
      <div id="inv-multi-sale-hint" style="display:none; margin: 4px 0 8px; padding: 7px 12px; border-radius: 6px; background: #e8f5e9; border: 1px solid #c8e6c9; font-size: 11.5px; color: #1b5e20;">
        <span style="vertical-align: middle;">${Icons.receipt('icon-svg', 13)}</span> Pembeli pesan <strong>lebih dari 1 jenis barang</strong> dalam 1 nota? 
        <button type="button" class="btn btn-xs btn-success" data-action="open-sale-invoice-modal" style="margin-left: 6px; font-weight: 700; padding: 2px 8px; background: #187554;">
          Buka Form Nota Multi-Barang →
        </button>
      </div>

      <div class="form-row">
        <!-- Input Khusus Pihak Terkait (Nama Pembeli / Nama Supplier / Tim) -->
        <label id="inv-party-wrap">
          <span id="inv-party-label">Nama Pembeli / Pelanggan <span class="optional">(opsional)</span></span>
          <input name="party_name" id="inv-party-name" maxlength="120" placeholder="Contoh: Toko Berkah, CV Mandiri, Pak Hendra" />
        </label>
        <label>Tanggal pergerakan
          <input name="occurred_on" id="inv-date" type="date" value="${localDate}" required />
        </label>
      </div>

      <!-- Info Box Khusus Hasil Produksi -->
      <div class="formula-note" id="inv-prod-info" style="display: none; margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px; background: #edf7f0; border-left: 4px solid #187554; color: #187554;">
        <div style="font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">
          <span>${Icons.factory('icon-svg', 14)}</span> Produksi Pabrik Sendiri
        </div>
        <div style="font-size: 11px; line-height: 1.5; color: #205c3d;">
          Stok fisik barang jadi akan <strong>bertambah</strong> tanpa memotong kas belanja perusahaan. Biaya bahan baku dan gaji pekerja pabrik dicatat terpisah.
        </div>
      </div>

      <!-- Info Box Pemakaian Internal / Reject -->
      <div class="formula-note" id="inv-usage-info" style="display: none; margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px; background: #fff8e1; border-left: 4px solid #fbc02d; color: #7f6000;">
        <div style="font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">
          <span>${Icons.box('icon-svg', 14)}</span> Pemakaian Internal / Reject (Rusak)
        </div>
        <div style="font-size: 11px; line-height: 1.5; color: #6d4c00;">
          Stok fisik akan <strong>berkurang</strong> karena digunakan untuk internal pabrik, sampel, atau afkir (rusak). Transaksi kas tidak terpengaruh.
        </div>
      </div>

      <!-- DAFTAR ITEM TRANSAKSI (MULTI-ITEM NOTA) -->
      <div class="order-items-box" id="inv-items-box">
        <div class="order-items-header">
          <div class="order-items-title">
            <span>${Icons.inventory('icon-svg', 14)}</span>
            <span>Daftar Item Produk dalam Nota Transaksi</span>
          </div>
          <span class="order-items-hint">Bisa menambahkan lebih dari 1 jenis barang</span>
        </div>

        <div id="order-items-list">
          <!-- Item rows will be rendered here dynamically -->
        </div>

        <div class="order-items-footer">
          <button type="button" class="btn btn-default btn-sm" id="btn-add-item" style="display: inline-flex; align-items: center; gap: 5px; font-weight: 600; color: #145a42; border-color: #a3d4bb;">
            <span>＋</span> Tambah Item Produk Lain
          </button>

          <div class="order-totals-summary">
            <span class="order-total-count" id="order-item-count">Total: 1 jenis barang (1 unit)</span>
            <span class="order-total-amount" id="order-grand-total">Total: Rp 0</span>
          </div>
        </div>
      </div>

      <!-- Cash Box untuk Pembelian Supplier atau Penjualan Pelanggan -->
      <div class="formula-note" id="inv-cash-box" style="margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px; background: #f0fdf4; border: 1.5px solid #c2e7cc;">
        <label class="checkbox-label" style="font-weight: 700; color: #187554; display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" name="sync_cash" id="inv-sync-cash" checked />
          <span>Sinkronkan ke Keuangan Otomatis</span>
        </label>

        <div id="inv-cash-fields">
          <!-- OPSI METODE / STATUS PEMBAYARAN -->
          <div id="inv-payment-box">
            <div class="form-row">
              <label>Status / Metode Pembayaran
                <select name="payment_status" id="inv-payment-status">
                  <option value="paid">Lunas Langsung (Dibayar 100%)</option>
                  <option value="dp">Bayar Uang Muka / DP Dulu</option>
                  <option value="unpaid">Belum Dibayar (Tempo / Piutang Penuh)</option>
                </select>
              </label>
              <label id="inv-paid-amount-wrap" style="display: none;">
                <span id="inv-paid-amount-title">Nominal DP Diterima di Kas (Rp)</span>
                <input name="paid_amount" id="inv-paid-amount" type="number" min="0" step="1" placeholder="0" />
              </label>
            </div>
            <div id="inv-payment-summary" style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; font-size: 11px; line-height: 1.5; background: #edf7f0; color: #187554;">
            </div>
          </div>

          <div id="inv-cash-desc" style="font-size: 11px; color: #3a6850; margin-top: 6px; line-height: 1.5; display: flex; align-items: center; gap: 5px;">
            ${Icons.info('icon-svg', 13)} Dicatat otomatis ke buku kas.
          </div>
        </div>
      </div>

      <label>Catatan Tambahan Nota <span class="optional">(opsional)</span>
        <input name="notes" id="inv-notes" maxlength="240" placeholder="Keterangan pengiriman, alamat, atau nomor PO" />
      </label>
      
      <div class="dialog-actions">
        <button type="button" class="btn btn-default" data-action="close-dialog">Batal</button>
        <button class="btn btn-success" type="submit" style="background: #187554; border-color: #145a42; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
          <span>📝</span> Simpan & Terbitkan Nota
        </button>
      </div>
    </form>
  `, true);

  const form = document.querySelector('#inventory-form');
  if (!form) return;

  const moveTypeSelect = form.querySelector('#inv-movement-type');
  const syncCash = form.querySelector('#inv-sync-cash');
  const cashBox = form.querySelector('#inv-cash-box');
  const cashFields = form.querySelector('#inv-cash-fields');
  const prodInfo = form.querySelector('#inv-prod-info');
  const usageInfo = form.querySelector('#inv-usage-info');
  const cashDesc = form.querySelector('#inv-cash-desc');
  const partyWrap = form.querySelector('#inv-party-wrap');
  const partyLabel = form.querySelector('#inv-party-label');
  const partyInput = form.querySelector('#inv-party-name');
  const notesInput = form.querySelector('#inv-notes');
  const paymentStatusSelect = form.querySelector('#inv-payment-status');
  const paidAmountWrap = form.querySelector('#inv-paid-amount-wrap');
  const paidAmountTitle = form.querySelector('#inv-paid-amount-title');
  const paidAmountInput = form.querySelector('#inv-paid-amount');
  const paymentSummary = form.querySelector('#inv-payment-summary');
  const itemsContainer = form.querySelector('#order-items-list');
  const btnAddItem = form.querySelector('#btn-add-item');
  const itemCountLabel = form.querySelector('#order-item-count');
  const grandTotalLabel = form.querySelector('#order-grand-total');

  let nextItemId = 2;

  function renderOrderItems() {
    const isSale = moveTypeSelect.value === 'out_sale';
    const isPurchase = moveTypeSelect.value === 'in_purchase';
    const hasPrice = isSale || isPurchase;

    itemsContainer.innerHTML = orderItems.map((item, index) => {
      const prod = state.products.find((p) => p.id === item.productId) || state.products[0];
      const unit = prod?.unit || 'unit';
      const subtotal = Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));

      return `
        <div class="order-item-row ${hasPrice ? '' : 'no-price'}" data-row-id="${item.id}">
          <div class="order-item-col-prod">
            <span class="item-field-label">Produk (${index + 1})</span>
            <select class="item-product-select" data-id="${item.id}" required>
              ${getProductOptions(item.productId)}
            </select>
          </div>
          <div class="order-item-col-qty">
            <span class="item-field-label">Jumlah</span>
            <div class="input-with-unit">
              <input type="number" class="item-qty-input" data-id="${item.id}" min="0.01" step="0.01" value="${item.quantity}" placeholder="1" required />
              <span class="unit-tag">${escapeHtml(unit)}</span>
            </div>
          </div>
          ${hasPrice ? `
          <div class="order-item-col-price">
            <span class="item-field-label">Harga Satuan (Rp)</span>
            <input type="number" class="item-price-input" data-id="${item.id}" min="0" step="1" value="${item.unitPrice}" placeholder="0" required />
          </div>
          <div class="order-item-col-subtotal">
            <span class="item-field-label">Subtotal (Rp)</span>
            <div class="subtotal-display" id="subtotal-${item.id}">${formatMoney(subtotal)}</div>
          </div>` : ''}
          <div class="order-item-col-del">
            <button type="button" class="btn-del-item" data-id="${item.id}" title="Hapus item ini" ${orderItems.length <= 1 ? 'disabled' : ''}>✕</button>
          </div>
        </div>
      `;
    }).join('');

    updateTotals();
  }

  function updateTotals() {
    const isSale = moveTypeSelect.value === 'out_sale';
    const isPurchase = moveTypeSelect.value === 'in_purchase';
    const hasPrice = isSale || isPurchase;

    let totalQty = 0;
    let grandTotal = 0;

    orderItems.forEach((item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      totalQty += q;
      if (hasPrice) grandTotal += Math.round(q * p);
    });

    itemCountLabel.textContent = `Total: ${orderItems.length} jenis produk (${formatQuantity(totalQty)} unit)`;
    grandTotalLabel.textContent = hasPrice ? `Total: ${formatMoney(grandTotal)}` : `Total: ${formatQuantity(totalQty)} unit`;

    updatePaymentCalc(grandTotal);
  }

  function updatePaymentCalc(grandTotalParam) {
    const isSale = moveTypeSelect.value === 'out_sale';
    const isPurchase = moveTypeSelect.value === 'in_purchase';
    if (!isSale && !isPurchase) return;

    let grandTotal = grandTotalParam;
    if (typeof grandTotal === 'undefined') {
      grandTotal = orderItems.reduce((sum, item) => sum + Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
    }

    const status = paymentStatusSelect.value;
    paidAmountTitle.textContent = isSale ? 'Nominal DP Diterima di Kas (Rp)' : 'Nominal DP Dibayar dari Kas (Rp)';

    if (status === 'paid') {
      paidAmountWrap.style.display = 'none';
      paidAmountInput.value = grandTotal || '';
      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#edf7f0';
      paymentSummary.style.color = '#187554';
      paymentSummary.style.border = '1px solid #c2e7cc';
      paymentSummary.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;">${Icons.check('icon-svg', 13)} <strong>Lunas Langsung (100%)</strong></span>: Uang kas ${isSale ? 'masuk' : 'keluar'} penuh sebesar <strong>${formatMoney(grandTotal)}</strong>.`;
      cashDesc.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;">${Icons.info('icon-svg', 12)} Otomatis dicatat sebagai <strong>${isSale ? 'Kas Masuk (Penjualan Produk)' : 'Kas Keluar (Belanja Barang)'}</strong> sebesar <strong>${formatMoney(grandTotal)}</strong>.</span>`;
    } else if (status === 'dp') {
      paidAmountWrap.style.display = 'block';
      if (!paidAmountInput.value && grandTotal > 0) {
        paidAmountInput.value = Math.round(grandTotal / 2);
      }
      const paid = Number(paidAmountInput.value) || 0;
      const remaining = Math.max(0, grandTotal - paid);

      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#fff8e1';
      paymentSummary.style.color = '#855900';
      paymentSummary.style.border = '1px solid #ffe082';
      paymentSummary.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 3px; display:inline-flex; align-items:center; gap:4px;">${Icons.clock('icon-svg', 13)} Pembayaran Uang Muka (DP)</div><br />
        • ${isSale ? 'Uang DP Diterima di Kas' : 'Uang DP Dibayar dari Kas'}: <strong>${formatMoney(paid)}</strong><br />
        • Sisa ${isSale ? 'Tagihan (Piutang Pelanggan)' : 'Utang Supplier'}: <strong style="color: #c93b2b;">${formatMoney(remaining)}</strong> (${remaining <= 0 ? 'Lunas' : 'Belum Dilunasi'})
      `;
      cashDesc.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;">${Icons.info('icon-svg', 12)} Hanya uang DP sebesar <strong>${formatMoney(paid)}</strong> yang dibukukan ke kas. Sisa ${formatMoney(remaining)} dicatat sebagai catatan ${isSale ? 'piutang' : 'utang'}.</span>`;
    } else if (status === 'unpaid') {
      paidAmountWrap.style.display = 'none';
      paidAmountInput.value = '0';
      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#fdf2e9';
      paymentSummary.style.color = '#9c4d00';
      paymentSummary.style.border = '1px solid #fcd6b5';
      paymentSummary.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 3px; display:inline-flex; align-items:center; gap:4px;">${Icons.clipboard('icon-svg', 13)} ${isSale ? 'Penjualan Tempo / Piutang 100%' : 'Beli Tempo / Utang 100%'}</div><br />
        Barang fisik ${isSale ? 'keluar dikirim ke pembeli' : 'masuk diterima dari supplier'}. <strong>Tidak ada uang kas yang ${isSale ? 'masuk' : 'keluar'} saat ini (Rp 0)</strong>.<br />
        Total ${isSale ? 'piutang yang akan ditagih' : 'utang yang harus dibayar'}: <strong>${formatMoney(grandTotal)}</strong>.
      `;
      cashDesc.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;">${Icons.info('icon-svg', 12)} Saldo kas saat ini <strong>TIDAK terpengaruh (Rp 0)</strong> karena transaksi tempo/kredit.</span>`;
    }
  }

  function updateTypeState() {
    const type = moveTypeSelect.value;
    const isPurchase = type === 'in_purchase';
    const isSale = type === 'out_sale';

    if (type === 'in_production') {
      prodInfo.style.display = 'block';
      usageInfo.style.display = 'none';
      cashBox.style.display = 'none';
      syncCash.checked = false;
      partyWrap.style.display = 'block';
      partyLabel.innerHTML = 'Tim / Shift / Mesin Produksi <span class="optional">(opsional)</span>';
      partyInput.placeholder = 'Contoh: Shift Pagi, Mesin Cetak A, Batch #12';
      notesInput.placeholder = 'Contoh: Selesai rakit 500 box, SPK-089';
    } else if (type === 'out_usage') {
      prodInfo.style.display = 'none';
      usageInfo.style.display = 'block';
      cashBox.style.display = 'none';
      syncCash.checked = false;
      partyWrap.style.display = 'block';
      partyLabel.innerHTML = 'Keperluan Pemakaian / Keterangan Reject <span class="optional">(opsional)</span>';
      partyInput.placeholder = 'Contoh: Sampel display, Rusak saat proses cetak';
      notesInput.placeholder = 'Contoh: Divisi marketing, QC afkir';
    } else {
      prodInfo.style.display = 'none';
      usageInfo.style.display = 'none';
      cashBox.style.display = 'block';
      syncCash.checked = true;
      cashFields.style.display = 'block';

      partyWrap.style.display = 'block';
      if (isPurchase) {
        partyLabel.innerHTML = 'Nama Supplier / Tempat Beli <span class="optional">(opsional)</span>';
        partyInput.placeholder = 'Contoh: PT Kertas Nusantara, Toko Bahan Abadi';
        notesInput.placeholder = 'Contoh: Nomor Nota #123, kontak supplier';
      } else {
        partyLabel.innerHTML = 'Nama Pembeli / Pelanggan <span class="optional">(opsional)</span>';
        partyInput.placeholder = 'Contoh: Toko Berkah, CV Mandiri, Pak Hendra';
        notesInput.placeholder = 'Contoh: No. Faktur / Invoice #456, alamat kirim';
      }

      // Refresh default prices for all rows according to current type (selling vs purchase)
      orderItems.forEach((it) => {
        const p = state.products.find((prod) => prod.id === it.productId);
        it.unitPrice = isPurchase ? (Number(p?.purchase_price) || 0) : (Number(p?.selling_price) || 0);
      });
    }

    renderOrderItems();
  }

  // Event Listeners for dynamic item row events
  itemsContainer.addEventListener('change', (e) => {
    const sel = e.target.closest('.item-product-select');
    if (sel) {
      const id = Number(sel.dataset.id);
      const item = orderItems.find((it) => it.id === id);
      if (item) {
        item.productId = sel.value;
        const p = state.products.find((prod) => prod.id === sel.value);
        const isPurchase = moveTypeSelect.value === 'in_purchase';
        item.unitPrice = isPurchase ? (Number(p?.purchase_price) || 0) : (Number(p?.selling_price) || 0);
        renderOrderItems();
      }
    }
  });

  itemsContainer.addEventListener('input', (e) => {
    const qtyInput = e.target.closest('.item-qty-input');
    if (qtyInput) {
      const id = Number(qtyInput.dataset.id);
      const item = orderItems.find((it) => it.id === id);
      if (item) {
        item.quantity = Number(qtyInput.value) || 0;
        const subDisplay = form.querySelector(`#subtotal-${id}`);
        if (subDisplay) subDisplay.textContent = formatMoney(Math.round(item.quantity * item.unitPrice));
        updateTotals();
      }
      return;
    }

    const priceInput = e.target.closest('.item-price-input');
    if (priceInput) {
      const id = Number(priceInput.dataset.id);
      const item = orderItems.find((it) => it.id === id);
      if (item) {
        item.unitPrice = Number(priceInput.value) || 0;
        const subDisplay = form.querySelector(`#subtotal-${id}`);
        if (subDisplay) subDisplay.textContent = formatMoney(Math.round(item.quantity * item.unitPrice));
        updateTotals();
      }
    }
  });

  itemsContainer.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.btn-del-item');
    if (delBtn) {
      if (orderItems.length <= 1) return;
      const id = Number(delBtn.dataset.id);
      orderItems = orderItems.filter((it) => it.id !== id);
      renderOrderItems();
    }
  });

  btnAddItem.addEventListener('click', () => {
    const isPurchase = moveTypeSelect.value === 'in_purchase';
    const firstProd = state.products[0];
    const newPrice = isPurchase ? (Number(firstProd?.purchase_price) || 0) : (Number(firstProd?.selling_price) || 0);

    orderItems.push({
      id: nextItemId++,
      productId: firstProd?.id || '',
      quantity: 1,
      unitPrice: newPrice,
    });

    renderOrderItems();
  });

  moveTypeSelect.addEventListener('change', updateTypeState);
  paymentStatusSelect.addEventListener('change', () => updatePaymentCalc());
  paidAmountInput.addEventListener('input', () => updatePaymentCalc());
  syncCash.addEventListener('change', () => {
    cashFields.style.display = syncCash.checked ? 'block' : 'none';
  });

  updateTypeState();

  // FORM SUBMISSION HANDLER
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const moveType = formData.get('movement_type');
    const dir = (moveType === 'in_production' || moveType === 'in_purchase') ? 'in' : 'out';
    const occ = formData.get('occurred_on') || localDate;
    const rawNotes = (formData.get('notes') || '').trim();
    const shouldSyncCash = (moveType === 'in_purchase' || moveType === 'out_sale') && formData.has('sync_cash');
    const payStatus = formData.get('payment_status') || 'paid';
    const partyName = (formData.get('party_name') || '').trim();

    // Validate Items
    if (!orderItems.length) {
      showError('Harap tambahkan minimal 1 item produk.');
      return;
    }

    for (const item of orderItems) {
      if (!item.productId) {
        showError('Pilih produk yang valid untuk setiap baris.');
        return;
      }
      if (item.quantity <= 0) {
        showError('Jumlah unit produk harus lebih dari 0.');
        return;
      }
    }

    // Check stocks for outbound movements
    if (dir === 'out') {
      const stockUsage = {};
      for (const item of orderItems) {
        stockUsage[item.productId] = (stockUsage[item.productId] || 0) + item.quantity;
      }
      for (const [pId, neededQty] of Object.entries(stockUsage)) {
        const available = stockFor(pId);
        if (neededQty > available) {
          const p = state.products.find((prod) => prod.id === pId);
          showError(`Stok "${p?.name || 'Produk'}" tidak mencukupi. Dibutuhkan: ${formatQuantity(neededQty)} ${p?.unit || 'unit'}, Stok ada: ${formatQuantity(available)} ${p?.unit || 'unit'}.`);
          return;
        }
      }
    }

    // Calculate Grand Total
    const grandTotal = orderItems.reduce((sum, it) => sum + Math.round((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0);
    let actualPaidAmount = grandTotal;
    if (payStatus === 'dp') {
      actualPaidAmount = Number(formData.get('paid_amount')) || 0;
    } else if (payStatus === 'unpaid') {
      actualPaidAmount = 0;
    }
    const remainingAmount = Math.max(0, grandTotal - actualPaidAmount);

    // Generate unique Nota ID
    const notaId = 'JW-' + occ.replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    let partyRole = '';
    if (moveType === 'out_sale') partyRole = 'Pembeli: ' + (partyName || 'Pelanggan');
    else if (moveType === 'in_purchase') partyRole = 'Supplier: ' + (partyName || 'Supplier');
    else if (moveType === 'in_production') partyRole = 'Produksi: ' + (partyName || 'Pabrik');
    else if (moveType === 'out_usage') partyRole = 'Keperluan: ' + (partyName || 'Operasional Pabrik');

    let insertedCashId = null;
    let firstInsertedInvId = null;

    await runMutation(async () => {
      // 1. Insert inventory movements for each item
      for (let i = 0; i < orderItems.length; i++) {
        const it = orderItems[i];
        const prod = state.products.find((p) => p.id === it.productId);
        const subtotal = Math.round(it.quantity * it.unitPrice);

        let itemStatusTag = '[Hasil Produksi]';
        if (moveType === 'out_usage') {
          itemStatusTag = '[Pemakaian Internal]';
        } else if (moveType === 'in_purchase') {
          itemStatusTag = payStatus === 'dp'
            ? `[Beli DP ${formatMoney(actualPaidAmount)} · Sisa Utang ${formatMoney(remainingAmount)}]`
            : (payStatus === 'unpaid' ? `[Beli Tempo/Utang ${formatMoney(grandTotal)}]` : '[Beli Lunas]');
        } else if (moveType === 'out_sale') {
          itemStatusTag = payStatus === 'dp'
            ? `[Penjualan DP ${formatMoney(actualPaidAmount)} · Sisa Piutang ${formatMoney(remainingAmount)}]`
            : (payStatus === 'unpaid' ? `[Penjualan Tempo/Piutang ${formatMoney(grandTotal)}]` : '[Penjualan Lunas]');
        }

        const itemNote = `${itemStatusTag} [Nota #${notaId}] @ ${formatMoney(it.unitPrice)} · Item ${i + 1}/${orderItems.length}: ${prod?.name || 'Produk'} (${formatQuantity(it.quantity)} ${prod?.unit || 'unit'}) · ${partyRole}${rawNotes ? ' · ' + rawNotes : ''}`;

        const { data: invData, error: invError } = await db.from('inventory_movements').insert({
          product_id: it.productId,
          direction: dir,
          quantity: it.quantity,
          occurred_on: occ,
          notes: itemNote,
        });

        if (invError) return invError;
        if (!firstInsertedInvId && invData?.id) firstInsertedInvId = invData.id;
      }

      // 2. Insert consolidated cash record
      if (shouldSyncCash && actualPaidAmount > 0) {
        const isSale = dir === 'out';
        const category = isSale
          ? (payStatus === 'dp' ? 'Penjualan Produk (DP)' : 'Penjualan Produk')
          : (payStatus === 'dp' ? 'Belanja Bahan Baku / Barang (DP)' : 'Belanja Bahan Baku / Barang');

        const itemsSummary = orderItems.length === 1
          ? `${formatQuantity(orderItems[0].quantity)} ${state.products.find((p) => p.id === orderItems[0].productId)?.unit || 'unit'} ${state.products.find((p) => p.id === orderItems[0].productId)?.name || 'Produk'}`
          : `${orderItems.length} jenis produk (${orderItems.reduce((s, it) => s + it.quantity, 0)} unit)`;

        const cashDesc = isSale
          ? (payStatus === 'dp'
              ? `DP Penjualan ${itemsSummary} [Nota #${notaId}] · Diterima: ${formatMoney(actualPaidAmount)} (Sisa Tagihan: ${formatMoney(remainingAmount)}) · ${partyRole}${rawNotes ? ' · ' + rawNotes : ''}`
              : `Penjualan ${itemsSummary} (Lunas) [Nota #${notaId}] · ${partyRole}${rawNotes ? ' · ' + rawNotes : ''}`)
          : (payStatus === 'dp'
              ? `DP Belanja ${itemsSummary} [Nota #${notaId}] · Dibayar: ${formatMoney(actualPaidAmount)} (Sisa Utang: ${formatMoney(remainingAmount)}) · ${partyRole}${rawNotes ? ' · ' + rawNotes : ''}`
              : `Belanja ${itemsSummary} (Lunas) [Nota #${notaId}] · ${partyRole}${rawNotes ? ' · ' + rawNotes : ''}`);

        const { data: cashData, error: cashError } = await db.from('cash_transactions').insert({
          direction: isSale ? 'in' : 'out',
          amount: actualPaidAmount,
          category,
          description: cashDesc,
          occurred_on: occ,
        });

        if (cashError) return cashError;
        if (cashData?.id) insertedCashId = cashData.id;
      }

      return null;
    }, moveType === 'in_production'
      ? `Stok hasil produksi (${orderItems.length} item barang) berhasil ditambahkan ke persediaan.`
      : (moveType === 'out_sale' && payStatus === 'dp'
        ? `Nota #${notaId} tersimpan: Stok berkurang & DP sebesar ${formatMoney(actualPaidAmount)} masuk kas (Sisa piutang: ${formatMoney(remainingAmount)}).`
        : (moveType === 'out_sale' && payStatus === 'unpaid'
          ? `Nota #${notaId} (Tempo) tersimpan: Stok berkurang & piutang tercatat ${formatMoney(grandTotal)}.`
          : (shouldSyncCash && actualPaidAmount > 0
            ? `Nota #${notaId} (${orderItems.length} item, total ${formatMoney(grandTotal)}) berhasil dicatat.`
            : `Pergerakan barang Nota #${notaId} (${orderItems.length} item) berhasil dicatat.`))), async () => {
      await refreshData();
      window.dispatchEvent(new CustomEvent('app:rerender'));
      if (typeof onSaved === 'function') onSaved();

      // Automatically open the Nota detail modal so the user can immediately view/print the receipt
      if (insertedCashId) {
        openReportDetailModal('cash', insertedCashId, occ.slice(0, 7));
      } else if (firstInsertedInvId) {
        openReportDetailModal('inventory', firstInsertedInvId, occ.slice(0, 7));
      }
    });
  });
}

export function openMovementModal(product = null, direction = 'in', kind = 'Produksi', onSaved = null) {
  const initialType = kind === 'Produksi' ? 'in_production' : (direction === 'in' ? 'in_purchase' : 'out_sale');
  const initialProductId = typeof product === 'string' ? product : product?.id;
  return openInventoryModal(appState, initialType, initialProductId, onSaved);
}
