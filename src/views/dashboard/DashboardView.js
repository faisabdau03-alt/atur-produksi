import { heading } from '../../components/Header.js';
import { formatMoney, formatQuantity, formatDate, monthRecords, currentMonth, localDate } from '../../utils/formatters.js';
import { cashBalance, stockFor, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';
import { escapeHtml } from '../../utils/sanitize.js';

export function renderDashboard(state = appState) {
  const monthCash = monthRecords(state.cash, currentMonth);
  const balance = cashBalance(state.cash);
  const netMonthCash = cashBalance(monthCash);
  const monthIn = monthCash.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount), 0);
  const monthOut = monthCash.filter((r) => r.direction === 'out').reduce((sum, r) => sum + Number(r.amount), 0);
  const monthInCount = monthCash.filter((r) => r.direction === 'in').length;

  // 1. Hitung Piutang Pelanggan Belum Lunas (Tempo / DP)
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

    const buyerMatch = notes.match(/(?:Pembeli|Pelanggan|Customer|Kepada)[:\s]+([^·,;\[]+)/i);
    const customer = buyerMatch ? buyerMatch[1].trim() : 'Pelanggan';

    pendingReceivables.push({
      id: row.id,
      type: 'inventory',
      notaId,
      customer,
      remaining,
      date: row.occurred_on,
      productName: row.products?.name || 'Produk',
    });
  });

  const totalReceivables = pendingReceivables.reduce((sum, item) => sum + item.remaining, 0);

  // 2. Hitung Stok Kritis / Menipis
  const productStockList = (state.products || []).map((product) => {
    const stock = stockFor(product.id);
    return {
      ...product,
      stock,
      isZero: stock <= 0,
      isLow: stock > 0 && stock <= 20,
    };
  });

  const criticalProducts = productStockList
    .filter((p) => p.isZero || p.isLow)
    .sort((a, b) => a.stock - b.stock);

  // 3. Data Tren 7 Hari Terakhir
  const last7Days = [];
  const baseDate = new Date(localDate + 'T00:00:00');
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric' }).format(d);

    const cashIn = (state.cash || [])
      .filter((r) => r.occurred_on === dateStr && r.direction === 'in')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const cashOut = (state.cash || [])
      .filter((r) => r.occurred_on === dateStr && r.direction === 'out')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const prodQty = (state.inventory || [])
      .filter((r) => r.occurred_on === dateStr && r.direction === 'in' && ((r.notes || '').includes('Produksi') || (r.notes || '').toLowerCase().includes('produksi')))
      .reduce((sum, r) => sum + Number(r.quantity), 0);

    last7Days.push({
      dateStr,
      dayName,
      cashIn,
      cashOut,
      prodQty,
    });
  }

  // 4. Riwayat 6 Aktivitas Terbaru
  const latestRecords = [
    ...(state.inventory || []).map((row) => ({ ...row, type: 'inventory' })),
    ...(state.cash || []).map((row) => ({ ...row, type: 'cash' })),
  ].sort((a, b) => String(b?.occurred_on || '').localeCompare(String(a?.occurred_on || ''))).slice(0, 6);

  // 5. Absensi Hari Ini
  const todayPayroll = (state.payroll || []).filter((p) => p.work_date === localDate);
  const presentEmployees = todayPayroll.filter((p) => p.attendance_status === 'present' || p.attendance_status === 'half_day').length;
  const totalEmployees = (state.employees || []).length;

  return `
    ${heading('', 'Dashboard', 'Ringkasan operasional pabrik dan inventaris gudang')}

    <!-- 4 KARTU KPI MODERN (SaaS Clean Industrial Style) -->
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
            ${netMonthCash >= 0 ? '▲ +' : '▼ −'}${formatMoney(Math.abs(netMonthCash))}
          </span>
          <span class="kpi-link-arrow">Rincian →</span>
        </div>
      </div>

      <!-- 2. Pemasukan Kas Bulan Ini -->
      <div class="modern-kpi-card" data-action="open-stat-detail" data-stat="cash-transactions" title="Buka riwayat arus kas perusahaan">
        <div class="kpi-card-header">
          <span class="kpi-card-title">Pemasukan Bulan Ini</span>
          <div class="kpi-card-icon icon-tone-blue">
            ${Icons.trendingUp('icon-svg', 20)}
          </div>
        </div>
        <div class="kpi-card-value" style="color: #1d4ed8;">+${formatMoney(monthIn)}</div>
        <div class="kpi-card-footer">
          <span>${monthInCount} transaksi uang masuk</span>
          <span class="kpi-link-arrow">Riwayat →</span>
        </div>
      </div>

      <!-- 3. Piutang Pelanggan Belum Lunas -->
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
            ${pendingReceivables.length > 0 ? `${pendingReceivables.length} tagihan tempo aktif` : 'Semua tagihan lunas'}
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
            ${criticalProducts.length > 0 ? `${criticalProducts.filter((p) => p.isZero).length} habis · ${criticalProducts.filter((p) => p.isLow).length} menipis` : 'Seluruh SKU aman (>20 pcs)'}
          </span>
          <span class="kpi-link-arrow">Gudang →</span>
        </div>
      </div>
    </div>

    <!-- LAYOUT 2-KOLOM UTAMA (Grafik & Riwayat di Kiri, Widget Peringatan di Kanan) -->
    <div class="dashboard-split-layout">
      
      <!-- KOLOM KIRI (LEBIH LEBAR): Grafik Tren & Tabel Riwayat -->
      <div class="dashboard-col-main">
        
        <!-- WIDGET GRAFIK TREN 7 HARI -->
        <div class="modern-card">
          <div class="modern-card-header">
            <h3 class="modern-card-title">
              ${Icons.trendingUp('icon-svg', 18)} Tren Keuangan & Produksi (7 Hari Terakhir)
            </h3>
            <span style="font-size: 11.5px; color: #64748b;">Pergerakan kas & pabrik</span>
          </div>
          <div class="modern-card-body">
            <div class="chart-legend-bar">
              <span class="chart-legend-item">
                <span class="chart-legend-dot" style="background: #10b981;"></span>
                <span>Kas Masuk</span>
              </span>
              <span class="chart-legend-item">
                <span class="chart-legend-dot" style="background: #f43f5e;"></span>
                <span>Kas Keluar</span>
              </span>
              <span class="chart-legend-item">
                <span class="chart-legend-dot" style="background: #3b82f6;"></span>
                <span>Produksi Pabrik (pcs)</span>
              </span>
            </div>
            ${renderTrendChart(last7Days)}
          </div>
        </div>

        <!-- WIDGET RIWAYAT AKTIVITAS OPERASIONAL -->
        <div class="modern-card">
          <div class="modern-card-header">
            <h3 class="modern-card-title">
              ${Icons.dashboard('icon-svg', 18)} Aktivitas Operasional Terbaru
            </h3>
            <button type="button" class="btn btn-default btn-sm" data-page="reports">
              Buka Laporan Lengkap →
            </button>
          </div>
          <div class="modern-card-body" style="padding: 0;">
            ${renderModernActivityTable(latestRecords)}
          </div>
          <div class="modern-card-footer">
            <span>Menampilkan 6 catatan operasional & mutasi terakhir</span>
            <span style="color: #059669; font-weight: 600;">● Data Tersinkronisasi Otomatis</span>
          </div>
        </div>

      </div>

      <!-- KOLOM KANAN: Widget Peringatan Operasional & Antrean Tagihan -->
      <div class="dashboard-col-side">
        
        <!-- WIDGET 1: TAGIHAN PIUTANG PELANGGAN -->
        <div class="modern-card">
          <div class="modern-card-header">
            <h3 class="modern-card-title" style="color: #92400e;">
              ${Icons.receipt('icon-svg', 16)} Tagihan Piutang Pelanggan
            </h3>
            <span class="kpi-badge ${pendingReceivables.length > 0 ? 'badge-warning' : 'badge-success'}">
              ${pendingReceivables.length} Tagihan
            </span>
          </div>
          <div class="modern-card-body" style="padding: 14px 16px;">
            ${renderReceivablesList(pendingReceivables)}
          </div>
        </div>

        <!-- WIDGET 2: PERINGATAN STOK MENIPIS / PERLU PRODUKSI -->
        <div class="modern-card">
          <div class="modern-card-header">
            <h3 class="modern-card-title" style="color: #991b1b;">
              ${Icons.alertCircle('icon-svg', 16)} Stok Kritis / Perlu Produksi
            </h3>
            <button type="button" class="btn btn-default btn-xs" data-page="inventory" title="Kelola persediaan">
              Lihat Stok →
            </button>
          </div>
          <div class="modern-card-body" style="padding: 14px 16px;">
            ${renderCriticalStockList(criticalProducts)}
          </div>
        </div>

        <!-- WIDGET 3: RINGKASAN TIM & PABRIK HARI INI -->
        <div class="modern-card">
          <div class="modern-card-header">
            <h3 class="modern-card-title">
              ${Icons.factory('icon-svg', 16)} Operasional Pabrik Hari Ini
            </h3>
          </div>
          <div class="modern-card-body" style="padding: 14px 16px;">
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                <span style="color:#64748b; display:inline-flex; align-items:center; gap:6px;">
                  ${Icons.payroll('icon-svg', 14)} Kehadiran Karyawan
                </span>
                <strong style="color:#1e293b;">
                  ${totalEmployees > 0 ? `${presentEmployees} dari ${totalEmployees} Hadir` : 'Belum ada data'}
                </strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                <span style="color:#64748b; display:inline-flex; align-items:center; gap:6px;">
                  ${Icons.products('icon-svg', 14)} Total SKU Aktif
                </span>
                <strong style="color:#1e293b;">${state.products?.length || 0} Produk</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                <span style="color:#64748b; display:inline-flex; align-items:center; gap:6px;">
                  ${Icons.inventory('icon-svg', 14)} Mutasi Bulan Ini
                </span>
                <strong style="color:#1e293b;">${monthRecords(state.inventory, currentMonth).length} Mutasi</strong>
              </div>
              ${totalEmployees > 0 ? `
              <div style="margin-top:4px; padding-top:8px; border-top:1px solid #f1f5f9; text-align:right;">
                <button type="button" class="btn btn-default btn-xs" data-page="payroll" style="font-weight:600;">
                  Buka Absensi & Gaji →
                </button>
              </div>` : ''}
            </div>
          </div>
        </div>

      </div>

    </div>
  `;
}

// -----------------------------------------------------------------------------
// HELPER: RENDER SVG TREND CHART (7 HARI TERAKHIR)
// -----------------------------------------------------------------------------
function renderTrendChart(days) {
  const maxCash = Math.max(
    5000000,
    ...days.map((d) => Math.max(d.cashIn, d.cashOut))
  );

  const chartHeight = 150;
  const chartWidth = 580;
  const colWidth = chartWidth / days.length;
  const barWidth = 14;

  return `
    <div class="chart-container-box">
      <svg width="100%" height="190" viewBox="0 0 ${chartWidth} 190" style="overflow: visible;">
        <!-- Garis Grid Horizontal -->
        <line x1="0" y1="35" x2="${chartWidth}" y2="35" stroke="#f1f5f9" stroke-dasharray="3 3" stroke-width="1"/>
        <line x1="0" y1="80" x2="${chartWidth}" y2="80" stroke="#f1f5f9" stroke-dasharray="3 3" stroke-width="1"/>
        <line x1="0" y1="125" x2="${chartWidth}" y2="125" stroke="#f1f5f9" stroke-dasharray="3 3" stroke-width="1"/>
        <!-- Garis Dasar Axis -->
        <line x1="0" y1="150" x2="${chartWidth}" y2="150" stroke="#cbd5e1" stroke-width="1.2"/>

        <!-- Kolom per Hari -->
        ${days.map((d, index) => {
          const centerX = index * colWidth + colWidth / 2;
          const inHeight = Math.max(4, Math.round((d.cashIn / maxCash) * (chartHeight - 40)));
          const outHeight = Math.max(4, Math.round((d.cashOut / maxCash) * (chartHeight - 40)));

          const inY = 150 - inHeight;
          const outY = 150 - outHeight;

          const inBarX = centerX - barWidth - 2;
          const outBarX = centerX + 2;

          return `
            <g class="chart-bar-group">
              <title>${escapeHtml(d.dayName)} (${d.dateStr})
Kas Masuk: ${formatMoney(d.cashIn)}
Kas Keluar: ${formatMoney(d.cashOut)}
Produksi: ${formatQuantity(d.prodQty)} pcs</title>
              
              <!-- Bar Kas Masuk -->
              <rect x="${inBarX}" y="${d.cashIn > 0 ? inY : 148}" width="${barWidth}" height="${d.cashIn > 0 ? inHeight : 2}" 
                rx="3" class="chart-bar-in" fill="${d.cashIn > 0 ? '#10b981' : '#e2e8f0'}"/>
              
              <!-- Bar Kas Keluar -->
              <rect x="${outBarX}" y="${d.cashOut > 0 ? outY : 148}" width="${barWidth}" height="${d.cashOut > 0 ? outHeight : 2}" 
                rx="3" class="chart-bar-out" fill="${d.cashOut > 0 ? '#f43f5e' : '#e2e8f0'}"/>

              <!-- Indikator Produksi (jika ada unit diproduksi) -->
              ${d.prodQty > 0 ? `
                <circle cx="${centerX}" cy="${Math.min(inY, outY) - 10}" r="4" fill="#3b82f6"/>
                <text x="${centerX}" y="${Math.min(inY, outY) - 16}" text-anchor="middle" font-size="9" font-weight="700" fill="#2563eb">
                  +${formatQuantity(d.prodQty)}
                </text>
              ` : ''}

              <!-- Label Hari -->
              <text x="${centerX}" y="168" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b">
                ${escapeHtml(d.dayName)}
              </text>
            </g>
          `;
        }).join('')}
      </svg>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// HELPER: RENDER MODERN ACTIVITY TABLE
// -----------------------------------------------------------------------------
function renderModernActivityTable(records) {
  if (!records.length) {
    return `<div style="text-align:center; padding:30px; color:#94a3b8; font-size:12.5px;">Belum ada aktivitas operasional tercatat.</div>`;
  }

  return `
    <div class="table-responsive" style="margin: 0; border: none;">
      <table class="modern-activity-table">
        <thead>
          <tr>
            <th style="width: 100px;">Tanggal</th>
            <th style="width: 130px;">Pos / Kategori</th>
            <th>Rincian Catatan</th>
            <th style="width: 110px; text-align: center;">Status</th>
            <th style="width: 130px; text-align: right;">Nominal / Qty</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((row) => {
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
              <tr style="cursor: pointer;" data-action="view-report-detail" data-type="${isInv ? 'inventory' : 'cash'}" data-id="${escapeHtml(row.id)}" title="Klik untuk melihat struk / rincian">
                <td style="font-size: 11.5px; color: #64748b;">${formatDate(row.occurred_on)}</td>
                <td style="font-weight: 600; color: #1e293b;">
                  ${isInv ? 'Persediaan Gudang' : 'Buku Kas'}
                </td>
                <td>
                  <div style="font-weight: 600; color: #0f172a;">${escapeHtml(detailTitle)}</div>
                  ${detailDesc ? `<div style="font-size: 11px; color: #64748b; margin-top: 1px;">${escapeHtml(detailDesc)}</div>` : ''}
                </td>
                <td style="text-align: center;">${badgeHtml}</td>
                <td style="text-align: right; font-weight: 700; color: ${amountColor};">
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

// -----------------------------------------------------------------------------
// HELPER: RENDER WIDGET PIUTANG PELANGGAN
// -----------------------------------------------------------------------------
function renderReceivablesList(receivables) {
  if (!receivables.length) {
    return `
      <div style="text-align: center; padding: 18px 10px; color: #059669; font-size: 12px; background: #f0fdf4; border-radius: 8px;">
        <div style="margin-bottom: 4px;">${Icons.checkCircle('icon-svg', 22)}</div>
        <strong>Semua Piutang Telah Lunas</strong>
        <p style="margin: 2px 0 0; color: #166534; font-size: 11px;">Tidak ada tagihan pelanggan tempo yang tertunggak saat ini.</p>
      </div>
    `;
  }

  return `
    <div class="widget-list">
      ${receivables.slice(0, 4).map((item) => `
        <div class="widget-item-card">
          <div class="widget-item-info">
            <span class="widget-item-name">${escapeHtml(item.customer)}</span>
            <span class="widget-item-sub">
              ${item.notaId ? `[Nota #${escapeHtml(item.notaId)}]` : item.productName} · ${formatDate(item.date)}
            </span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <span class="widget-item-badge badge-piutang-red">
              ${formatMoney(item.remaining)}
            </span>
            <button type="button" class="btn-widget-action btn-action-warning" data-action="open-settlement-modal" data-type="${escapeHtml(item.type)}" data-id="${escapeHtml(item.id)}" title="Input pembayaran pelunasan piutang">
              ${Icons.cash('icon-svg', 11)} Lunasi
            </button>
          </div>
        </div>
      `).join('')}
      ${receivables.length > 4 ? `
        <div style="text-align:center; padding-top:4px;">
          <button type="button" class="btn btn-default btn-xs" data-page="reports" style="color:#64748b;">
            Lihat ${receivables.length - 4} tagihan lainnya di Laporan →
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// HELPER: RENDER WIDGET STOK KRITIS
// -----------------------------------------------------------------------------
function renderCriticalStockList(critical) {
  if (!critical.length) {
    return `
      <div style="text-align: center; padding: 18px 10px; color: #059669; font-size: 12px; background: #f0fdf4; border-radius: 8px;">
        <div style="margin-bottom: 4px;">${Icons.checkCircle('icon-svg', 22)}</div>
        <strong>Persediaan Gudang Aman</strong>
        <p style="margin: 2px 0 0; color: #166534; font-size: 11px;">Seluruh stok barang berada di atas batas minimal (>20 pcs).</p>
      </div>
    `;
  }

  return `
    <div class="widget-list">
      ${critical.slice(0, 4).map((p) => `
        <div class="widget-item-card">
          <div class="widget-item-info">
            <span class="widget-item-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
            <span class="widget-item-sub">
              Satuan: ${escapeHtml(p.unit || 'pcs')}
            </span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <span class="widget-item-badge ${p.stock <= 0 ? 'badge-stock-zero' : 'badge-stock-low'}">
              ${p.stock <= 0 ? 'Habis (0 pcs)' : `Sisa ${formatQuantity(p.stock)} ${escapeHtml(p.unit || 'pcs')}`}
            </span>
            <button type="button" class="btn-widget-action btn-action-primary" data-action="add-production" data-product-id="${escapeHtml(p.id)}" title="Catat hasil produksi untuk produk ini">
              ${Icons.plus('icon-svg', 11)} Produksi
            </button>
          </div>
        </div>
      `).join('')}
      ${critical.length > 4 ? `
        <div style="text-align:center; padding-top:4px;">
          <button type="button" class="btn btn-default btn-xs" data-page="inventory" style="color:#64748b;">
            Lihat ${critical.length - 4} produk lainnya di Inventaris →
          </button>
        </div>
      ` : ''}
    </div>
  `;
}
