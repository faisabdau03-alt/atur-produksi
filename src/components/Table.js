import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, formatMoney, formatQuantity } from '../utils/formatters.js';
import { Icons } from './Icons.js';

export function emptyState(title, detail) {
  return `
    <div class="empty-state">
      <div class="empty-icon">
        ${Icons.box('icon-svg', 22)}
      </div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(detail)}</p>
    </div>
  `;
}

export function movementTable(records, limit = records.length) {
  const rows = [...records].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)).slice(0, limit);
  if (!rows.length) return emptyState('Belum ada catatan', 'Transaksi yang dicatat akan muncul di sini.');

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Tipe</th>
            <th>Rincian Catatan</th>
            <th>Arah / Status</th>
            <th class="align-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
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
            let pillIcon = directionIn ? Icons.arrowIn('icon-svg', 13) : Icons.arrowOut('icon-svg', 13);

            if (isProduction) {
              pillLabel = 'Produksi';
              pillClass = 'status-active';
              pillIcon = Icons.factory('icon-svg', 13);
            } else if (isUsage) {
              pillLabel = 'Pemakaian';
              pillClass = 'status-half_day';
              pillIcon = Icons.wrench('icon-svg', 13);
            } else if (inventory) {
              if (!directionIn && notes.includes('DP')) {
                pillLabel = 'Jual (DP)';
                pillClass = 'status-half_day';
                pillIcon = Icons.truck('icon-svg', 13);
              } else if (!directionIn && (notes.includes('Tempo') || notes.includes('Piutang'))) {
                pillLabel = 'Jual (Tempo)';
                pillClass = 'status-inactive';
                pillIcon = Icons.truck('icon-svg', 13);
              } else if (directionIn && notes.includes('DP')) {
                pillLabel = 'Beli (DP)';
                pillClass = 'status-half_day';
                pillIcon = Icons.box('icon-svg', 13);
              } else if (directionIn && (notes.includes('Tempo') || notes.includes('Utang'))) {
                pillLabel = 'Beli (Tempo)';
                pillClass = 'status-inactive';
                pillIcon = Icons.box('icon-svg', 13);
              } else {
                pillLabel = directionIn ? 'Beli Stok' : 'Pengiriman';
                pillIcon = directionIn ? Icons.arrowIn('icon-svg', 13) : Icons.truck('icon-svg', 13);
              }
            }

            return `
              <tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(row.id)}" data-type="${inventory ? 'inventory' : 'cash'}" title="Klik untuk melihat rincian nota transaksi">
                <td class="date-cell">${formatDate(row.occurred_on)}</td>
                <td><span class="count-badge">${inventory ? 'Gudang' : 'Kas'}</span></td>
                <td class="detail-cell">${escapeHtml(detail)}</td>
                <td>
                  <span class="direction-pill ${pillClass}">
                    ${pillIcon}
                    <span>${pillLabel}</span>
                  </span>
                </td>
                <td class="align-right amount-cell" style="font-weight: 600; color: ${directionIn ? 'var(--success)' : 'var(--danger)'};">
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
