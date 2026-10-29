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
    ${heading('', 'Dashboard', 'Ringkasan operasional pabrik dan inventaris gudang')}

    <!-- 4 Small Boxes (AdminLTE Style) -->
    <div class="stats-grid">
      ${statCard(
        'Saldo Kas Bersih',
        formatMoney(balance),
        `${netMonthCash >= 0 ? '+' : '−'}${formatMoney(Math.abs(netMonthCash))} arus kas bulan ini`,
        Icons.cash('icon-svg', 28),
        'green',
        { action: 'open-stat-detail', stat: 'cash-balance', hint: 'Buka rincian nilai kas' }
      )}
      ${statCard(
        'Katalog Produk Aktif',
        `${quantityFormat.format(state.products.length)} SKU`,
        `${inStock} SKU memiliki stok fisik`,
        Icons.products('icon-svg', 28),
        'blue',
        { action: 'open-stat-detail', stat: 'products', hint: 'Buka daftar stok produk' }
      )}
      ${statCard(
        'Mutasi Stok Gudang',
        `${quantityFormat.format(monthRecords(state.inventory, currentMonth).length)} Mutasi`,
        'Penerimaan & pengiriman barang',
        Icons.inventory('icon-svg', 28),
        'yellow',
        { action: 'open-stat-detail', stat: 'inventory-movements', hint: 'Buka riwayat mutasi stok' }
      )}
      ${statCard(
        'Transaksi Pembukuan',
        `${quantityFormat.format(monthCash.length)} Transaksi`,
        'Catatan uang kas masuk & keluar',
        Icons.receipt('icon-svg', 28),
        'red',
        { action: 'open-stat-detail', stat: 'cash-transactions', hint: 'Buka riwayat transaksi kas' }
      )}
    </div>

    <!-- Aktivitas Terbaru Box -->
    <div class="box box-primary">
      <div class="box-header">
        <h3 class="box-title">${Icons.dashboard('icon-svg', 18)} Riwayat Aktivitas Operasional Terbaru</h3>
        <div class="box-tools">
          <button type="button" class="btn btn-info btn-sm" data-action="quick-entry">
            ${Icons.plus('icon-svg', 13)} Catat Transaksi Baru
          </button>
          <button type="button" class="btn btn-default btn-sm" data-page="reports">
            Buka Laporan Lengkap →
          </button>
        </div>
      </div>
      <div class="box-body">
        ${movementTable(latest, 8)}
      </div>
      <div class="box-footer">
        <span style="font-size:12px; color:#888;">Menampilkan 8 aktivitas mutasi terakhir. Terhubung ke server MySQL MariaDB localhost.</span>
      </div>
    </div>
  `;
}
