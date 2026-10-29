import { heading, statCard } from '../../components/Header.js';
import { emptyState, movementTable } from '../../components/Table.js';
import { formatMoney, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { cashBalance, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderCash(state = appState) {
  const monthCash = monthRecords(state.cash, currentMonth);
  const totalIn = monthCash.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOut = monthCash.filter((r) => r.direction === 'out').reduce((sum, r) => sum + Number(r.amount), 0);
  const balance = cashBalance(state.cash);

  const actions = `
    <button class="button button-outline" data-action="download-report" data-month="${currentMonth}" title="Unduh rekapitulasi keuangan bulan ini">
      ${Icons.download('icon-svg', 15)}
      <span>Unduh Laporan</span>
    </button>
    <button class="button button-primary" data-action="add-cash">
      ${Icons.plus('icon-svg', 15)}
      <span>Catat Kas</span>
    </button>
  `;

  return `
    ${heading('BUKU KAS UMKM', 'Arus Kas Operasional', 'Catat setiap penerimaan omzet penjualan dan pengeluaran operasional pabrik secara transparan.', actions)}

    <section class="stats-grid">
      ${statCard('Saldo Kas Riil', formatMoney(balance), 'Posisi kas keseluruhan', Icons.cash('icon-svg', 18), 'icon-green')}
      ${statCard('Pemasukan Bulan Ini', `+${formatMoney(totalIn)}`, 'Omzet & pelunasan piutang', Icons.trendingUp('icon-svg', 18), 'icon-blue')}
      ${statCard('Pengeluaran Bulan Ini', `−${formatMoney(totalOut)}`, 'Belanja bahan & biaya operasional', Icons.trendingDown('icon-svg', 18), 'icon-orange')}
      ${statCard('Total Transaksi', `${quantityFormat.format(monthCash.length)} Catatan`, 'Bulan berjalan', Icons.receipt('icon-svg', 18), 'icon-purple')}
    </section>

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Riwayat Arus Kas <span class="count-badge">${state.cash.length}</span></h2>
          <p>Catatan transaksi pemasukan dan pengeluaran beserta rincian nota & audit kas</p>
        </div>
      </div>
      ${state.cash.length 
        ? movementTable(state.cash, state.cash.length) 
        : emptyState('Belum Ada Catatan Kas', 'Catat pemasukan atau pengeluaran untuk mulai mengelola pembukuan.')
      }
    </section>
  `;
}
