import { openDialog } from '../../components/Dialog.js';
import { runMutation } from '../../utils/mutation.js';
import { localDate } from '../../utils/formatters.js';
import { db } from '../../api/db.js';

export function openCashModal(onSaved = null) {
  openDialog('Catat Transaksi Kas', `
    <form id="cash-form" class="form-stack">
      <div class="form-group">
        <label class="form-label" for="cash-direction">
          Jenis Transaksi Kas <span class="required">*</span>
        </label>
        <select class="form-control" name="direction" id="cash-direction" required>
          <option value="out">Uang Keluar (Pengeluaran / Biaya Operasional)</option>
          <option value="in">Uang Masuk (Pemasukan / Pembayaran Pelanggan)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="cash-amount">
          Nominal Uang (Rp) <span class="required">*</span>
        </label>
        <input class="form-control" id="cash-amount" name="amount" type="number" min="1" step="1" placeholder="Contoh: 150000" required />
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="cash-category">
            Kategori Transaksi <span class="required">*</span>
          </label>
          <input class="form-control" id="cash-category" name="category" list="cash-categories" maxlength="80" placeholder="Pilih atau ketik kategori" required />
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
        </div>
        <div class="form-group">
          <label class="form-label" for="cash-date">
            Tanggal Transaksi <span class="required">*</span>
          </label>
          <input class="form-control" id="cash-date" name="occurred_on" type="date" value="${localDate}" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" id="cash-desc-label" for="cash-desc-input">
          Catatan / Rincian Keperluan <span class="required">*</span>
        </label>
        <input class="form-control" name="description" id="cash-desc-input" maxlength="240" placeholder="Wajib diisi: contoh biaya oli mesin & ganti pisau potong" required />
      </div>

      <div class="modal-form-actions">
        <button type="button" class="btn btn-default" data-action="close-dialog">Batal</button>
        <button class="btn btn-primary" type="submit">
          Simpan Transaksi Kas
        </button>
      </div>
    </form>`);

  const dirSelect = document.querySelector('#cash-direction');
  const descLabel = document.querySelector('#cash-desc-label');
  const descInput = document.querySelector('#cash-desc-input');

  if (dirSelect && descLabel && descInput) {
    dirSelect.addEventListener('change', () => {
      if (dirSelect.value === 'out') {
        descLabel.innerHTML = 'Catatan / Rincian Keperluan <span class="required">*</span>';
        descInput.placeholder = 'Wajib diisi: contoh biaya oli mesin & ganti pisau potong';
      } else {
        descLabel.innerHTML = 'Catatan Sumber Uang Masuk <span class="required">*</span>';
        descInput.placeholder = 'Wajib diisi: contoh penjualan produk, pelunasan nota, dll.';
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
        amount: Number(fd.get('amount')) || 0,
        category: fd.get('category').trim(),
        description: fd.get('description').trim(),
        occurred_on: fd.get('occurred_on') || localDate,
      };
      await runMutation(async () => {
        const { error } = await db.from('cash_transactions').insert(payload);
        return error;
      }, 'Transaksi kas berhasil dicatat.', onSaved);
    });
  }
}
