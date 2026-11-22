import { heading, statCard } from '../../components/Header.js';
import { emptyState, movementTable, tableToolbar, tableFooter } from '../../components/Table.js';
import { formatMoney, formatQuantity, quantityFormat, monthRecords, currentMonth } from '../../utils/formatters.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { stockFor, state as appState } from '../../store/state.js';
import { Icons } from '../../components/Icons.js';

export function renderInventory(state = appState) {
  const activeTab = state.inventoryTab || 'catalog';
  const currentFilter = state.productsFilter || 'all';

  const allProducts = [...state.products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const totalCount = allProducts.length;
  const inStockCount = allProducts.filter((p) => stockFor(p.id) > 0).length;
  const outOfStockCount = allProducts.filter((p) => stockFor(p.id) <= 0).length;

  let displayProducts = allProducts;
  if (currentFilter === 'in-stock') {
    displayProducts = allProducts.filter((p) => stockFor(p.id) > 0);
  } else if (currentFilter === 'out-of-stock') {
    displayProducts = allProducts.filter((p) => stockFor(p.id) <= 0);
  }

  const monthInv = monthRecords(state.inventory, currentMonth);
  const invRecords = state.inventory.filter((row) => row.product_id);

  return `
    ${heading('', 'Inventaris & Gudang', 'Pusat pengelolaan katalog barang, stok fisik riil, dan riwayat pergerakan gudang')}

    <div class="stats-grid">
      ${statCard(
        'Total Ragam Produk',
        `${quantityFormat.format(totalCount)} SKU`,
        'Katalog barang terdaftar',
        Icons.products('icon-svg', 28),
        'blue',
        { action: 'filter-products', filter: 'all', hint: 'Tampilkan semua produk di tab katalog', active: activeTab === 'catalog' && currentFilter === 'all' }
      )}
      ${statCard(
        'Stok Fisik Tersedia',
        `${quantityFormat.format(inStockCount)} Produk`,
        'Stok aman di atas 0 unit',
        Icons.box('icon-svg', 28),
        'green',
        { action: 'filter-products', filter: 'in-stock', hint: 'Saring: Produk dengan stok aman (> 0)', active: activeTab === 'catalog' && currentFilter === 'in-stock' }
      )}
      ${statCard(
        'Stok Habis / Kritis',
        `${quantityFormat.format(outOfStockCount)} Produk`,
        'Perlu antrean produksi',
        Icons.alertCircle('icon-svg', 28),
        'red',
        { action: 'filter-products', filter: 'out-of-stock', hint: 'Saring: Produk habis atau stok 0', active: activeTab === 'catalog' && currentFilter === 'out-of-stock' }
      )}
      ${statCard(
        'Mutasi Bulan Ini',
        `${quantityFormat.format(monthInv.length)} Kali`,
        'Aktivitas masuk & keluar',
        Icons.trendingUp('icon-svg', 28),
        'yellow',
        { action: 'switch-inventory-tab', tab: 'movements', hint: 'Buka riwayat pergerakan stok gudang', active: activeTab === 'movements' }
      )}
    </div>

    <!-- 2-TAB NAVIGATION -->
    <div class="nav-tabs-custom">
      <ul class="nav nav-tabs">
        <li class="${activeTab === 'catalog' ? 'active' : ''}">
          <a href="#" data-action="switch-inventory-tab" data-tab="catalog">
            ${Icons.products('icon-svg', 16)}
            <span>Katalog Barang & Sisa Stok (${totalCount})</span>
          </a>
        </li>
        <li class="${activeTab === 'movements' ? 'active' : ''}">
          <a href="#" data-action="switch-inventory-tab" data-tab="movements">
            ${Icons.inventory('icon-svg', 16)}
            <span>Riwayat Mutasi & Produksi (${invRecords.length})</span>
          </a>
        </li>
      </ul>
    </div>

    ${activeTab === 'catalog' 
      ? renderCatalogSection(displayProducts, totalCount, currentFilter) 
      : renderMovementsSection(invRecords, monthInv)
    }
  `;
}

function renderCatalogSection(displayProducts, totalCount, currentFilter) {
  return `
    <div class="box box-primary">
      <div class="box-header">
        <h3 class="box-title">${Icons.products('icon-svg', 18)} Katalog Master Barang & Sisa Stok Fisik</h3>
        <div class="box-tools">
          <button type="button" class="btn btn-info btn-sm" data-action="add-product">
            ${Icons.plus('icon-svg', 13)} Tambah Barang Baru
          </button>
          <button type="button" class="btn btn-default btn-sm" data-action="export-products-excel" title="Unduh data katalog barang format Excel (.xlsx)">
            ${Icons.download('icon-svg', 13)} Unduh Excel
          </button>
        </div>
      </div>

      <div class="box-body">
        ${tableToolbar('search-products')}

        <div class="alert alert-info" style="margin-top: 10px; margin-bottom: 14px; padding: 10px 14px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; background-color: #d9edf7; border-color: #bce8f1; color: #31708f;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${currentFilter === 'all' ? '📋' : '🔍'}</span>
            <span>
              ${currentFilter === 'all' 
                ? `Menampilkan: <strong>Seluruh Katalog Barang (${totalCount} SKU)</strong> — Menampilkan semua jenis barang terdaftar dengan info modal HPP, 3 tier harga jual, dan sisa stok fisik riil di gudang.` 
                : `Menyaring tampilan: <strong>${currentFilter === 'in-stock' ? 'Stok Fisik Tersedia (> 0)' : 'Stok Habis / Kritis (≤ 0)'}</strong> — Menampilkan <strong>${displayProducts.length}</strong> dari <strong>${totalCount}</strong> SKU.`}
            </span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-default btn-xs" data-action="open-stat-detail" data-stat="products" style="font-weight: 600; background: #fff; border-color: #ccc; padding: 4px 10px;" title="Buka ringkasan produk dalam jendela pop-up">
              🔍 Rincian Pop-up
            </button>
            ${currentFilter !== 'all' ? `
              <button type="button" class="btn btn-default btn-xs" data-action="filter-products" data-filter="all" style="font-weight: 600; background: #fff; border-color: #ccc; padding: 4px 10px;">
                ✕ Tampilkan Semua
              </button>
            ` : ''}
          </div>
        </div>

        ${displayProducts.length ? `
          <div class="table-responsive">
            <table class="table table-bordered table-hover table-striped" id="products-table">
              <thead>
                <tr>
                  <th style="width: 45px;" class="align-center">NO</th>
                  <th style="width: 120px;">KODE / SKU</th>
                  <th>NAMA BARANG</th>
                  <th class="align-right">HARGA BELI / HPP</th>
                  <th class="align-right" style="min-width: 175px;">HARGA JUAL (3 TIER)</th>
                  <th class="align-right">STOK FISIK</th>
                  <th style="width: 80px;" class="align-center">SATUAN</th>
                  <th style="width: 120px;" class="align-center">OPSI</th>
                </tr>
              </thead>
              <tbody>
                ${displayProducts.map((product, idx) => {
                  const stock = stockFor(product.id);
                  const isNegative = stock < 0;
                  const isZero = stock === 0;

                  return `
                    <tr>
                      <td class="align-center">${idx + 1}</td>
                      <td><code>${escapeHtml(product.sku || '—')}</code></td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                          <strong>${escapeHtml(product.name)}</strong>
                          ${product.source_type === 'purchase'
                            ? `<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:10px; font-weight:600; padding: 2px 6px; border-radius: 4px;" title="Barang Kulakan / Beli dari Supplier Luar">🛒 Beli Luar</span>`
                            : `<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:10px; font-weight:600; padding: 2px 6px; border-radius: 4px;" title="Produksi Sendiri Pabrik Jaya Wijaya">🏭 Produksi Pabrik</span>`
                          }
                        </div>
                      </td>
                      <td class="align-right amount-cell">${formatMoney(product.purchase_price || 0)}</td>
                      <td class="align-right amount-cell" style="font-size: 12px; line-height: 1.45;">
                        <div style="font-weight: 700; color: #00a65a;" title="Harga Jual Satuan (Eceran)">
                          <span style="font-size: 10px; color: #777; font-weight: normal;">Satuan: </span>${formatMoney(product.selling_price || 0)}
                        </div>
                        ${Number(product.price_sales) > 0 ? `
                          <div style="color: #2563eb; font-weight: 600;" title="Harga Jual Sales / Reseller">
                            <span style="font-size: 10px; color: #777; font-weight: normal;">Sales: </span>${formatMoney(product.price_sales)}
                          </div>
                        ` : ''}
                        ${Number(product.price_wholesale) > 0 ? `
                          <div style="color: #d97706; font-weight: 600;" title="Harga Jual Grosir / Partai">
                            <span style="font-size: 10px; color: #777; font-weight: normal;">Grosir: </span>${formatMoney(product.price_wholesale)}
                          </div>
                        ` : ''}
                      </td>
                      <td class="align-right qty-cell">
                        <strong style="color: ${isNegative || isZero ? '#dd4b39' : '#333333'};">
                          ${formatQuantity(stock)}
                        </strong>
                        ${isZero ? `<span class="status-pill status-danger" style="margin-left: 4px; font-size: 9px;">Habis</span>` : ''}
                      </td>
                      <td class="align-center"><span class="label label-default">${escapeHtml(product.unit)}</span></td>
                      <td class="align-center">
                        <div class="btn-group-opsi">
                          <button type="button" class="btn-opsi-edit" data-action="product-movement" data-id="${escapeHtml(product.id)}" title="Catat keluar/masuk untuk produk ini" style="background: #00a65a; border-color: #008d4c; color: #fff;">
                            ${Icons.plus('icon-svg', 11)}
                          </button>
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
        ` : (currentFilter !== 'all' 
              ? emptyState('Tidak ada produk yang sesuai dengan filter', 'Semua produk saat ini berada di luar kategori ini. Klik "Tampilkan Semua" untuk melihat seluruh katalog.')
              : emptyState('Belum ada data barang', 'Klik tombol "Tambah Barang Baru" di atas untuk menambahkan produk ke sistem.')
            )}
      </div>

      <div class="box-footer">
        ${tableFooter(displayProducts.length, totalCount)}
      </div>
    </div>
  `;
}

function renderMovementsSection(invRecords, monthInv = []) {
  return `
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
          <button type="button" class="btn btn-default btn-sm" data-action="export-inventory-excel" title="Unduh mutasi persediaan format Excel (.xlsx)">
            ${Icons.download('icon-svg', 13)} Unduh Excel
          </button>
        </div>
      </div>

      <div class="box-body">
        ${tableToolbar('search-inventory')}

        <div class="alert alert-info" style="margin-top: 10px; margin-bottom: 14px; padding: 10px 14px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; background-color: #d9edf7; border-color: #bce8f1; color: #31708f;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🔄</span>
            <span>
              Menampilkan riwayat: <strong>Mutasi & Pergerakan Barang (${monthInv.length} Catatan Bulan Ini)</strong>
              — Total <strong>${invRecords.length}</strong> aktivitas mutasi stok barang masuk (hasil produksi & belanja) serta stok keluar (penjualan nota & pemakaian internal).
            </span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-default btn-xs" data-action="open-stat-detail" data-stat="inventory-movements" style="font-weight: 600; background: #fff; border-color: #ccc; padding: 4px 10px;" title="Buka ringkasan audit mutasi dalam jendela pop-up">
              🔍 Rincian Pop-up
            </button>
            <button type="button" class="btn btn-default btn-xs" data-action="switch-inventory-tab" data-tab="catalog" style="font-weight: 600; background: #fff; border-color: #ccc; padding: 4px 10px;">
              ✕ Lihat Katalog Barang
            </button>
          </div>
        </div>

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
