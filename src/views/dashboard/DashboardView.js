import { heading, statCard } from '../../components/Header.js';
import { movementTable } from '../../components/Table.js';
import { formatMoney, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { cashBalance, stockFor } from '../../store/state.js';

export function renderDashboard(state) {
  const monthCash = monthRecords(state.cash, currentMonth);
  const balance = cashBalance(state.cash);
  const netMonthCash = cashBalance(monthCash);
  const latest = [
    ...state.inventory.map((row) => ({ ...row, type: 'inventory' })),
    ...state.cash.map((row) => ({ ...row, type: 'cash' })),
  ].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  const inStock = state.products.filter((product) => stockFor(product.id) > 0).length;

  return `${heading('PUSAT KENDALI', 'Selamat datang kembali', 'Pantau posisi stok, arus kas, dan aktivitas operasional Anda.', `
    <div style="display:inline-flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <button class="button button-outline" data-action="download-report" data-month="${currentMonth}" title="Unduh laporan operasional dan keuangan bulan ini kapan saja"><span>↓</span> Unduh Laporan</button>
      <button class="button button-primary" data-action="quick-entry"><span>＋</span> Catat transaksi</button>
    </div>`)}
    <section class="stats-grid">
      ${statCard('Nilai kas saat ini', formatMoney(balance), `${netMonthCash >= 0 ? '+' : '−'}${formatMoney(Math.abs(netMonthCash))} bersih bulan ini`, '↗', 'icon-green', { action: 'open-stat-detail', statType: 'cash-balance', hint: 'Klik untuk rincian kas' })}
      ${statCard('Jenis produk', quantityFormat.format(state.products.length), `${inStock} produk tersedia di stok`, '◇', 'icon-blue', { action: 'open-stat-detail', statType: 'products', hint: 'Klik untuk rincian produk' })}
      ${statCard('Pergerakan barang', quantityFormat.format(monthRecords(state.inventory, currentMonth).length), 'catatan barang bulan ini', '▦', 'icon-orange', { action: 'open-stat-detail', statType: 'inventory-movements', hint: 'Klik untuk riwayat stok' })}
      ${statCard('Transaksi kas', quantityFormat.format(monthCash.length), 'catatan keuangan bulan ini', '◎', 'icon-purple', { action: 'open-stat-detail', statType: 'cash-transactions', hint: 'Klik untuk riwayat kas' })}
    </section>
    <section class="content-card activity-card">
      <div class="card-heading">
        <div><h2>Aktivitas terbaru</h2><p>Ringkasan pergerakan barang dan kas</p></div>
        <button class="button button-quiet" data-page="reports">Lihat laporan <span>→</span></button>
      </div>
      ${movementTable(latest, 7)}
    </section>
    <div class="dashboard-footnote"><span class="status-dot"></span>Angka diperbarui sesuai data ruang kerja Anda.</div>`;
}
