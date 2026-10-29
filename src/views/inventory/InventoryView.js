import { heading, statCard } from '../../components/Header.js';
import { emptyState, movementTable } from '../../components/Table.js';
import { quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { stockFor, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderInventory(state = appState) {
  const products = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  const inStockCount = products.filter((p) => stockFor(p.id) > 0).length;
  const monthInv = monthRecords(state.inventory, currentMonth);

  const actions = `
    <button class="button button-outline" data-action="add-production">
      ${Icons.factory('icon-svg', 15)}
      <span>Hasil Produksi</span>
    </button>
    <button class="button button-primary" data-action="add-inventory">
      ${Icons.plus('icon-svg', 15)}
      <span>Catat Pergerakan</span>
    </button>
  `;

  return `
    ${heading('GUDANG & LOGISTIK', 'Persediaan Stok Barang', 'Kelola penerimaan stok barang jadi dari lini produksi serta pengiriman ke pelanggan.', actions)}

    <section class="stats-grid">
      ${statCard('Produk Siap Kirim', `${quantityFormat.format(inStockCount)} Jenis`, 'Stok fisik aman di gudang', Icons.box('icon-svg', 18), 'icon-green')}
      ${statCard('Mutasi Bulan Ini', `${quantityFormat.format(monthInv.length)} Mutasi`, 'Barang masuk & keluar', Icons.inventory('icon-svg', 18), 'icon-orange')}
      ${statCard('Total Master SKU', `${quantityFormat.format(products.length)} SKU`, 'Katalog produk terdaftar', Icons.products('icon-svg', 18), 'icon-blue')}
    </section>

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Riwayat Pergerakan Barang <span class="count-badge">${state.inventory.length}</span></h2>
          <p>Catatan penerimaan produksi, belanja bahan, dan pengiriman order</p>
        </div>
      </div>
      ${state.inventory.length 
        ? movementTable(state.inventory.filter((row) => row.product_id), state.inventory.length) 
        : emptyState('Belum Ada Pergerakan Barang', 'Catat hasil produksi atau pembelian barang untuk mulai mengelola persediaan.')
      }
    </section>
  `;
}
