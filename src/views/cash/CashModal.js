import { openDialog } from '../../components/Dialog.js';
import { runMutation } from '../../utils/mutation.js';
import { localDate } from '../../utils/formatters.js';
import { db } from '../../api/db.js';

export function openCashModal(onSaved = null) {
  openDialog('Catat transaksi kas', `
    <form id="cash-form" class="form-stack">
      <label>Jenis transaksi
        <select name="direction" id="cash-direction" required>
          <option value="out">Uang keluar (Pengeluaran)</option>
          <option value="in">Uang masuk (Pemasukan)</option>
        </select>
      </label>
      <label>Jumlah (Rp)<input name="amount" type="number" min="1" step="1" placeholder="0" required /></label>
      <div class="form-row">
        <label>Kategori
          <input name="category" list="cash-categories" maxlength="80" placeholder="Pilih atau ketik kategori" required />
          <datalist id="cash-categories">
            <option value="Operasional Alat & Mesin" />
            <option value="Perawatan & Perbaikan" />
            <option value="Bahan Baku & Material" />
            <option value="Listrik, Air & Utilitas Pabrik" />
            <option value="Gaji & Upah Karyawan" />
            <option value="Transportasi & Logistik" />
            <option value="Konsumsi & Keperluan Kantor" />
            <option value="Penjualan Produk" />
            <option value="Penjualan Produk (DP)" />
            <option value="Pelunasan Piutang Penjualan" />
            <option value="Pelunasan Utang Pembelian" />
            <option value="Lain-lain" />
          </datalist>
        </label>
        <label>Tanggal<input name="occurred_on" type="date" value="${localDate}" required /></label>
      </div>
      <label id="cash-desc-label">Catatan / Untuk Apa Uang Tersebut <span style="color: #c93b2b;">*</span>
        <input name="description" id="cash-desc-input" maxlength="240" placeholder="Wajib diisi: contoh biaya oli mesin & ganti pisau potong" required />
      </label>
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button class="button button-primary" type="submit">Simpan transaksi</button>
      </div>
    </form>`);

  const dirSelect = document.querySelector('#cash-direction');
  const descLabel = document.querySelector('#cash-desc-label');
  const descInput = document.querySelector('#cash-desc-input');

  if (dirSelect && descLabel && descInput) {
    dirSelect.addEventListener('change', () => {
      if (dirSelect.value === 'out') {
        descLabel.childNodes[0].nodeValue = 'Catatan / Untuk Apa Uang Tersebut ';
        descInput.placeholder = 'Wajib diisi: contoh operasional alat, listrik pabrik, dll.';
      } else {
        descLabel.childNodes[0].nodeValue = 'Catatan Sumber Uang Masuk ';
        descInput.placeholder = 'Wajib diisi: contoh penjualan barang, pelunasan nota, dll.';
      }
    });
  }

  const form = document.querySelector('#cash-form');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(form);
      const payload = {
        direction: fd.get('direction'),
        amount: Number(fd.get('amount')),
        category: fd.get('category').trim(),
        description: fd.get('description').trim(),
        occurred_on: fd.get('occurred_on'),
      };

      await runMutation(async () => {
        const { error } = await db.from('cash_transactions').insert(payload);
        return error;
      }, 'Transaksi kas berhasil dicatat.', onSaved);
    });
  }
}
