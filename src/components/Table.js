import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, formatMoney, formatQuantity } from '../utils/formatters.js';
import { Icons } from './Icons.js';

export function emptyState(title, detail) {
  return `
    <div style="text-align: center; padding: 30px 15px; color: #777;">
      <div style="color: #bbb; margin-bottom: 8px;">
        ${Icons.box('icon-svg', 32)}
      </div>
      <h4 style="margin: 0 0 5px; font-weight: 600; color: #555;">${escapeHtml(title)}</h4>
      <p style="margin: 0; font-size: 12.5px;">${escapeHtml(detail)}</p>
    </div>
  `;
}

export function opsiButtons(id, type, editAction = `edit-${type}`, deleteAction = `delete-${type}`) {
  return `
    <div class="btn-group-opsi">
      <button type="button" class="btn-opsi-edit" data-action="${editAction}" data-id="${escapeHtml(id)}" title="Ubah data">
        ${Icons.wrench('icon-svg', 13)}
      </button>
      <button type="button" class="btn-opsi-delete" data-action="${deleteAction}" data-id="${escapeHtml(id)}" title="Hapus data">
        ${Icons.trash('icon-svg', 13)}
      </button>
    </div>
  `;
}

export function boxWrapper(title, toolsHtml = '', bodyHtml = '', footerHtml = '', boxType = 'box-primary') {
  return `
    <div class="box ${boxType}">
      <div class="box-header">
        <h3 class="box-title">${title}</h3>
        ${toolsHtml ? `<div class="box-tools">${toolsHtml}</div>` : ''}
      </div>
      <div class="box-body">
        ${bodyHtml}
      </div>
      ${footerHtml ? `<div class="box-footer">${footerHtml}</div>` : ''}
    </div>
  `;
}

export function tableToolbar(searchId = 'table-search', actionButtons = '') {
  return `
    <div class="table-toolbar">
      <div>${actionButtons}</div>
      <div class="table-filter-search">
        <label for="${searchId}">Search:</label>
        <input type="text" id="${searchId}" placeholder="Ketik untuk mencari..." />
      </div>
    </div>
  `;
}

export function tableFooter(total = 0, current = 0) {
  return `
    <div>Showing 1 to ${current || total} of ${total} entries</div>
    <ul class="table-pagination">
      <li><span class="paginate-btn">Previous</span></li>
      <li><span class="paginate-btn active">1</span></li>
      <li><span class="paginate-btn">Next</span></li>
    </ul>
  `;
}

export function movementTable(records, limit = records.length) {
  const rows = [...records].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)).slice(0, limit);
  if (!rows.length) return emptyState('Belum ada catatan', 'Transaksi yang dicatat akan muncul di sini.');

  return `
    <div class="table-responsive">
      <table class="table table-bordered table-hover table-striped">
        <thead>
          <tr>
            <th style="width: 50px;">NO</th>
            <th>TANGGAL</th>
            <th>POS / BIDANG</th>
            <th>RINCIAN CATATAN</th>
            <th>ARAH</th>
            <th class="align-right">NOMINAL / UNIT</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => {
            const inventory = 'product_id' in row;
            const directionIn = row.direction === 'in';
            const notes = row.notes || '';
            const isProduction = inventory && (notes.includes('Hasil Produksi') || notes.toLowerCase().includes('produksi'));
            const isUsage = inventory && !directionIn && (notes.includes('Pemakaian') || notes.toLowerCase().includes('internal') || notes.toLowerCase().includes('reject'));

            const detail = inventory
              ? `${row.products?.name || 'Produk'}${row.notes ? ` · ${row.notes}` : ''}`
              : `${row.category}${row.description ? ` · ${row.description}` : ''}`;

            let pillLabel = directionIn ? 'Masuk' : 'Keluar';
            let pillClass = directionIn ? 'pill-in' : 'pill-out';

            if (isProduction) {
              pillLabel = 'Produksi';
              pillClass = 'pill-in';
            } else if (isUsage) {
              pillLabel = 'Pemakaian';
              pillClass = 'pill-out';
            }

            return `
              <tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(row.id)}" data-type="${inventory ? 'inventory' : 'cash'}" title="Klik untuk melihat rincian nota transaksi">
                <td style="text-align: center;">${index + 1}</td>
                <td class="date-cell">${formatDate(row.occurred_on)}</td>
                <td><strong>${inventory ? 'Persediaan Gudang' : 'Buku Kas'}</strong></td>
                <td>${escapeHtml(detail)}</td>
                <td>
                  <span class="direction-pill ${pillClass}">
                    <span>${pillLabel}</span>
                  </span>
                </td>
                <td class="align-right amount-cell" style="font-weight: 700; color: ${directionIn ? '#00a65a' : '#dd4b39'};">
                  ${inventory 
                    ? `${directionIn ? '+' : '−'}${formatQuantity(row.quantity)} ${escapeHtml(row.products?.unit || '')}` 
                    : `${directionIn ? '+' : '−'}${formatMoney(row.amount)}`
                  }
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
