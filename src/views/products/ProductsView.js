import { heading, statCard } from '../../components/Header.js';
import { emptyState } from '../../components/Table.js';
import { formatMoney, formatQuantity, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { stockFor, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderProducts(state = appState) {
  const actions = `
    <button class="button button-outline" data-action="add-production">
      ${Icons.factory('icon-svg', 15)}
      <span>Hasil Produksi</span>
    </button>
    <button class="button button-outline" data-action="add-inventory">
      ${Icons.inventory('icon-svg', 15)}
      <span>Catat Stok</span>
    </button>
    <button class="button button-primary" data-action="add-product">
      ${Icons.plus('icon-svg', 15)}
      <span>Tambah Produk</span>
    </button>
  `;

  const rows = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  const inStockCount = rows.filter((p) => stockFor(p.id) > 0).length;
  const outOfStockCount = rows.filter((p) => stockFor(p.id) <= 0).length;

  return `
    ${heading('KATALOG MASTER', 'Katalog Produk & Harga', 'Kelola spesifikasi produk, harga modal, harga jual, dan status ketersediaan barang.', actions)}

    <section class="stats-grid">
      ${statCard('Total Ragam Produk', `${quantityFormat.format(rows.length)} SKU`, 'Katalog produk terdaftar', Icons.products('icon-svg', 18), 'icon-blue')}
      ${statCard('Stok Fisik Tersedia', `${quantityFormat.format(inStockCount)} Produk`, 'Stok di atas 0 unit', Icons.box('icon-svg', 18), 'icon-green')}
      ${statCard('Stok Habis / Kritis', `${quantityFormat.format(outOfStockCount)} Produk`, 'Perlu antrean produksi', Icons.alertCircle('icon-svg', 18), 'icon-orange')}
      ${statCard('Mutasi Bulan Ini', `${quantityFormat.format(monthRecords(state.inventory, currentMonth).length)} Kali`, 'Aktivitas masuk & keluar', Icons.trendingUp('icon-svg', 18), 'icon-purple')}
    </section>

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Daftar Produk <span class="count-badge">${rows.length} SKU</span></h2>
          <p>Data spesifikasi harga dan posisi stok yang tersinkronisasi otomatis dengan gudang</p>
        </div>
      </div>

      ${rows.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>Kode SKU</th>
                <th>Harga Modal (HPP)</th>
                <th>Harga Jual (Grosir)</th>
                <th>Stok Fisik</th>
                <th>Satuan</th>
                <th class="align-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((product) => {
                const stock = stockFor(product.id);
                const isNegative = stock < 0;
                const isZero = stock === 0;

                return `
                  <tr>
                    <td class="detail-cell">
                      <strong>${escapeHtml(product.name)}</strong>
                    </td>
                    <td><code>${escapeHtml(product.sku || '—')}</code></td>
                    <td class="amount-cell">${formatMoney(product.purchase_price || 0)}</td>
                    <td class="amount-cell" style="font-weight: 600; color: var(--success);">${formatMoney(product.selling_price || 0)}</td>
                    <td class="qty-cell">
                      <strong style="color: ${isNegative || isZero ? 'var(--danger)' : 'var(--text-primary)'};">
                        ${formatQuantity(stock)}
                      </strong>
                      ${isZero ? `<span class="status-pill status-inactive" style="margin-left: 4px; font-size: 10px;">Habis</span>` : ''}
                      ${isNegative ? `<span class="status-pill status-inactive" style="margin-left: 4px; font-size: 10px;">Defisit</span>` : ''}
                    </td>
                    <td><span class="count-badge">${escapeHtml(product.unit)}</span></td>
                    <td class="align-right">
                      <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
                        <button class="button button-small button-outline" data-action="product-movement" data-id="${escapeHtml(product.id)}" title="Input pergerakan stok untuk produk ini">
                          ${Icons.pallet('icon-svg', 13)}
                          <span>Mutasi</span>
                        </button>
                        <button class="icon-button" data-action="edit-product" data-id="${escapeHtml(product.id)}" aria-label="Ubah" title="Ubah data produk">
                          ${Icons.edit('icon-svg', 14)}
                        </button>
                        <button class="icon-button danger-icon" data-action="delete-product" data-id="${escapeHtml(product.id)}" aria-label="Hapus" title="Hapus produk">
                          ${Icons.trash('icon-svg', 14)}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : emptyState('Belum Ada Katalog Produk', 'Tambahkan produk pertama untuk mulai mencatat stok dan pergerakan gudang.')}
    </section>
  `;
}
