import { heading } from '../../components/Header.js';
import { formatMoney, formatQuantity, formatDate, monthRecords, currentMonth } from '../../utils/formatters.js';
import { cashBalance, stockFor, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';
import { escapeHtml } from '../../utils/sanitize.js';

export function renderDashboard(state = appState) {
  const monthCash = monthRecords(state.cash, currentMonth);
  const balance = cashBalance(state.cash);
  const netMonthCash = cashBalance(monthCash);
  const monthIn = monthCash.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount), 0);
  const monthInCount = monthCash.filter((r) => r.direction === 'in').length;

  // 1. Hitung Piutang Pelanggan (Tempo / DP)
  const pendingReceivables = [];
  const seenNotas = new Set();

  (state.inventory || []).forEach((row) => {
    if (row.direction !== 'out') return;
    const notes = row.notes || '';
    if (!notes.includes('Piutang') && !notes.includes('Tempo') && !notes.includes('Sisa Tagihan')) return;
    if (notes.includes('(LUNAS)') || (notes.includes('Lunas') && !notes.includes('Sisa Piutang') && !notes.includes('Sisa Tagihan'))) return;

    let remaining = 0;
    const remMatch = notes.match(/(?:Sisa Tagihan|Sisa Piutang)[:\s]+(?:Rp\s*)?([\d.,]+)/i);
    if (remMatch) {
      remaining = Number(remMatch[1].replace(/[.,]/g, '')) || 0;
    } else if (notes.includes('Tempo')) {
      remaining = Number(row.quantity || 0) * Number(row.unit_price || 0);
    }

    if (remaining <= 0) return;

    const notaMatch = notes.match(/\[Nota\s*#?([A-Za-z0-9\-_]+)\]/i);
    const notaId = notaMatch ? notaMatch[1] : null;
    if (notaId && seenNotas.has(notaId)) return;
    if (notaId) seenNotas.add(notaId);

    pendingReceivables.push(remaining);
  });

  const totalReceivables = pendingReceivables.reduce((sum, r) => sum + r, 0);

  // 2. Hitung Stok Menipis
  const criticalProducts = (state.products || []).filter((p) => stockFor(p.id) <= 20);
  const zeroStockCount = (state.products || []).filter((p) => stockFor(p.id) <= 0).length;

  // 3. Ambil 8 Aktivitas Operasional Terbaru
  const latestRecords = [
    ...(state.inventory || []).map((row) => ({ ...row, type: 'inventory' })),
    ...(state.cash || []).map((row) => ({ ...row, type: 'cash' })),
  ].sort((a, b) => String(b?.occurred_on || '').localeCompare(String(a?.occurred_on || ''))).slice(0, 8);

  return `
    ${heading('', 'Dashboard', 'Ringkasan operasional pabrik dan inventaris gudang')}

    <!-- 4 KARTU KPI BERSIH & MODERN -->
    <div class="modern-kpi-grid">
      <!-- 1. Saldo Kas Bersih -->
      <div class="modern-kpi-card" data-action="open-stat-detail" data-stat="cash-balance" title="Buka rincian nilai kas perusahaan">
        <div class="kpi-card-header">
          <span class="kpi-card-title">Saldo Kas Bersih</span>
          <div class="kpi-card-icon icon-tone-green">
            ${Icons.cash('icon-svg', 20)}
          </div>
        </div>
        <div class="kpi-card-value">${formatMoney(balance)}</div>
        <div class="kpi-card-footer">
          <span class="kpi-badge ${netMonthCash >= 0 ? 'badge-success' : 'badge-danger'}">
            ${netMonthCash >= 0 ? '▲ +' : '▼ −'}${formatMoney(Math.abs(netMonthCash))} arus kas
          </span>
          <span class="kpi-link-arrow">Rincian →</span>
        </div>
      </div>

      <!-- 2. Pemasukan Kas Bulan Ini -->
      <div class="modern-kpi-card" data-action="open-stat-detail" data-stat="cash-transactions" title="Buka riwayat transaksi kas">
        <div class="kpi-card-header">
          <span class="kpi-card-title">Pemasukan Bulan Ini</span>
          <div class="kpi-card-icon icon-tone-blue">
            ${Icons.trendingUp('icon-svg', 20)}
          </div>
        </div>
        <div class="kpi-card-value" style="color: #2563eb;">+${formatMoney(monthIn)}</div>
        <div class="kpi-card-footer">
          <span>${monthInCount} transaksi masuk</span>
          <span class="kpi-link-arrow">Riwayat →</span>
        </div>
      </div>

      <!-- 3. Piutang Pelanggan -->
      <div class="modern-kpi-card" data-page="reports" title="Buka laporan keuangan dan piutang">
        <div class="kpi-card-header">
          <span class="kpi-card-title">Piutang Pelanggan</span>
          <div class="kpi-card-icon icon-tone-amber">
            ${Icons.receipt('icon-svg', 20)}
          </div>
        </div>
        <div class="kpi-card-value" style="color: ${totalReceivables > 0 ? '#b45309' : '#0f172a'};">
          ${formatMoney(totalReceivables)}
        </div>
        <div class="kpi-card-footer">
          <span class="kpi-badge ${pendingReceivables.length > 0 ? 'badge-warning' : 'badge-success'}">
            ${pendingReceivables.length > 0 ? `${pendingReceivables.length} tagihan tempo` : 'Semua lunas'}
          </span>
          <span class="kpi-link-arrow">Laporan →</span>
        </div>
      </div>

      <!-- 4. Peringatan Stok Menipis -->
      <div class="modern-kpi-card" data-page="inventory" title="Buka katalog stok inventaris">
        <div class="kpi-card-header">
          <span class="kpi-card-title">Peringatan Stok</span>
          <div class="kpi-card-icon ${criticalProducts.length > 0 ? 'icon-tone-rose' : 'icon-tone-green'}">
            ${Icons.box('icon-svg', 20)}
          </div>
        </div>
        <div class="kpi-card-value" style="color: ${criticalProducts.length > 0 ? '#e11d48' : '#059669'};">
          ${criticalProducts.length > 0 ? `${criticalProducts.length} SKU Perhatian` : 'Stok Aman'}
        </div>
        <div class="kpi-card-footer">
          <span class="kpi-badge ${criticalProducts.length > 0 ? 'badge-danger' : 'badge-success'}">
            ${criticalProducts.length > 0 ? `${zeroStockCount} habis · ${criticalProducts.length - zeroStockCount} menipis` : 'Seluruh SKU aman (>20 pcs)'}
          </span>
          <span class="kpi-link-arrow">Gudang →</span>
        </div>
      </div>
    </div>

    <!-- 1 TABEL PENUH MEMANJANG (LEGA & MUDAH DIBACA) -->
    <div class="modern-card">
      <div class="modern-card-header">
        <h3 class="modern-card-title">
          ${Icons.dashboard('icon-svg', 18)} Riwayat Aktivitas Operasional Terbaru
        </h3>
        <button type="button" class="btn btn-default btn-sm" data-page="reports">
          Buka Laporan Lengkap →
        </button>
      </div>
      <div class="modern-card-body" style="padding: 0;">
        ${renderActivityTable(latestRecords)}
      </div>
      <div class="modern-card-footer">
        <span>Menampilkan 8 aktivitas mutasi & keuangan terakhir</span>
        <span style="color: #64748b; font-size: 11.5px;">Klik baris untuk melihat struk / rincian</span>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// TABEL AKTIVITAS MODERN & LEBAR
// -----------------------------------------------------------------------------
function renderActivityTable(records) {
  if (!records.length) {
    return `
      <div style="text-align:center; padding:40px 20px; color:#94a3b8; font-size:13px;">
        <div style="margin-bottom:8px; color:#cbd5e1;">${Icons.box('icon-svg', 32)}</div>
        <strong>Belum ada catatan aktivitas operasional</strong>
        <p style="margin:4px 0 0; font-size:12px; color:#94a3b8;">Transaksi yang dicatat akan otomatis tampil di sini.</p>
      </div>
    `;
  }

  return `
    <div class="table-responsive" style="margin: 0; border: none;">
      <table class="modern-activity-table">
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">No</th>
            <th style="width: 120px;">Tanggal</th>
            <th style="width: 160px;">Pos / Bidang</th>
            <th>Rincian Catatan</th>
            <th style="width: 130px; text-align: center;">Status</th>
            <th style="width: 160px; text-align: right;">Nominal / Unit</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((row, index) => {
            const isInv = row.type === 'inventory' || 'product_id' in row;
            const isIn = row.direction === 'in';
            const notes = row.notes || '';
            const isProd = isInv && (notes.includes('Hasil Produksi') || notes.toLowerCase().includes('produksi'));
            const isSale = isInv && !isIn && (notes.includes('Penjualan') || notes.toLowerCase().includes('pembeli'));

            let badgeHtml = '';
            if (isProd) {
              badgeHtml = `<span class="kpi-badge badge-info">${Icons.factory('icon-svg', 11)} Produksi</span>`;
            } else if (isSale) {
              badgeHtml = `<span class="kpi-badge badge-warning">${Icons.receipt('icon-svg', 11)} Penjualan</span>`;
            } else if (isIn) {
              badgeHtml = `<span class="kpi-badge badge-success">${Icons.arrowIn('icon-svg', 11)} Masuk</span>`;
            } else {
              badgeHtml = `<span class="kpi-badge badge-danger">${Icons.arrowOut('icon-svg', 11)} Keluar</span>`;
            }

            const detailTitle = isInv
              ? (row.products?.name || 'Produk Gudang')
              : (row.category || 'Transaksi Kas');
            const detailDesc = isInv ? row.notes : row.description;

            const amountText = isInv
              ? `${isIn ? '+' : '−'}${formatQuantity(row.quantity)} ${row.products?.unit || 'pcs'}`
              : `${isIn ? '+' : '−'}${formatMoney(row.amount)}`;

            const amountColor = isProd
              ? '#2563eb'
              : (isIn ? '#059669' : '#e11d48');

            return `
              <tr style="cursor: pointer;" data-action="view-report-detail" data-type="${isInv ? 'inventory' : 'cash'}" data-id="${escapeHtml(row.id)}" title="Klik untuk membuka nota / rincian">
                <td style="text-align: center; color: #94a3b8; font-size: 11.5px;">${index + 1}</td>
                <td style="font-size: 12px; color: #64748b;">${formatDate(row.occurred_on)}</td>
                <td style="font-weight: 600; color: #1e293b;">
                  ${isInv ? 'Persediaan Gudang' : 'Buku Kas'}
                </td>
                <td>
                  <div style="font-weight: 600; color: #0f172a; font-size: 13px;">${escapeHtml(detailTitle)}</div>
                  ${detailDesc ? `<div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${escapeHtml(detailDesc)}</div>` : ''}
                </td>
                <td style="text-align: center;">${badgeHtml}</td>
                <td style="text-align: right; font-weight: 700; font-size: 13px; color: ${amountColor};">
                  ${amountText}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
