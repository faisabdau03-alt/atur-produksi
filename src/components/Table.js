import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, formatMoney, formatQuantity } from '../utils/formatters.js';

export function emptyState(title, detail) {
  return `<div class="empty-state"><span class="empty-icon">◇</span><strong>${title}</strong><span>${detail}</span></div>`;
}

export function movementTable(records, limit = records.length) {
  const rows = [...records].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)).slice(0, limit);
  if (!rows.length) return emptyState('Belum ada catatan', 'Transaksi yang dicatat akan muncul di sini.');
  return `<div class="table-wrap"><table><thead><tr><th>TANGGAL</th><th>JENIS</th><th>RINCIAN</th><th>ARAH</th><th class="align-right">JUMLAH</th></tr></thead><tbody>
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
      let pillStyle = '';

      if (isProduction) {
        pillLabel = '🏭 Produksi';
        pillStyle = 'background: #edf7f0; color: #187554; border: 1px solid #b7e2c9; font-weight: 700;';
      } else if (isUsage) {
        pillLabel = '📦 Pemakaian';
        pillStyle = 'background: #fff8e1; color: #855900; border: 1px solid #ffe082; font-weight: 600;';
      } else if (inventory) {
        if (!directionIn && notes.includes('DP')) {
          pillLabel = '🚚 Jual (DP)';
          pillStyle = 'background: #fff8e1; color: #9c6500; border: 1px solid #ffe082; font-weight: 600;';
        } else if (!directionIn && (notes.includes('Tempo') || notes.includes('Piutang'))) {
          pillLabel = '🚚 Jual (Tempo)';
          pillStyle = 'background: #fdf2e9; color: #b05a18; border: 1px solid #fcd6b5; font-weight: 600;';
        } else if (directionIn && notes.includes('DP')) {
          pillLabel = '🛒 Beli (DP)';
          pillStyle = 'background: #fff8e1; color: #9c6500; border: 1px solid #ffe082; font-weight: 600;';
        } else if (directionIn && (notes.includes('Tempo') || notes.includes('Utang'))) {
          pillLabel = '🛒 Beli (Tempo)';
          pillStyle = 'background: #fdf2e9; color: #b05a18; border: 1px solid #fcd6b5; font-weight: 600;';
        } else {
          pillLabel = directionIn ? '🛒 Beli' : '🚚 Jual';
        }
      }

      return `<tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(row.id)}" data-type="${inventory ? 'inventory' : 'cash'}" title="Klik untuk melihat & cetak nota transaksi">
        <td class="date-cell">${formatDate(row.occurred_on)}</td><td>${inventory ? 'Barang' : 'Kas'}</td>
        <td class="detail-cell">${escapeHtml(detail)}</td>
        <td><span class="direction-pill ${pillClass}" style="${pillStyle}"><span></span>${pillLabel}</span></td>
        <td class="align-right amount-cell">${inventory ? `${directionIn ? '+' : '−'}${formatQuantity(row.quantity)} ${escapeHtml(row.products?.unit || '')}` : `${directionIn ? '+' : '−'}${formatMoney(row.amount)}`}</td></tr>`;
    }).join('')}
    </tbody></table></div>`;
}
