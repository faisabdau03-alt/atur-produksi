import { heading, statCard } from '../../components/Header.js';
import { emptyState, movementTable, tableToolbar, tableFooter } from '../../components/Table.js';
import { formatMoney, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { cashBalance, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderCash(state = appState) {
  const monthCash = monthRecords(state.cash, currentMonth);
  const totalIn = monthCash.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOut = monthCash.filter((r) => r.direction === 'out').reduce((sum, r) => sum + Number(r.amount), 0);
  const balance = cashBalance(state.cash);

  return `
    ${heading('', 'Transaksi Kas', 'Pencatatan arus kas operasional pemasukan dan pengeluaran pabrik')}

    <div class="stats-grid">
      ${statCard('Saldo Kas Riil', formatMoney(balance), 'Posisi kas keseluruhan', Icons.cash('icon-svg', 28), 'green')}
      ${statCard('Pemasukan Bulan Ini', `+${formatMoney(totalIn)}`, 'Omzet & pembayaran piutang', Icons.trendingUp('icon-svg', 28), 'blue')}
      ${statCard('Pengeluaran Bulan Ini', `−${formatMoney(totalOut)}`, 'Belanja modal & beban pabrik', Icons.trendingDown('icon-svg', 28), 'red')}
      ${statCard('Total Transaksi', `${quantityFormat.format(monthCash.length)} Catatan`, 'Bulan berjalan', Icons.receipt('icon-svg', 28), 'yellow')}
    </div>

    <div class="box box-success">
      <div class="box-header">
        <h3 class="box-title">${Icons.cash('icon-svg', 18)} Buku Arus Kas Masuk & Keluar</h3>
        <div class="box-tools">
          <button type="button" class="btn btn-info btn-sm" data-action="add-cash">
            ${Icons.plus('icon-svg', 13)} Tambah Transaksi Kas
          </button>
          <button type="button" class="btn btn-primary btn-sm" data-action="download-report" data-month="${currentMonth}">
            ${Icons.printer('icon-svg', 13)} PRINT
          </button>
        </div>
      </div>

      <div class="box-body">
        ${tableToolbar('search-cash')}

        ${state.cash.length 
          ? movementTable(state.cash, state.cash.length) 
          : emptyState('Belum ada catatan kas', 'Catat pemasukan atau pengeluaran untuk mulai pembukuan.')
        }
      </div>

      <div class="box-footer">
        ${tableFooter(state.cash.length, state.cash.length)}
      </div>
    </div>
  `;
}
