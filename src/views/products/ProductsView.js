import { heading, statCard } from '../../components/Header.js';
import { emptyState } from '../../components/Table.js';
import { formatMoney, formatQuantity, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { stockFor } from '../../store/state.js';

export function renderProducts(state) {
  const action = `
    <div style="display:inline-flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <button class="button button-primary" data-action="add-inventory"><span>＋</span> Catat pergerakan</button>
      <button class="button button-outline" data-action="add-production" style="color:#187554;"><span>🏭</span> Hasil produksi</button>
      <button class="button button-outline" data-action="add-product"><span>＋</span> Tambah produk</button>
    </div>
  `;
  const rows = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  const inStockCount = rows.filter((p) => stockFor(p.id) > 0).length;
  const outOfStockCount = rows.filter((p) => stockFor(p.id) <= 0).length;

  return `${heading('KATALOG', 'Daftar produk', 'Atur nama produk, catat pergerakan barang, dan pantau ketersediaan stok.', action)}
    <section class="stats-grid compact-stats">
      ${statCard('Total jenis produk', quantityFormat.format(rows.length), 'produk terdaftar di sistem', '◇', 'icon-blue')}
      ${statCard('Stok tersedia', quantityFormat.format(inStockCount), 'produk dengan stok di atas nol', '▦', 'icon-green')}
      ${statCard('Stok kosong / habis', quantityFormat.format(outOfStockCount), 'perlu restock / produksi', '⚠', 'icon-orange')}
      ${statCard('Pergerakan bulan ini', quantityFormat.format(monthRecords(state.inventory, currentMonth).length), 'transaksi masuk & keluar', '↗', 'icon-purple')}
    </section>
    <section class="content-card">
      <div class="card-heading"><div><h2>Semua produk <span class="count-badge">${rows.length}</span></h2><p>Data produk dan stok persediaan yang saling tersinkronisasi secara realtime</p></div></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>NAMA PRODUK</th><th>SKU</th><th>HARGA BELI</th><th>HARGA JUAL</th><th>STOK TERSEDIA</th><th>UNIT</th><th class="align-right">AKSI</th></tr></thead><tbody>
        ${rows.map((product) => `<tr>
          <td class="detail-cell">
            <strong>${escapeHtml(product.name)}</strong>
          </td>
          <td>${escapeHtml(product.sku || '—')}</td>
          <td>${formatMoney(product.purchase_price || 0)}</td>
          <td>${formatMoney(product.selling_price || 0)}</td>
          <td class="${stockFor(product.id) < 0 ? 'negative-stock' : ''}">
            <strong style="font-size: 13px;">${formatQuantity(stockFor(product.id))}</strong>
          </td>
          <td>${escapeHtml(product.unit)}</td>
          <td class="align-right action-cell">
            <div style="display:inline-flex; align-items:center; justify-content:flex-end; gap:4px;">
              <button class="button button-small button-outline" data-action="product-movement" data-id="${escapeHtml(product.id)}" title="Catat pergerakan stok untuk ${escapeHtml(product.name)}" style="font-size:11px; padding:3px 8px;">
                <span>±</span> Pergerakan
              </button>
              <button class="icon-button" data-action="edit-product" data-id="${escapeHtml(product.id)}" aria-label="Ubah ${escapeHtml(product.name)}" title="Ubah produk">✎</button>
              <button class="icon-button danger-icon" data-action="delete-product" data-id="${escapeHtml(product.id)}" aria-label="Hapus ${escapeHtml(product.name)}" title="Hapus produk">×</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody></table></div>` : emptyState('Mulai dari produk pertama', 'Tambahkan nama produk untuk mulai mencatat stok.')}</section>`;
}
