import { heading, statCard } from '../../components/Header.js';
import { emptyState, tableToolbar, tableFooter } from '../../components/Table.js';
import { formatMoney, formatQuantity, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { stockFor, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderProducts(state = appState) {
  const rows = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  const inStockCount = rows.filter((p) => stockFor(p.id) > 0).length;
  const outOfStockCount = rows.filter((p) => stockFor(p.id) <= 0).length;

  return `
    ${heading('', 'Data Barang', 'Master data barang dan inventaris produk pabrik')}

    <div class="stats-grid">
      ${statCard('Total Ragam Barang', `${quantityFormat.format(rows.length)} SKU`, 'Katalog produk terdaftar', Icons.products('icon-svg', 28), 'blue')}
      ${statCard('Stok Fisik Tersedia', `${quantityFormat.format(inStockCount)} Produk`, 'Stok di atas 0 unit', Icons.box('icon-svg', 28), 'green')}
      ${statCard('Stok Habis / Kritis', `${quantityFormat.format(outOfStockCount)} Produk`, 'Perlu antrean produksi', Icons.alertCircle('icon-svg', 28), 'red')}
      ${statCard('Mutasi Bulan Ini', `${quantityFormat.format(monthRecords(state.inventory, currentMonth).length)} Kali`, 'Aktivitas pergerakan gudang', Icons.trendingUp('icon-svg', 28), 'yellow')}
    </div>

    <div class="box box-primary">
      <div class="box-header">
        <h3 class="box-title">${Icons.products('icon-svg', 18)} Data Barang</h3>
        <div class="box-tools">
          <button type="button" class="btn btn-info btn-sm" data-action="add-product">
            ${Icons.plus('icon-svg', 13)} Tambah Barang Baru
          </button>
          <button type="button" class="btn btn-success btn-sm" data-action="add-production">
            ${Icons.factory('icon-svg', 13)} Hasil Produksi
          </button>
          <button type="button" class="btn btn-primary btn-sm" data-action="download-report" data-month="${currentMonth}">
            ${Icons.printer('icon-svg', 13)} PRINT
          </button>
        </div>
      </div>

      <div class="box-body">
        ${tableToolbar('search-products')}

        ${rows.length ? `
          <div class="table-responsive">
            <table class="table table-bordered table-hover table-striped" id="products-table">
              <thead>
                <tr>
                  <th style="width: 45px;" class="align-center">NO</th>
                  <th style="width: 120px;">KODE / SKU</th>
                  <th>NAMA BARANG</th>
                  <th class="align-right">HARGA BELI / HPP</th>
                  <th class="align-right">HARGA JUAL</th>
                  <th class="align-right">STOK FISIK</th>
                  <th style="width: 90px;" class="align-center">SATUAN</th>
                  <th style="width: 85px;" class="align-center">OPSI</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((product, idx) => {
                  const stock = stockFor(product.id);
                  const isNegative = stock < 0;
                  const isZero = stock === 0;

                  return `
                    <tr>
                      <td class="align-center">${idx + 1}</td>
                      <td><code>${escapeHtml(product.sku || '—')}</code></td>
                      <td>
                        <strong>${escapeHtml(product.name)}</strong>
                      </td>
                      <td class="align-right amount-cell">${formatMoney(product.purchase_price || 0)}</td>
                      <td class="align-right amount-cell" style="font-weight: 700; color: #00a65a;">${formatMoney(product.selling_price || 0)}</td>
                      <td class="align-right qty-cell">
                        <strong style="color: ${isNegative || isZero ? '#dd4b39' : '#333333'};">
                          ${formatQuantity(stock)}
                        </strong>
                        ${isZero ? `<span class="status-pill status-danger" style="margin-left: 4px; font-size: 9px;">Habis</span>` : ''}
                      </td>
                      <td class="align-center"><span class="label label-default">${escapeHtml(product.unit)}</span></td>
                      <td class="align-center">
                        <div class="btn-group-opsi">
                          <button type="button" class="btn-opsi-edit" data-action="edit-product" data-id="${escapeHtml(product.id)}" title="Ubah barang">
                            ${Icons.wrench('icon-svg', 13)}
                          </button>
                          <button type="button" class="btn-opsi-delete" data-action="delete-product" data-id="${escapeHtml(product.id)}" title="Hapus barang">
                            ${Icons.trash('icon-svg', 13)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : emptyState('Belum ada data barang', 'Klik tombol "Tambah Barang Baru" di atas untuk menambahkan produk ke sistem.')}
      </div>

      <div class="box-footer">
        ${tableFooter(rows.length, rows.length)}
      </div>
    </div>
  `;
}
