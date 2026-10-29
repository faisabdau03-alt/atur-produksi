import { heading, statCard } from '../../components/Header.js';
import { emptyState, movementTable } from '../../components/Table.js';
import { formatMoney, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { cashBalance } from '../../store/state.js';

export function renderCash(state) {
  return `${heading('OPERASIONAL', 'Arus keuangan', 'Catat uang masuk dan keluar untuk memantau posisi kas.', `
    <div style="display:inline-flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <button class="button button-outline" data-action="download-report" data-month="${currentMonth}" title="Unduh laporan operasional dan keuangan bulan ini kapan saja"><span>↓</span> Unduh Laporan</button>
      <button class="button button-primary" data-action="add-cash"><span>＋</span> Catat transaksi</button>
    </div>`)}
    <section class="stats-grid compact-stats">
      ${statCard('Saldo kas tercatat', formatMoney(cashBalance(state.cash)), 'akumulasi seluruh transaksi', '↗', 'icon-green')}
      ${statCard('Transaksi bulan ini', quantityFormat.format(monthRecords(state.cash, currentMonth).length), 'catatan kas masuk dan keluar', '◎', 'icon-purple')}
    </section>
    <section class="content-card">
      <div class="card-heading"><div><h2>Riwayat transaksi</h2><p>Arus kas terbaru</p></div></div>
      ${state.cash.length ? movementTable(state.cash, state.cash.length) : emptyState('Belum ada transaksi kas', 'Catat pemasukan atau pengeluaran untuk mulai.')}
    </section>`;
}
