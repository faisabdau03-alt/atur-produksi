import { heading, statCard } from '../../components/Header.js';
import { emptyState, movementTable, tableToolbar, tableFooter } from '../../components/Table.js';
import { quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { stockFor, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderInventory(state = appState) {
  const products = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  const inStockCount = products.filter((p) => stockFor(p.id) > 0).length;
  const monthInv = monthRecords(state.inventory, currentMonth);
  const invRecords = state.inventory.filter((row) => row.product_id);

  return `
    ${heading('', 'Persediaan Gudang', 'Pencatatan mutasi stok barang masuk, hasil produksi, dan pengiriman')}

    <div class="stats-grid">
      ${statCard('Produk Siap Kirim', `${quantityFormat.format(inStockCount)} SKU`, 'Stok fisik aman di gudang', Icons.box('icon-svg', 28), 'green', { page: 'products', hint: 'Lihat daftar stok di Data Barang' })}
      ${statCard('Mutasi Bulan Ini', `${quantityFormat.format(monthInv.length)} Catatan`, 'Barang masuk & keluar', Icons.inventory('icon-svg', 28), 'yellow', { action: 'open-stat-detail', stat: 'inventory-movements', hint: 'Buka rincian riwayat mutasi stok' })}
      ${statCard('Total Master SKU', `${quantityFormat.format(products.length)} SKU`, 'Katalog produk terdaftar', Icons.products('icon-svg', 28), 'blue', { page: 'products', hint: 'Buka master Data Barang' })}
    </div>

    <div class="box box-primary">
      <div class="box-header">
        <h3 class="box-title">${Icons.inventory('icon-svg', 18)} Riwayat Pergerakan Barang Masuk & Keluar</h3>
        <div class="box-tools">
          <button type="button" class="btn btn-info btn-sm" data-action="add-inventory">
            ${Icons.plus('icon-svg', 13)} Catat Pergerakan
          </button>
          <button type="button" class="btn btn-success btn-sm" data-action="add-production">
            ${Icons.factory('icon-svg', 13)} Hasil Produksi
          </button>
          <button type="button" class="btn btn-default btn-sm" data-action="export-inventory-csv" title="Unduh mutasi persediaan format CSV">
            ${Icons.download('icon-svg', 13)} Unduh CSV
          </button>
          <button type="button" class="btn btn-default btn-sm" data-action="export-inventory-excel" title="Unduh mutasi persediaan format Excel (.xlsx)">
            ${Icons.download('icon-svg', 13)} Unduh Excel
          </button>
        </div>
      </div>

      <div class="box-body">
        ${tableToolbar('search-inventory')}

        ${invRecords.length 
          ? movementTable(invRecords, invRecords.length) 
          : emptyState('Belum ada pergerakan barang', 'Catat hasil produksi atau barang masuk untuk mulai.')
        }
      </div>

      <div class="box-footer">
        ${tableFooter(invRecords.length, invRecords.length)}
      </div>
    </div>
  `;
}
