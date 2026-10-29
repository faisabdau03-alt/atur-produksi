import { heading, statCard } from '../../components/Header.js';
import { emptyState, movementTable } from '../../components/Table.js';
import { quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { stockFor } from '../../store/state.js';

export function renderInventory(state) {
  const products = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  return `${heading('OPERASIONAL', 'Persediaan barang', 'Catat setiap barang masuk dan keluar agar stok tetap terpantau.', `
    <div style="display:inline-flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <button class="button button-primary" data-action="add-production" style="background:#187554;"><span>🏭</span> Tambah hasil produksi</button>
      <button class="button button-outline" data-action="add-inventory"><span>＋</span> Catat pergerakan</button>
    </div>`)}
    <section class="stats-grid compact-stats">
      ${statCard('Jenis produk tersedia', quantityFormat.format(products.filter((product) => stockFor(product.id) > 0).length), 'produk dengan stok di atas nol', '◇', 'icon-blue')}
      ${statCard('Pergerakan bulan ini', quantityFormat.format(monthRecords(state.inventory, currentMonth).length), 'barang masuk dan keluar', '▦', 'icon-orange')}
    </section>
    <section class="content-card">
      <div class="card-heading"><div><h2>Riwayat pergerakan</h2><p>Catatan stok terbaru</p></div></div>
      ${state.inventory.length ? movementTable(state.inventory.filter((row) => row.product_id), state.inventory.length) : emptyState('Belum ada pergerakan', 'Catat barang masuk untuk mulai mengelola persediaan.')}
    </section>`;
}
