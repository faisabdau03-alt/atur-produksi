import { heading, statCard } from '../../components/Header.js';
import { movementTable } from '../../components/Table.js';
import { formatMoney, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { cashBalance, stockFor, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderDashboard(state = appState) {
  const monthCash = monthRecords(state.cash, currentMonth);
  const balance = cashBalance(state.cash);
  const netMonthCash = cashBalance(monthCash);
  const latest = [
    ...state.inventory.map((row) => ({ ...row, type: 'inventory' })),
    ...state.cash.map((row) => ({ ...row, type: 'cash' })),
  ].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  const inStock = state.products.filter((product) => stockFor(product.id) > 0).length;

  return `
    ${heading(
      'PUSAT KENDALI OPERASIONAL',
      'Ringkasan Gudang & Finansial',
      'Pantau mutasi stok, saldo kas operasional, dan aktivitas lini produksi hari ini.',
      `
      <button class="button button-outline" data-action="download-report" data-month="${currentMonth}" title="Unduh rekapitulasi data bulan ini">
        ${Icons.download('icon-svg', 15)}
        <span>Unduh Laporan</span>
      </button>
      <button class="button button-primary" data-action="quick-entry">
        ${Icons.plus('icon-svg', 15)}
        <span>Catat Transaksi</span>
      </button>
      `
    )}

    <section class="stats-grid">
      ${statCard(
        'Saldo Kas Operasional',
        formatMoney(balance),
        `${netMonthCash >= 0 ? '+' : '−'}${formatMoney(Math.abs(netMonthCash))} arus bersih bulan ini`,
        Icons.cash('icon-svg', 18),
        'icon-green',
        { action: 'open-stat-detail', stat: 'cash-balance', hint: 'Buka rincian nilai kas' }
      )}
      ${statCard(
        'Katalog Produk Aktif',
        `${quantityFormat.format(state.products.length)} Jenis`,
        `${inStock} SKU memiliki stok fisik`,
        Icons.products('icon-svg', 18),
        'icon-blue',
        { action: 'open-stat-detail', stat: 'products', hint: 'Buka daftar stok produk' }
      )}
      ${statCard(
        'Mutasi Stok Gudang',
        `${quantityFormat.format(monthRecords(state.inventory, currentMonth).length)} Catatan`,
        'Penerimaan & pengiriman barang',
        Icons.inventory('icon-svg', 18),
        'icon-orange',
        { action: 'open-stat-detail', stat: 'inventory-movements', hint: 'Buka riwayat mutasi stok' }
      )}
      ${statCard(
        'Transaksi Pembukuan',
        `${quantityFormat.format(monthCash.length)} Transaksi`,
        'Kas masuk & biaya operasional',
        Icons.receipt('icon-svg', 18),
        'icon-purple',
        { action: 'open-stat-detail', stat: 'cash-transactions', hint: 'Buka riwayat transaksi kas' }
      )}
    </section>

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Aktivitas Terbaru</h2>
          <p>Catatan real-time pergerakan barang gudang dan transaksi kas</p>
        </div>
        <button class="button button-quiet button-sm" data-page="reports">
          <span>Buka Laporan Lengkap</span>
          ${Icons.arrowRight('icon-svg', 14)}
        </button>
      </div>
      ${movementTable(latest, 7)}
    </section>
  `;
}
