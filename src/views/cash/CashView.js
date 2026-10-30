import { heading, statCard } from '../../components/Header.js';
import { emptyState, movementTable, tableToolbar, tableFooter } from '../../components/Table.js';
import { formatMoney, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { cashBalance, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderCash(state = appState) {
  const currentFilter = state.cashFilter || 'all';
  const monthCash = monthRecords(state.cash, currentMonth);
  const totalIn = monthCash.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOut = monthCash.filter((r) => r.direction === 'out').reduce((sum, r) => sum + Number(r.amount), 0);
  const balance = cashBalance(state.cash);

  let cashRecords = state.cash;
  if (currentFilter === 'in') {
    cashRecords = state.cash.filter((r) => r.direction === 'in');
  } else if (currentFilter === 'out') {
    cashRecords = state.cash.filter((r) => r.direction === 'out');
  }

  return `
    ${heading('', 'Transaksi Kas', 'Pencatatan arus kas operasional pemasukan dan pengeluaran pabrik')}

    <div class="stats-grid">
      ${statCard('Saldo Kas Riil', formatMoney(balance), 'Posisi kas keseluruhan', Icons.cash('icon-svg', 28), 'green', { action: 'open-stat-detail', stat: 'cash-balance', hint: 'Buka rincian nilai kas' })}
      ${statCard('Pemasukan Bulan Ini', `+${formatMoney(totalIn)}`, 'Omzet & pembayaran piutang', Icons.trendingUp('icon-svg', 28), 'blue', { action: 'filter-cash', filter: 'in', hint: 'Saring transaksi uang masuk', active: currentFilter === 'in' })}
      ${statCard('Pengeluaran Bulan Ini', `−${formatMoney(totalOut)}`, 'Belanja modal & beban pabrik', Icons.trendingDown('icon-svg', 28), 'red', { action: 'filter-cash', filter: 'out', hint: 'Saring transaksi uang keluar', active: currentFilter === 'out' })}
      ${statCard('Total Transaksi', `${quantityFormat.format(monthCash.length)} Catatan`, 'Bulan berjalan', Icons.receipt('icon-svg', 28), 'yellow', { action: 'open-stat-detail', stat: 'cash-transactions', hint: 'Buka riwayat transaksi kas' })}
    </div>

    <div class="box box-success">
      <div class="box-header">
        <h3 class="box-title">${Icons.cash('icon-svg', 18)} Buku Arus Kas Masuk & Keluar</h3>
        <div class="box-tools">
          <button type="button" class="btn btn-info btn-sm" data-action="add-cash">
            ${Icons.plus('icon-svg', 13)} Tambah Transaksi Kas
          </button>
          <button type="button" class="btn btn-default btn-sm" data-action="export-cash-csv" title="Unduh catatan buku kas format CSV">
            ${Icons.download('icon-svg', 13)} Unduh CSV
          </button>
          <button type="button" class="btn btn-default btn-sm" data-action="export-cash-excel" title="Unduh catatan buku kas format Excel (.xlsx)">
            ${Icons.download('icon-svg', 13)} Unduh Excel
          </button>
        </div>
      </div>

      <div class="box-body">
        ${tableToolbar('search-cash')}

        ${currentFilter !== 'all' ? `
          <div class="alert alert-info" style="margin-top: 10px; margin-bottom: 14px; padding: 10px 14px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; background-color: #d9edf7; border-color: #bce8f1; color: #31708f;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">🔍</span>
              <span>
                Menyaring arus kas: <strong>${currentFilter === 'in' ? 'Uang Masuk (Pemasukan)' : 'Uang Keluar (Pengeluaran)'}</strong>
                — Menampilkan <strong>${cashRecords.length}</strong> dari <strong>${state.cash.length}</strong> transaksi
              </span>
            </div>
            <button type="button" class="btn btn-default btn-xs" data-action="filter-cash" data-filter="all" style="font-weight: 600; background: #fff; border-color: #ccc; padding: 4px 10px;">
              ✕ Tampilkan Semua
            </button>
          </div>
        ` : ''}

        ${cashRecords.length 
          ? movementTable(cashRecords, cashRecords.length) 
          : (currentFilter !== 'all'
              ? emptyState('Tidak ada catatan kas untuk filter ini', 'Klik "Tampilkan Semua" untuk melihat seluruh arus kas.')
              : emptyState('Belum ada catatan kas', 'Catat pemasukan atau pengeluaran untuk mulai pembukuan.')
            )
        }
      </div>

      <div class="box-footer">
        ${tableFooter(cashRecords.length, state.cash.length)}
      </div>
    </div>
  `;
}
