import { openDialog, closeDialog } from '../../components/Dialog.js';
import { notify, showError } from '../../components/Toast.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { formatMoney, formatQuantity, localDate } from '../../utils/formatters.js';
import { stockFor, state as appState, refreshData } from '../../store/state.js';
import { db } from '../../api/db.js';
import { Icons } from '../../components/Icons.js';
import { openReportDetailModal } from '../reports/excelExport.js';

export function openSaleInvoiceModal(initialProductId = null, onSaved = null) {
  const state = appState;
  const availableProducts = (state.products || []).filter((p) => p && p.id);

  if (!availableProducts.length) {
    showError('Katalog barang masih kosong. Silakan tambah data barang terlebih dahulu.');
    return;
  }

  // Pre-generate invoice ref number
  const todayStr = typeof localDate === 'function' ? localDate() : (localDate || new Date().toISOString().slice(0, 10));
  const autoInvoiceRef = `PJ-${todayStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Default first row product
  const defaultPid = initialProductId || availableProducts[0].id;
  const defaultProd = availableProducts.find((p) => p.id === defaultPid) || availableProducts[0];

  let rowsState = [
    {
      id: Date.now(),
      productId: defaultProd.id,
      qty: 1,
      price: Number(defaultProd.selling_price) || 0,
    },
  ];

  function getProductOptionsHtml(selectedId) {
    return availableProducts.map((p) => {
      const stock = stockFor(p.id);
      const isSelected = p.id === selectedId;
      return `<option value="${escapeHtml(p.id)}" data-price="${p.selling_price || 0}" data-unit="${escapeHtml(p.unit || 'unit')}" data-stock="${stock}" ${isSelected ? 'selected' : ''}>
        ${escapeHtml(p.name)} · Stok: ${formatQuantity(stock)} ${escapeHtml(p.unit || 'unit')} · Rp ${Number(p.selling_price || 0).toLocaleString('id-ID')}
      </option>`;
    }).join('');
  }

  function renderTableRows() {
    const tbody = document.querySelector('#invoice-items-tbody');
    if (!tbody) return;

    tbody.innerHTML = rowsState.map((row, idx) => {
      const prod = availableProducts.find((p) => p.id === row.productId) || availableProducts[0];
      const stock = stockFor(prod.id);
      const subtotal = Math.round((Number(row.qty) || 0) * (Number(row.price) || 0));
      const isOverStock = (Number(row.qty) || 0) > stock;

      return `
        <tr data-row-id="${row.id}">
          <td class="align-center" style="vertical-align: middle; font-weight: 600; color: #555;">${idx + 1}</td>
          <td>
            <select class="item-product-select form-control" data-row-id="${row.id}" style="width: 100%; font-size: 13px;" required>
              ${getProductOptionsHtml(row.productId)}
            </select>
          </td>
          <td style="width: 130px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" class="item-qty-input form-control" data-row-id="${row.id}" min="0.01" step="any" value="${row.qty}" style="width: 80px; font-weight: 600; ${isOverStock ? 'border-color: #dd4b39; background: #fff5f5;' : ''}" required />
              <span class="item-unit-label" style="font-size: 11.5px; color: #777;">${escapeHtml(prod.unit || 'unit')}</span>
            </div>
            <div style="font-size: 10.5px; margin-top: 2px; color: ${isOverStock ? '#dd4b39' : (stock <= 0 ? '#dd4b39' : '#00a65a')}; font-weight: ${isOverStock ? '700' : 'normal'};">
              ${isOverStock ? `⚠ Melebihi stok (Tersedia: ${formatQuantity(stock)})` : `Sisa stok: ${formatQuantity(stock)}`}
            </div>
          </td>
          <td style="width: 145px;">
            <input type="number" class="item-price-input form-control" data-row-id="${row.id}" min="0" step="1" value="${row.price}" style="font-weight: 600; text-align: right;" required />
          </td>
          <td class="align-right" style="vertical-align: middle; width: 140px;">
            <strong class="item-subtotal-val" style="color: #00a65a; font-size: 13.5px;">${formatMoney(subtotal)}</strong>
          </td>
          <td class="align-center" style="vertical-align: middle; width: 45px;">
            <button type="button" class="btn btn-danger btn-xs btn-remove-item-row" data-row-id="${row.id}" title="Hapus baris ini" ${rowsState.length <= 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
              ${Icons.close('icon-svg', 13)}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    updateGrandCalculations();
  }

  function updateGrandCalculations() {
    let grandTotal = 0;
    let totalUnits = 0;
    let hasOverStock = false;

    rowsState.forEach((r) => {
      const q = Number(r.qty) || 0;
      const p = Number(r.price) || 0;
      grandTotal += Math.round(q * p);
      totalUnits += q;

      const currentStock = stockFor(r.productId);
      if (q > currentStock) hasOverStock = true;
    });

    const grandTotalEl = document.querySelector('#inv-grand-total');
    const totalUnitsEl = document.querySelector('#inv-total-units');
    const paidInput = document.querySelector('#inv-paid-amount');
    const payStatus = document.querySelector('#inv-payment-status')?.value || 'paid';
    const paySummaryEl = document.querySelector('#inv-payment-summary');
    const submitBtn = document.querySelector('#btn-submit-invoice');

    if (grandTotalEl) grandTotalEl.textContent = formatMoney(grandTotal);
    if (totalUnitsEl) totalUnitsEl.textContent = `${formatQuantity(totalUnits)} unit (${rowsState.length} macam barang)`;

    let actualPaid = grandTotal;
    let remaining = 0;

    if (payStatus === 'paid') {
      actualPaid = grandTotal;
      remaining = 0;
      if (paidInput) paidInput.value = grandTotal;
      if (paySummaryEl) {
        paySummaryEl.innerHTML = `<span style="color:#00a65a;">${Icons.checkCircle('icon-svg', 12)}</span> <strong>Lunas 100%:</strong> Uang sebesar <strong>${formatMoney(grandTotal)}</strong> akan langsung masuk ke Buku Kas Masuk.`;
      }
    } else if (payStatus === 'dp') {
      if (paidInput && (!paidInput.value || Number(paidInput.value) > grandTotal)) {
        paidInput.value = Math.round(grandTotal * 0.5);
      }
      actualPaid = Number(paidInput?.value) || 0;
      remaining = Math.max(0, grandTotal - actualPaid);
      if (paySummaryEl) {
        paySummaryEl.innerHTML = `<span>${Icons.cash('icon-svg', 12)}</span> <strong>Uang Muka (DP):</strong> Rp <strong>${formatMoney(actualPaid)}</strong> masuk ke kas sekarang. Sisa piutang sebesar <strong style="color:#c0392b;">${formatMoney(remaining)}</strong> dicatat sebagai tagihan pelanggan.`;
      }
    } else if (payStatus === 'unpaid') {
      actualPaid = 0;
      remaining = grandTotal;
      if (paidInput) paidInput.value = 0;
      if (paySummaryEl) {
        paySummaryEl.innerHTML = `<span>${Icons.clock('icon-svg', 12)}</span> <strong>Tempo / Piutang Penuh:</strong> Total tagihan <strong style="color:#c0392b;">${formatMoney(grandTotal)}</strong> dicatat sebagai piutang jatuh tempo. Kas belum bertambah sampai tagihan dilunasi.`;
      }
    }

    if (submitBtn) {
      if (hasOverStock) {
        submitBtn.disabled = true;
        submitBtn.title = 'Ada barang yang jumlahnya melebihi stok gudang';
      } else if (grandTotal <= 0) {
        submitBtn.disabled = true;
        submitBtn.title = 'Total tagihan harus lebih dari 0';
      } else {
        submitBtn.disabled = false;
        submitBtn.title = 'Simpan penjualan dan cetak nota';
      }
    }
  }

  // Open the dialog
  openDialog('🧾 Buat Nota Penjualan (Multi-Barang)', `
    <form id="sale-invoice-form" class="form-stack">
      <!-- HEADER ROW: Tanggal, No Nota, Pembeli -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px;">
        <div class="form-row">
          <label style="flex: 1;">Tanggal Transaksi
            <input name="occurred_on" id="inv-occurred-on" type="date" value="${todayStr}" required />
          </label>
          <label style="flex: 1.2;">No. Nota / Faktur
            <input name="invoice_ref" id="inv-ref-number" value="${escapeHtml(autoInvoiceRef)}" placeholder="PJ-..." required />
          </label>
          <label style="flex: 1.8;">Nama Pembeli / Pelanggan
            <input name="buyer_name" id="inv-buyer-name" placeholder="Contoh: Toko Barokah / Bpk. H. Ahmad" required />
          </label>
        </div>
      </div>

      <!-- DAFTAR BARANG YANG DIBELI -->
      <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <label style="margin: 0; font-size: 13.5px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
          <span>${Icons.products('icon-svg', 15)}</span> Daftar Barang yang Dipesan / Dikirim
        </label>
        <span style="font-size: 11px; color: #64748b;">Pilih barang dan jumlah unit yang dijual</span>
      </div>

      <div class="table-responsive" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff;">
        <table class="table table-bordered" style="margin-bottom: 0;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="width: 35px;" class="align-center">NO</th>
              <th>PRODUK / BARANG</th>
              <th style="width: 140px;">JUMLAH (QTY)</th>
              <th style="width: 145px;" class="align-right">HARGA SATUAN (RP)</th>
              <th style="width: 140px;" class="align-right">SUBTOTAL</th>
              <th style="width: 45px;" class="align-center">#</th>
            </tr>
          </thead>
          <tbody id="invoice-items-tbody">
            <!-- Dynamic rows will be inserted here -->
          </tbody>
        </table>
      </div>

      <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
        <button type="button" class="btn btn-default btn-sm" id="btn-add-invoice-row" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: #187554; border-color: #a5d6a7; background: #f0fdf4;">
          ${Icons.plus('icon-svg', 13)} Tambah Baris Barang Lain
        </button>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          Total kuantitas: <strong id="inv-total-units" style="color: #1e293b;">0 unit (0 macam)</strong>
        </div>
      </div>

      <!-- GRAND TOTAL & PEMBAYARAN BOX -->
      <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 14px 16px; margin-top: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 12px;">
          <div>
            <span style="font-size: 13px; font-weight: 700; color: #334155;">TOTAL NILAI FAKTUR / BELANJA:</span>
          </div>
          <div>
            <strong id="inv-grand-total" style="font-size: 22px; color: #187554; font-weight: 800;">Rp 0</strong>
          </div>
        </div>

        <div class="form-row">
          <label style="flex: 1.3;">Status / Cara Pembayaran
            <select name="payment_status" id="inv-payment-status">
              <option value="paid" selected>Lunas Langsung (100% Pembayaran Penuh)</option>
              <option value="dp">Bayar Uang Muka (DP) Dulu</option>
              <option value="unpaid">Tempo / Piutang Penuh (Belum Ada Bayar)</option>
            </select>
          </label>
          <label id="inv-dp-wrapper" style="flex: 1; display: none;">
            <span id="inv-dp-label">Nominal DP Diterima (Rp)</span>
            <input name="paid_amount" id="inv-paid-amount" type="number" min="0" step="1" placeholder="0" style="font-weight: 700; color: #187554;" />
          </label>
        </div>

        <div id="inv-payment-summary" style="margin-top: 8px; padding: 8px 12px; border-radius: 4px; font-size: 11.5px; background: #edf7f0; color: #187554;">
        </div>

        <label style="margin-top: 10px;">Catatan Penjualan / Pengiriman <span class="optional">(opsional)</span>
          <input name="notes" id="inv-notes" placeholder="Contoh: Kirim via Truk Colt Diesel · Sopir Pak Joko · Tempo 14 hari" />
        </label>
      </div>

      <div class="dialog-actions" style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button type="submit" class="button button-primary" id="btn-submit-invoice" style="background: #187554; border-color: #12583f; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 9px 18px;">
          ${Icons.printer('icon-svg', 14)} Simpan & Terbitkan Nota
        </button>
      </div>
    </form>
  `, 'wide');

  const form = document.querySelector('#sale-invoice-form');
  const tbody = document.querySelector('#invoice-items-tbody');
  const btnAddRow = document.querySelector('#btn-add-invoice-row');
  const payStatusSelect = document.querySelector('#inv-payment-status');
  const dpWrapper = document.querySelector('#inv-dp-wrapper');
  const paidInput = document.querySelector('#inv-paid-amount');

  // Initial render of items
  renderTableRows();

  // Event: Add row
  btnAddRow?.addEventListener('click', () => {
    // Pick the first product not yet in the list if available, else first
    const usedIds = new Set(rowsState.map((r) => r.productId));
    const nextProd = availableProducts.find((p) => !usedIds.has(p.id)) || availableProducts[0];

    rowsState.push({
      id: Date.now() + Math.random(),
      productId: nextProd.id,
      qty: 1,
      price: Number(nextProd.selling_price) || 0,
    });
    renderTableRows();
  });

  // Event: Table row changes (delegated on tbody)
  tbody?.addEventListener('change', (e) => {
    const target = e.target;
    const rowId = target.dataset.rowId;
    const row = rowsState.find((r) => String(r.id) === String(rowId));
    if (!row) return;

    if (target.classList.contains('item-product-select')) {
      const selectedPid = target.value;
      const prod = availableProducts.find((p) => p.id === selectedPid);
      row.productId = selectedPid;
      if (prod) {
        row.price = Number(prod.selling_price) || 0;
      }
      renderTableRows();
    }
  });

  tbody?.addEventListener('input', (e) => {
    const target = e.target;
    const rowId = target.dataset.rowId;
    const row = rowsState.find((r) => String(r.id) === String(rowId));
    if (!row) return;

    if (target.classList.contains('item-qty-input')) {
      row.qty = Number(target.value) || 0;
      const tr = target.closest('tr');
      const prod = availableProducts.find((p) => p.id === row.productId);
      const stock = stockFor(prod?.id);
      const isOverStock = row.qty > stock;
      target.style.borderColor = isOverStock ? '#dd4b39' : '';
      target.style.background = isOverStock ? '#fff5f5' : '';

      const subtotalEl = tr?.querySelector('.item-subtotal-val');
      if (subtotalEl) subtotalEl.textContent = formatMoney(Math.round(row.qty * row.price));

      updateGrandCalculations();
    } else if (target.classList.contains('item-price-input')) {
      row.price = Number(target.value) || 0;
      const tr = target.closest('tr');
      const subtotalEl = tr?.querySelector('.item-subtotal-val');
      if (subtotalEl) subtotalEl.textContent = formatMoney(Math.round(row.qty * row.price));

      updateGrandCalculations();
    }
  });

  tbody?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-item-row');
    if (!btn || rowsState.length <= 1) return;
    const rowId = btn.dataset.rowId;
    rowsState = rowsState.filter((r) => String(r.id) !== String(rowId));
    renderTableRows();
  });

  // Payment status change
  payStatusSelect?.addEventListener('change', () => {
    const val = payStatusSelect.value;
    if (dpWrapper) {
      dpWrapper.style.display = val === 'dp' ? 'block' : 'none';
    }
    updateGrandCalculations();
  });

  paidInput?.addEventListener('input', () => {
    updateGrandCalculations();
  });

  // Form submit handler
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.querySelector('#btn-submit-invoice');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan & Menerbitkan Nota…';
    }

    const formData = new FormData(form);
    const occurredOn = formData.get('occurred_on');
    const invoiceRef = (formData.get('invoice_ref') || '').trim() || autoInvoiceRef;
    const buyerName = (formData.get('buyer_name') || '').trim() || 'Pelanggan Umum';
    const payStatus = formData.get('payment_status') || 'paid';
    const notesRaw = (formData.get('notes') || '').trim();

    // Validate rows
    const validItems = rowsState.filter((r) => (Number(r.qty) || 0) > 0 && r.productId);
    if (!validItems.length) {
      showError('Harap masukkan minimal 1 barang dengan jumlah lebih dari 0.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${Icons.printer('icon-svg', 14)} Simpan & Terbitkan Nota`;
      }
      return;
    }

    // Verify stock
    for (const item of validItems) {
      const prod = availableProducts.find((p) => p.id === item.productId);
      const stock = stockFor(item.productId);
      if (item.qty > stock) {
        showError(`Stok tidak mencukupi untuk "${prod?.name || 'Produk'}". Sisa stok fisik hanya ${formatQuantity(stock)} ${prod?.unit || 'unit'}.`);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `${Icons.printer('icon-svg', 14)} Simpan & Terbitkan Nota`;
        }
        return;
      }
    }

    // Calculations
    let grandTotal = 0;
    const mappedItems = validItems.map((it) => {
      const prod = availableProducts.find((p) => p.id === it.productId);
      const subtotal = Math.round(Number(it.qty) * Number(it.price));
      grandTotal += subtotal;
      return {
        productId: it.productId,
        name: prod?.name || 'Produk',
        unit: prod?.unit || 'unit',
        qty: Number(it.qty),
        price: Number(it.price),
        total: subtotal,
      };
    });

    let actualPaidAmount = grandTotal;
    let remainingAmount = 0;

    if (payStatus === 'dp') {
      actualPaidAmount = Math.max(0, Number(formData.get('paid_amount')) || 0);
      remainingAmount = Math.max(0, grandTotal - actualPaidAmount);
    } else if (payStatus === 'unpaid') {
      actualPaidAmount = 0;
      remainingAmount = grandTotal;
    }

    const newCashId = `cash-${Date.now()}`;
    const itemsMeta = {
      ref: invoiceRef,
      buyer: buyerName,
      date: occurredOn,
      status: payStatus,
      totalAmount: grandTotal,
      paidAmount: actualPaidAmount,
      remainingAmount,
      notes: notesRaw,
      items: mappedItems,
    };

    let statusLabel = 'Lunas';
    if (payStatus === 'dp') {
      statusLabel = `DP ${formatMoney(actualPaidAmount)} · Sisa Piutang ${formatMoney(remainingAmount)}`;
    } else if (payStatus === 'unpaid') {
      statusLabel = `Tempo/Piutang ${formatMoney(grandTotal)}`;
    }

    const itemNamesBrief = mappedItems.map((m) => `${formatQuantity(m.qty)} ${m.unit} ${m.name}`).join(', ');
    const fullCashDescription = `Penjualan #${invoiceRef} (${mappedItems.length} Macam Barang: ${itemNamesBrief}) · Pembeli: ${buyerName} · Total: ${formatMoney(grandTotal)} (${statusLabel})${notesRaw ? ` · Ket: ${notesRaw}` : ''} · [ITEMS_JSON:${JSON.stringify(itemsMeta)}]`;

    try {
      // 1. Insert each item into inventory_movements (stok berkurang)
      for (let i = 0; i < mappedItems.length; i++) {
        const it = mappedItems[i];
        const moveId = `inv-${Date.now()}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
        const moveNotes = `[Penjualan Multi-Barang #${invoiceRef}] Pembeli: ${buyerName} · ${it.name} (${formatQuantity(it.qty)} ${it.unit}) · Total Nota: ${formatMoney(grandTotal)} (${statusLabel}) · Ref: ${invoiceRef}`;

        const { error: invErr } = await db.from('inventory_movements').insert({
          id: moveId,
          product_id: it.productId,
          direction: 'out',
          quantity: it.qty,
          occurred_on: occurredOn,
          notes: moveNotes,
        });

        if (invErr) {
          throw new Error(`Gagal memotong stok ${it.name}: ${invErr.message || invErr}`);
        }
      }

      // 2. Insert into cash_transactions
      const { error: cashErr } = await db.from('cash_transactions').insert({
        id: newCashId,
        direction: 'in',
        amount: actualPaidAmount,
        category: payStatus === 'dp' ? 'Penjualan Produk (DP)' : (payStatus === 'unpaid' ? 'Penjualan Produk (Tempo)' : 'Penjualan Produk'),
        description: fullCashDescription,
        occurred_on: occurredOn,
      });

      if (cashErr) {
        throw new Error(`Gagal mencatat transaksi kas: ${cashErr.message || cashErr}`);
      }

      // 3. Refresh and update shell
      await refreshData();
      if (onSaved) onSaved();

      closeDialog();
      notify(`Nota #${invoiceRef} (${mappedItems.length} macam barang) berhasil diterbitkan!`);

      // 4. Automatically open the freshly printed/itemized invoice modal!
      setTimeout(() => {
        openReportDetailModal('cash', newCashId);
      }, 150);
    } catch (err) {
      console.error('Multi sale invoice error:', err);
      showError(err.message || 'Terjadi kendala saat menerbitkan nota.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${Icons.printer('icon-svg', 14)} Simpan & Terbitkan Nota`;
      }
    }
  });
}
