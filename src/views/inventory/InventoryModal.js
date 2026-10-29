import { openDialog } from '../../components/Dialog.js';
import { notify } from '../../components/Toast.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { runMutation } from '../../utils/mutation.js';
import { formatMoney, formatQuantity, localDate } from '../../utils/formatters.js';
import { stockFor, state as appState } from '../../store/state.js';
import { db } from '../../api/db.js';

export function openInventoryModal(state, initialType = 'in_production', initialProductId = null, onSaved = null) {
  if (!state.products.length) {
    notify('Tambahkan produk terlebih dahulu sebelum mencatat persediaan.', 'error');
    state.page = 'products';
    return;
  }
  const defaultPid = initialProductId || state.products[0]?.id;
  const options = state.products.map((product) => `
    <option value="${escapeHtml(product.id)}" data-purchase="${product.purchase_price || 0}" data-selling="${product.selling_price || 0}" data-unit="${escapeHtml(product.unit)}" ${product.id === defaultPid ? 'selected' : ''}>
      ${escapeHtml(product.name)} · stok ${formatQuantity(stockFor(product.id))} ${escapeHtml(product.unit)}
    </option>`).join('');

  const dialogTitle = initialType === 'in_production' ? 'Tambah Stok Hasil Produksi Pabrik' : 'Catat pergerakan barang';

  openDialog(dialogTitle, `
    <form id="inventory-form" class="form-stack">
      <label>Jenis pergerakan
        <select name="movement_type" id="inv-movement-type" required>
          <option value="in_production" ${initialType === 'in_production' ? 'selected' : ''}>🏭 Barang Masuk: Hasil Produksi Sendiri (Barang Jadi)</option>
          <option value="in_purchase" ${initialType === 'in_purchase' ? 'selected' : ''}>🛒 Barang Masuk: Belanja / Beli dari Supplier (Bahan Baku / Kulakan)</option>
          <option value="out_sale" ${initialType === 'out_sale' ? 'selected' : ''}>🚚 Barang Keluar: Penjualan ke Pelanggan (Pesanan Kirim)</option>
          <option value="out_usage" ${initialType === 'out_usage' ? 'selected' : ''}>📦 Barang Keluar: Pemakaian Internal / Reject (Rusak)</option>
        </select>
      </label>

      <label>Produk yang dicatat<select name="product_id" id="inv-product" required>${options}</select></label>
      
      <div class="form-row">
        <label>Jumlah unit
          <input name="quantity" id="inv-qty" type="number" min="0.01" step="0.01" placeholder="0" required />
        </label>
        <label>Tanggal pergerakan
          <input name="occurred_on" type="date" value="${localDate}" required />
        </label>
      </div>

      <!-- Info Box Khusus Hasil Produksi -->
      <div class="formula-note" id="inv-prod-info" style="margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px; background: #edf7f0; border-left: 4px solid #187554; color: #187554;">
        <div style="font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">
          <span>🏭</span> Produksi Pabrik Sendiri
        </div>
        <div style="font-size: 11px; line-height: 1.5; color: #205c3d;">
          Stok fisik barang jadi akan <strong>bertambah</strong> tanpa memotong kas belanja perusahaan. Biaya bahan baku dan gaji pekerja pabrik telah dicatat terpisah pada buku kas dan absensi harian.
        </div>
      </div>

      <!-- Info Box Pemakaian Internal / Reject -->
      <div class="formula-note" id="inv-usage-info" style="display: none; margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px; background: #fff8e1; border-left: 4px solid #fbc02d; color: #7f6000;">
        <div style="font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">
          <span>📦</span> Pemakaian Internal / Reject (Rusak)
        </div>
        <div style="font-size: 11px; line-height: 1.5; color: #6d4c00;">
          Stok fisik akan <strong>berkurang</strong> karena digunakan untuk keperluan internal pabrik, sampel, atau afkir (rusak). Transaksi keuangan tidak terpengaruh.
        </div>
      </div>

      <!-- Cash Box untuk Pembelian Supplier atau Penjualan Pelanggan -->
      <div class="formula-note" id="inv-cash-box" style="display: none; margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px;">
        <label class="checkbox-label" style="font-weight: 700; color: #187554; display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" name="sync_cash" id="inv-sync-cash" checked />
          <span>Sinkronkan ke Keuangan Otomatis</span>
        </label>
        <div id="inv-cash-fields">
          <div class="form-row">
            <label id="inv-unit-price-label">Harga Satuan (Rp)
              <input name="unit_price" id="inv-unit-price" type="number" min="0" step="1" placeholder="0" />
            </label>
            <label id="inv-total-label">Total Nilai Tagihan (Rp)
              <input name="total_amount" id="inv-total-amount" type="number" min="0" step="1" placeholder="0" />
            </label>
          </div>

          <!-- OPSI METODE / STATUS PEMBAYARAN -->
          <div id="inv-payment-box" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbe2d5;">
            <div class="form-row">
              <label>Status / Metode Pembayaran
                <select name="payment_status" id="inv-payment-status">
                  <option value="paid">✓ Lunas Langsung (Dibayar 100%)</option>
                  <option value="dp">⏳ Bayar Uang Muka / DP Dulu</option>
                  <option value="unpaid">📋 Belum Dibayar (Tempo / Piutang Penuh)</option>
                </select>
              </label>
              <label id="inv-paid-amount-wrap" style="display: none;">
                <span id="inv-paid-amount-title">Nominal DP Diterima (Rp)</span>
                <input name="paid_amount" id="inv-paid-amount" type="number" min="0" step="1" placeholder="0" />
              </label>
            </div>
            <div id="inv-payment-summary" style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; font-size: 11px; line-height: 1.5; background: #edf7f0; color: #187554;">
            </div>
          </div>

          <div id="inv-cash-desc" style="font-size: 10px; color: #3a6850; margin-top: 6px; line-height: 1.5;">
            💡 Dicatat otomatis ke buku kas.
          </div>
        </div>
      </div>

      <!-- Input Khusus Pihak Terkait (Nama Pembeli / Nama Supplier / Tim) -->
      <label id="inv-party-wrap">
        <span id="inv-party-label">Nama Pembeli / Pelanggan <span class="optional">(opsional)</span></span>
        <input name="party_name" id="inv-party-name" maxlength="120" placeholder="Contoh: Toko Berkah, CV Mandiri, Pak Hendra" />
      </label>

      <label>Catatan Tambahan <span class="optional">(opsional)</span>
        <input name="notes" id="inv-notes" maxlength="240" placeholder="Keterangan pergerakan atau nomor nota/invoice" />
      </label>
      
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button class="button button-primary" type="submit">Simpan catatan</button>
      </div>
    </form>`);

  const form = document.querySelector('#inventory-form');
  const productSelect = form.querySelector('#inv-product');
  const moveTypeSelect = form.querySelector('#inv-movement-type');
  const qtyInput = form.querySelector('#inv-qty');
  const syncCash = form.querySelector('#inv-sync-cash');
  const cashBox = form.querySelector('#inv-cash-box');
  const cashFields = form.querySelector('#inv-cash-fields');
  const prodInfo = form.querySelector('#inv-prod-info');
  const usageInfo = form.querySelector('#inv-usage-info');
  const priceLabel = form.querySelector('#inv-unit-price-label');
  const unitPriceInput = form.querySelector('#inv-unit-price');
  const totalAmountInput = form.querySelector('#inv-total-amount');
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

  function updatePaymentCalc() {
    const isSale = moveTypeSelect.value === 'out_sale';
    const isPurchase = moveTypeSelect.value === 'in_purchase';
    if (!isSale && !isPurchase) return;

    const total = Number(totalAmountInput.value) || 0;
    const status = paymentStatusSelect.value;

    paidAmountTitle.textContent = isSale ? 'Nominal DP Diterima di Kas (Rp)' : 'Nominal DP Dibayar dari Kas (Rp)';

    if (status === 'paid') {
      paidAmountWrap.style.display = 'none';
      paidAmountInput.value = total || '';
      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#edf7f0';
      paymentSummary.style.color = '#187554';
      paymentSummary.style.border = '1px solid #c2e7cc';
      paymentSummary.innerHTML = `✓ <strong>Lunas Langsung (100%)</strong>: Uang kas ${isSale ? 'masuk' : 'keluar'} penuh sebesar <strong>${formatMoney(total)}</strong>.`;
      cashDesc.innerHTML = `💡 Otomatis dicatat sebagai <strong>${isSale ? 'Kas Masuk (Penjualan Produk)' : 'Kas Keluar (Belanja Barang)'}</strong> sebesar <strong>${formatMoney(total)}</strong>.`;
    } else if (status === 'dp') {
      paidAmountWrap.style.display = 'block';
      if (!paidAmountInput.value && total > 0) {
        paidAmountInput.value = Math.round(total / 2);
      }
      const paid = Number(paidAmountInput.value) || 0;
      const remaining = Math.max(0, total - paid);

      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#fff8e1';
      paymentSummary.style.color = '#855900';
      paymentSummary.style.border = '1px solid #ffe082';
      paymentSummary.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 3px;">⏳ Pembayaran Uang Muka (DP)</div>
        • ${isSale ? 'Uang DP Diterima di Kas' : 'Uang DP Dibayar dari Kas'}: <strong>${formatMoney(paid)}</strong><br />
        • Sisa ${isSale ? 'Tagihan (Piutang Pelanggan)' : 'Utang Supplier'}: <strong style="color: #c93b2b;">${formatMoney(remaining)}</strong> (${remaining <= 0 ? 'Lunas' : 'Belum Dilunasi'})
      `;
      cashDesc.innerHTML = `💡 Hanya uang DP sebesar <strong>${formatMoney(paid)}</strong> yang dibukukan ke kas. Sisa ${formatMoney(remaining)} dicatat sebagai catatan ${isSale ? 'piutang' : 'utang'}.`;
    } else if (status === 'unpaid') {
      paidAmountWrap.style.display = 'none';
      paidAmountInput.value = '0';
      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#fdf2e9';
      paymentSummary.style.color = '#9c4d00';
      paymentSummary.style.border = '1px solid #fcd6b5';
      paymentSummary.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 3px;">📋 ${isSale ? 'Penjualan Tempo / Piutang 100%' : 'Beli Tempo / Utang 100%'}</div>
        Barang fisik ${isSale ? 'keluar dikirim ke pembeli' : 'masuk diterima dari supplier'}. <strong>Tidak ada uang kas yang ${isSale ? 'masuk' : 'keluar'} saat ini (Rp 0)</strong>.<br />
        Total ${isSale ? 'piutang yang akan ditagih' : 'utang yang harus dibayar'}: <strong>${formatMoney(total)}</strong>.
      `;
      cashDesc.innerHTML = `💡 Saldo kas saat ini <strong>TIDAK terpengaruh (Rp 0)</strong> karena transaksi tempo/kredit.`;
    }
  }

  function updateTypeState(autoFill = true) {
    const type = moveTypeSelect.value;
    const selectedOption = productSelect.selectedOptions[0];

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

      const isPurchase = type === 'in_purchase';
      const defaultPrice = Number(isPurchase ? selectedOption?.dataset.purchase : selectedOption?.dataset.selling) || 0;
      if (autoFill) {
        unitPriceInput.value = defaultPrice || '';
      }
      priceLabel.childNodes[0].nodeValue = isPurchase ? 'Harga Beli Satuan (Rp) ' : 'Harga Jual Satuan (Rp) ';
      
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

      const qty = Number(qtyInput.value) || 0;
      const unitPrice = Number(unitPriceInput.value) || 0;
      const calcTotal = Math.round(qty * unitPrice);

      if (autoFill || !totalAmountInput.value) {
        totalAmountInput.value = calcTotal || '';
      }

      updatePaymentCalc();
    }
  }

  productSelect.addEventListener('change', () => updateTypeState(true));
  moveTypeSelect.addEventListener('change', () => updateTypeState(true));
  qtyInput.addEventListener('input', () => {
    const qty = Number(qtyInput.value) || 0;
    const unitPrice = Number(unitPriceInput.value) || 0;
    totalAmountInput.value = Math.round(qty * unitPrice) || '';
    updateTypeState(false);
  });
  unitPriceInput.addEventListener('input', () => {
    const qty = Number(qtyInput.value) || 0;
    const unitPrice = Number(unitPriceInput.value) || 0;
    totalAmountInput.value = Math.round(qty * unitPrice) || '';
    updateTypeState(false);
  });
  totalAmountInput.addEventListener('input', () => {
    updatePaymentCalc();
  });
  paymentStatusSelect.addEventListener('change', () => {
    updatePaymentCalc();
  });
  paidAmountInput.addEventListener('input', () => {
    updatePaymentCalc();
  });
  syncCash.addEventListener('change', () => {
    cashFields.style.display = syncCash.checked ? 'block' : 'none';
  });

  updateTypeState(true);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const pId = formData.get('product_id');
    const moveType = formData.get('movement_type');
    const dir = (moveType === 'in_production' || moveType === 'in_purchase') ? 'in' : 'out';
    const qty = Number(formData.get('quantity'));
    const occ = formData.get('occurred_on');
    const rawNotes = formData.get('notes').trim();
    const shouldSyncCash = (moveType === 'in_purchase' || moveType === 'out_sale') && formData.has('sync_cash');
    const totalAmount = Number(formData.get('total_amount')) || 0;
    const payStatus = formData.get('payment_status') || 'paid';

    let actualPaidAmount = totalAmount;
    if (payStatus === 'dp') {
      actualPaidAmount = Number(formData.get('paid_amount')) || 0;
    } else if (payStatus === 'unpaid') {
      actualPaidAmount = 0;
    }
    const remainingAmount = Math.max(0, totalAmount - actualPaidAmount);

    const partyName = (formData.get('party_name') || '').trim();
    const product = state.products.find((item) => item.id === pId);
    const prodName = product?.name || 'Produk';
    const prodUnit = product?.unit || 'unit';

    let detailsText = '';
    if (moveType === 'out_sale') {
      if (partyName) detailsText += `Pembeli: ${partyName}`;
    } else if (moveType === 'in_purchase') {
      if (partyName) detailsText += `Supplier: ${partyName}`;
    } else if (moveType === 'in_production') {
      if (partyName) detailsText += `Produksi: ${partyName}`;
    } else if (moveType === 'out_usage') {
      if (partyName) detailsText += `Keperluan: ${partyName}`;
    }

    if (rawNotes) {
      detailsText = detailsText ? `${detailsText} · ${rawNotes}` : rawNotes;
    }

    let formattedNotes = detailsText;
    if (moveType === 'in_production') {
      formattedNotes = detailsText ? `[Hasil Produksi] ${detailsText}` : '[Hasil Produksi] Selesai produksi pabrik';
    } else if (moveType === 'out_usage') {
      formattedNotes = detailsText ? `[Pemakaian Internal] ${detailsText}` : '[Pemakaian Internal] Operasional / Reject';
    } else if (moveType === 'in_purchase') {
      let payPrefix = '[Beli Lunas]';
      if (payStatus === 'dp') payPrefix = `[Beli DP ${formatMoney(actualPaidAmount)} · Sisa Utang ${formatMoney(remainingAmount)}]`;
      else if (payStatus === 'unpaid') payPrefix = `[Beli Tempo/Utang ${formatMoney(totalAmount)}]`;
      formattedNotes = detailsText ? `${payPrefix} ${detailsText}` : payPrefix;
    } else if (moveType === 'out_sale') {
      let payPrefix = '[Penjualan Lunas]';
      if (payStatus === 'dp') payPrefix = `[Penjualan DP ${formatMoney(actualPaidAmount)} · Sisa Piutang ${formatMoney(remainingAmount)}]`;
      else if (payStatus === 'unpaid') payPrefix = `[Penjualan Tempo/Piutang ${formatMoney(totalAmount)}]`;
      formattedNotes = detailsText ? `${payPrefix} ${detailsText}` : payPrefix;
    }

    await runMutation(async () => {
      if (dir === 'out' && qty > stockFor(pId)) {
        return { message: `Stok tidak mencukupi. Stok saat ini: ${formatQuantity(stockFor(pId))} ${prodUnit}` };
      }

      const { error: invError } = await db.from('inventory_movements').insert({
        product_id: pId,
        direction: dir,
        quantity: qty,
        occurred_on: occ,
        notes: formattedNotes,
      });
      if (invError) return invError;

      if (shouldSyncCash && actualPaidAmount > 0) {
        const isSale = dir === 'out';
        const category = isSale
          ? (payStatus === 'dp' ? 'Penjualan Produk (DP)' : 'Penjualan Produk')
          : (payStatus === 'dp' ? 'Belanja Bahan Baku / Barang (DP)' : 'Belanja Bahan Baku / Barang');
        const description = isSale
          ? (payStatus === 'dp'
              ? `DP Penjualan ${formatQuantity(qty)} ${prodUnit} ${prodName} · Diterima: ${formatMoney(actualPaidAmount)} (Sisa Tagihan: ${formatMoney(remainingAmount)})${detailsText ? ` · ${detailsText}` : ''}`
              : `Penjualan ${formatQuantity(qty)} ${prodUnit} ${prodName} (Lunas)${detailsText ? ` · ${detailsText}` : ''}`)
          : (payStatus === 'dp'
              ? `DP Belanja ${formatQuantity(qty)} ${prodUnit} ${prodName} · Dibayar: ${formatMoney(actualPaidAmount)} (Sisa Utang: ${formatMoney(remainingAmount)})${detailsText ? ` · ${detailsText}` : ''}`
              : `Belanja ${formatQuantity(qty)} ${prodUnit} ${prodName} (Lunas)${detailsText ? ` · ${detailsText}` : ''}`);

        const { error: cashError } = await db.from('cash_transactions').insert({
          direction: isSale ? 'in' : 'out',
          amount: actualPaidAmount,
          category,
          description,
          occurred_on: occ,
        });
        if (cashError) return cashError;
      }
      return null;
    }, moveType === 'in_production'
      ? `Stok hasil produksi (${formatQuantity(qty)} ${prodUnit} ${prodName}) berhasil ditambahkan ke persediaan.`
      : (moveType === 'out_sale' && payStatus === 'dp'
        ? `Penjualan dicatat. Stok berkurang & DP sebesar ${formatMoney(actualPaidAmount)} masuk ke kas (Sisa piutang: ${formatMoney(remainingAmount)}).`
        : (moveType === 'out_sale' && payStatus === 'unpaid'
          ? `Penjualan tempo dicatat. Stok berkurang & piutang pembeli tercatat ${formatMoney(totalAmount)}.`
          : (shouldSyncCash && actualPaidAmount > 0
            ? 'Pergerakan barang dan transaksi kas berhasil dicatat.'
            : 'Pergerakan barang berhasil dicatat.'))), onSaved);
  });
}

export function openMovementModal(product = null, direction = 'in', kind = 'Produksi', onSaved = null) {
  const initialType = kind === 'Produksi' ? 'in_production' : (direction === 'in' ? 'in_purchase' : 'out_sale');
  const initialProductId = typeof product === 'string' ? product : product?.id;
  return openInventoryModal(appState, initialType, initialProductId, onSaved);
}
