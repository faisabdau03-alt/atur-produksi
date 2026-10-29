import { db } from '../../api/db.js';
import { state, localDate } from '../../store/state.js';
import { openDialog, closeDialog } from '../../components/Dialog.js';
import { notify, showError } from '../../components/Toast.js';
import { runMutation } from '../../utils/mutation.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { formatMoney, formatQuantity, formatDate, ATTENDANCE_LABELS } from '../../utils/formatters.js';
import { calculateMonthlySalary } from './salaryCalc.js';
import { emptyState } from '../../components/Table.js';
import { Icons } from '../../components/Icons.js';

export function employeeForm(employee = null) {
  openDialog(employee ? 'Ubah data karyawan' : 'Tambah karyawan baru', `<form id="employee-form" class="form-stack">
    <label>Nama lengkap<input name="full_name" maxlength="120" value="${escapeHtml(employee?.full_name || '')}" placeholder="Nama lengkap karyawan" required /></label>
    <label>Jabatan<input name="position" maxlength="80" value="${escapeHtml(employee?.position || 'Produksi')}" placeholder="Contoh: Operator Mesin Cetak, Finishing, QC" required /></label>
    <div class="form-row">
      <label>Upah pokok per hari (Rp)<input name="daily_salary" type="number" min="0" step="1" value="${escapeHtml(employee?.daily_salary ?? '')}" placeholder="Contoh: 120000" required /></label>
      <label>Tarif lembur per jam (Rp)<input name="overtime_rate" type="number" min="0" step="1" value="${escapeHtml(employee?.overtime_rate ?? '0')}" placeholder="Contoh: 20000" required /></label>
    </div>
    <label>Insentif per unit produksi (Rp)<input name="incentive_per_unit" type="number" min="0" step="1" value="${escapeHtml(employee?.incentive_per_unit ?? '0')}" placeholder="Contoh: 150" required /></label>
    ${employee ? `<label class="checkbox-label"><input name="is_active" type="checkbox" ${employee.is_active ? 'checked' : ''} /> Karyawan aktif</label>` : ''}
    <div class="dialog-actions"><button type="button" class="button button-quiet" data-action="close-dialog">Batal</button><button class="button button-primary" type="submit">${employee ? 'Simpan perubahan' : 'Simpan karyawan'}</button></div>
  </form>`);

  document.querySelector('#employee-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dailySalary = Number(form.get('daily_salary')) || 0;
    const payload = {
      full_name: form.get('full_name').trim(),
      position: form.get('position').trim(),
      daily_salary: dailySalary,
      monthly_salary: dailySalary * 25,
      overtime_rate: Number(form.get('overtime_rate')) || 0,
      incentive_per_unit: Number(form.get('incentive_per_unit')) || 0,
    };
    if (employee) payload.is_active = form.has('is_active');
    await runMutation(async () => {
      const result = employee
        ? await db.from('employees').update(payload).eq('id', employee.id)
        : await db.from('employees').insert(payload);
      return result.error;
    }, employee ? 'Data karyawan diperbarui.' : 'Karyawan berhasil ditambahkan.');
  });
}

export function attendanceForm(record = null, defaultEmpId = null, defaultDate = null) {
  const activeEmployees = state.employees.filter((employee) => employee.is_active);
  if (!activeEmployees.length) {
    notify('Tambahkan karyawan aktif terlebih dahulu.', 'error');
    return;
  }
  const selectedEmpId = record?.employee_id || defaultEmpId || activeEmployees[0].id;
  const selectedEmp = activeEmployees.find((e) => e.id === selectedEmpId) || activeEmployees[0];
  const targetDate = record?.work_date || record?.period || defaultDate || state.selectedPayrollDate || localDate;
  const initialStatus = record?.attendance_status || 'present';
  const initialQty = record?.production_quantity ?? 0;
  const initialOtHours = record?.overtime_hours ?? 0;
  const initialOtRate = (record?.overtime_rate !== undefined && record?.overtime_rate !== null)
    ? Number(record.overtime_rate)
    : (Number(selectedEmp?.overtime_rate) || 0);
  const initialNotes = record?.notes || '';

  const employeeOptions = activeEmployees.map((emp) => `
    <option value="${escapeHtml(emp.id)}" data-daily="${emp.daily_salary || 0}" data-overtime="${emp.overtime_rate || 0}" data-incentive="${emp.incentive_per_unit || 0}" ${emp.id === selectedEmpId ? 'selected' : ''}>
      ${escapeHtml(emp.full_name)} · Pokok ${formatMoney(emp.daily_salary || 0)}/hr · Lembur ${formatMoney(emp.overtime_rate || 0)}/jam
    </option>`).join('');

  openDialog(record ? 'Ubah absensi harian' : 'Catat absensi harian', `
    <form id="attendance-form" class="form-stack">
      <label>Karyawan
        <select name="employee_id" id="att-employee" required ${record ? 'disabled' : ''}>${employeeOptions}</select>
      </label>
      <div class="form-row">
        <label>Tanggal kerja
          <input name="work_date" id="att-date" type="date" value="${escapeHtml(targetDate)}" required ${record ? 'readonly' : ''} />
        </label>
        <label>Status kehadiran
          <select name="attendance_status" id="att-status" required>
            <option value="present" ${initialStatus === 'present' ? 'selected' : ''}>Hadir Penuh (100% Upah Pokok)</option>
            <option value="half_day" ${initialStatus === 'half_day' ? 'selected' : ''}>Setengah Hari (50% Upah Pokok)</option>
            <option value="permit" ${initialStatus === 'permit' ? 'selected' : ''}>Izin (0% Upah Pokok)</option>
            <option value="sick" ${initialStatus === 'sick' ? 'selected' : ''}>Sakit (0% Upah Pokok)</option>
            <option value="absent" ${initialStatus === 'absent' ? 'selected' : ''}>Alpa / Tanpa Keterangan (0% Upah Pokok)</option>
          </select>
        </label>
      </div>

      <div class="form-row">
        <label>Upah pokok hari ini (Rp)
          <input name="daily_wage" id="att-daily-wage" type="number" min="0" step="1" required />
        </label>
        <label>Jumlah produksi hari ini (unit)
          <input name="production_quantity" id="att-prod-qty" type="number" min="0" step="0.01" value="${escapeHtml(initialQty)}" placeholder="0" />
        </label>
      </div>

      ${state.products.length && !record ? `
      <div id="att-sync-box" style="display: ${initialQty > 0 ? 'block' : 'none'}; margin: 3px 0 6px; padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
        <label class="checkbox-label" style="font-weight: 600; color: #166534; display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 6px;">
          <input type="checkbox" name="sync_to_stock" id="att-sync-stock" />
          <span style="display: inline-flex; align-items: center; gap: 6px;">${Icons.factory('icon-svg', 15)} Masukkan hasil produksi ini langsung ke stok persediaan</span>
        </label>
        <div id="att-sync-prod-wrap" style="display: none; margin-top: 6px;">
          <label style="font-size: 11px; color: #285e43;">Pilih produk yang dihasilkan:
            <select name="sync_product_id" id="att-sync-prod-id" style="margin-top: 4px;">
              ${state.products.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.unit)})</option>`).join('')}
            </select>
          </label>
        </div>
      </div>` : ''}

      <div class="form-row">
        <label>Jam lembur hari ini (jam)
          <input name="overtime_hours" id="att-ot-hours" type="number" min="0" max="24" step="0.5" value="${escapeHtml(initialOtHours)}" placeholder="0" />
        </label>
        <label>Tarif lembur per jam (Rp) — <span style="font-weight: normal; color: #176d51;">Dapat diubah admin</span>
          <input name="overtime_rate" id="att-ot-rate" type="number" min="0" step="500" value="${escapeHtml(initialOtRate)}" placeholder="Contoh: 20000" required />
        </label>
      </div>

      <div class="formula-note" id="att-calc-summary">
        Menghitung estimasi upah...
      </div>

      <label>Catatan kehadiran / hasil kerja <span class="optional">(opsional)</span>
        <input name="notes" id="att-notes" maxlength="200" value="${escapeHtml(initialNotes)}" placeholder="Contoh: Lembur 1.5 jam, potong bahan 200 lembar" />
      </label>

      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button class="button button-primary" type="submit">${record ? 'Simpan perubahan' : 'Simpan absensi'}</button>
      </div>
    </form>`);

  const form = document.querySelector('#attendance-form');
  const empSelect = form.querySelector('#att-employee');
  const statusSelect = form.querySelector('#att-status');
  const wageInput = form.querySelector('#att-daily-wage');
  const qtyInput = form.querySelector('#att-prod-qty');
  const otHoursInput = form.querySelector('#att-ot-hours');
  const otRateInput = form.querySelector('#att-ot-rate');
  const summaryBox = form.querySelector('#att-calc-summary');
  const syncBox = form.querySelector('#att-sync-box');
  const syncStockCheck = form.querySelector('#att-sync-stock');
  const syncProdWrap = form.querySelector('#att-sync-prod-wrap');

  if (syncBox && syncStockCheck && syncProdWrap) {
    syncStockCheck.addEventListener('change', () => {
      syncProdWrap.style.display = syncStockCheck.checked ? 'block' : 'none';
    });
  }

  function calculateWage(autoFillDefaults = true) {
    const selectedOption = empSelect.selectedOptions[0];
    const dailySalary = Number(selectedOption?.dataset?.daily) || 0;
    const defaultOvertimeRate = Number(selectedOption?.dataset?.overtime) || 0;
    const incentiveRate = Number(selectedOption?.dataset?.incentive) || 0;
    const status = statusSelect.value;
    const rateMultiplier = ATTENDANCE_LABELS[status]?.rate ?? 0;
    const standardDailyWage = Math.round(dailySalary * rateMultiplier);

    if (autoFillDefaults || wageInput.value === '') {
      wageInput.value = standardDailyWage;
    }
    if (autoFillDefaults || otRateInput.value === '') {
      otRateInput.value = defaultOvertimeRate;
    }

    const currentWage = Number(wageInput.value) || 0;
    const otHours = Number(otHoursInput.value) || 0;
    const currentOtRate = Number(otRateInput.value) || 0;
    const otPay = Math.round(otHours * currentOtRate);
    const qty = Number(qtyInput.value) || 0;
    const incentiveAmount = Math.round(qty * incentiveRate);
    const totalWage = currentWage + otPay + incentiveAmount;

    summaryBox.innerHTML = `
      <strong>Estimasi Nilai Kerja Hari Ini:</strong><br />
      • Upah pokok: <strong>${formatMoney(currentWage)}</strong> (${ATTENDANCE_LABELS[status]?.label || status})<br />
      • Upah lembur: ${formatQuantity(otHours)} jam × ${formatMoney(currentOtRate)}/jam = <strong style="color: #b86e1e;">${formatMoney(otPay)}</strong><br />
      • Insentif produksi: ${formatQuantity(qty)} unit × ${formatMoney(incentiveRate)} = <strong>${formatMoney(incentiveAmount)}</strong><br />
      • <strong>Total estimasi hari ini: ${formatMoney(totalWage)}</strong> (diakumulasi untuk gaji akhir bulan)
    `;

    if (syncBox) {
      syncBox.style.display = qty > 0 ? 'block' : 'none';
      if (qty <= 0 && syncStockCheck) {
        syncStockCheck.checked = false;
        if (syncProdWrap) syncProdWrap.style.display = 'none';
      }
    }
  }

  empSelect.addEventListener('change', () => calculateWage(true));
  statusSelect.addEventListener('change', () => calculateWage(false));
  wageInput.addEventListener('input', () => calculateWage(false));
  qtyInput.addEventListener('input', () => calculateWage(false));
  otHoursInput.addEventListener('input', () => calculateWage(false));
  otRateInput.addEventListener('input', () => calculateWage(false));

  if (record) {
    wageInput.value = record.daily_wage ?? record.base_salary ?? '';
    otRateInput.value = (record.overtime_rate !== undefined && record.overtime_rate !== null)
      ? record.overtime_rate
      : (selectedEmp?.overtime_rate ?? 0);
    calculateWage(false);
  } else {
    calculateWage(true);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const empId = record ? record.employee_id : formData.get('employee_id');
    const workDate = record ? (record.work_date || record.period) : formData.get('work_date');
    const status = formData.get('attendance_status');
    const dailyWage = Number(formData.get('daily_wage')) || 0;
    const prodQty = Number(formData.get('production_quantity')) || 0;
    const otHours = Number(formData.get('overtime_hours')) || 0;
    const otRate = Number(formData.get('overtime_rate')) || 0;
    const notes = (formData.get('notes') || '').trim();
    const shouldSyncStock = !record && formData.has('sync_to_stock') && prodQty > 0;
    const syncProdId = formData.get('sync_product_id');

    const emp = activeEmployees.find((e) => e.id === empId);
    if (!emp) {
      showError('Data karyawan tidak valid.');
      return;
    }

    const otPay = Math.round(otHours * otRate);
    const incentiveRate = emp.incentive_per_unit || 0;
    const incentiveAmount = Math.round(prodQty * incentiveRate);
    const totalAmount = dailyWage + otPay + incentiveAmount;

    const payload = {
      employee_id: empId,
      work_date: workDate,
      period: workDate,
      attendance_status: status,
      daily_wage: dailyWage,
      base_salary: dailyWage,
      overtime_hours: otHours,
      overtime_rate: otRate,
      overtime_pay: otPay,
      production_quantity: prodQty,
      incentive_rate: incentiveRate,
      incentive_amount: incentiveAmount,
      total_amount: totalAmount,
      notes,
    };

    await runMutation(async () => {
      if (record) {
        const { error } = await db.from('payroll_records').update(payload).eq('id', record.id);
        if (error) return error;
      } else {
        const { data: existing } = await db.from('payroll_records')
          .select('id')
          .eq('employee_id', empId)
          .eq('work_date', workDate)
          .maybeSingle();

        if (existing) {
          const { error } = await db.from('payroll_records').update(payload).eq('id', existing.id);
          if (error) return error;
        } else {
          const { error } = await db.from('payroll_records').insert(payload);
          if (error) return error;
        }
      }

      if (shouldSyncStock && syncProdId) {
        const { error: invErr } = await db.from('inventory_movements').insert({
          product_id: syncProdId,
          direction: 'in',
          quantity: prodQty,
          occurred_on: workDate,
          notes: `[Hasil Produksi] Pekerja: ${emp.full_name}${notes ? ` · ${notes}` : ''}`,
        });
        if (invErr) return invErr;
      }

      return null;
    }, shouldSyncStock
      ? `Catatan absensi disimpan & ${formatQuantity(prodQty)} unit hasil produksi ditambahkan ke stok persediaan.`
      : 'Catatan absensi berhasil disimpan.');
  });
}

export function payMonthlySalaryModal(employeeId, month) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return;
  const calc = calculateMonthlySalary(employee, month);

  const title = calc.isPaid
    ? `Rincian Slip Gaji — ${escapeHtml(employee.full_name)} (${escapeHtml(month)})`
    : `Bayar Gaji Akhir Bulan — ${escapeHtml(employee.full_name)}`;

  openDialog(title, `
    <div class="slip-box">
      <div class="slip-row"><span>Nama Pekerja:</span><strong>${escapeHtml(employee.full_name)}</strong></div>
      <div class="slip-row"><span>Jabatan:</span><strong>${escapeHtml(employee.position)}</strong></div>
      <div class="slip-row"><span>Periode Gaji:</span><strong>${escapeHtml(month)}</strong></div>
      <div class="slip-row">
        <span>Status Pembayaran:</span>
        <strong>
          <span class="status-pill ${calc.isPaid ? 'status-paid' : 'status-pending'}">
            ${calc.isPaid ? 'Lunas (Sudah Dibayar)' : 'Belum Dibayar'}
          </span>
        </strong>
      </div>
      ${calc.isPaid && calc.payout?.paid_at ? `
        <div class="slip-row">
          <span>Waktu Pembayaran:</span>
          <strong>${formatDate(calc.payout.paid_at)}</strong>
        </div>
      ` : ''}
      <div class="slip-row">
        <span>Rekap Kehadiran:</span>
        <strong>${calc.effectiveDays} hari kerja efektif (${calc.present}x Hadir, ${calc.halfDay}x ½ Hari, ${calc.permit + calc.sick + calc.absent}x Absen)</strong>
      </div>
      <div class="slip-row">
        <span>Upah Pokok (${calc.effectiveDays} hari × ${formatMoney(calc.dailySalary)}):</span>
        <strong>${formatMoney(calc.baseSalary)}</strong>
      </div>
      <div class="slip-row">
        <span>Upah Lembur (${formatQuantity(calc.totalOvertimeHours)} jam × ${formatMoney(calc.overtimeRate)}/jam):</span>
        <strong style="color: #b86e1e;">${formatMoney(calc.overtimeAmount)}</strong>
      </div>
      <div class="slip-row">
        <span>Insentif Produksi (${formatQuantity(calc.totalProduction)} unit × ${formatMoney(calc.incentiveRate)}):</span>
        <strong>${formatMoney(calc.incentiveAmount)}</strong>
      </div>
      <div class="slip-row">
        <span>TOTAL GAJI:</span>
        <strong style="font-size: 14px;">${formatMoney(calc.totalSalary)}</strong>
      </div>
    </div>
    ${!calc.isPaid ? `
      <div class="formula-note" style="margin: 12px 0 16px;">
        Mengonfirmasi pembayaran ini akan menandai status gaji pekerja menjadi <strong>Lunas</strong> dan otomatis mencatat transaksi <strong>Kas Keluar (Gaji & Upah Karyawan)</strong> sebesar <strong>${formatMoney(calc.totalSalary)}</strong>.
      </div>
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button type="button" class="button button-primary" data-action="confirm-pay-monthly" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}">
          ${Icons.cash('icon-svg', 14)}
          <span>Konfirmasi & Bayar Gaji (Potong Kas)</span>
        </button>
      </div>
    ` : `
      <div class="dialog-actions" style="margin-top: 16px;">
        <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
        <button type="button" class="button button-outline" data-action="view-employee-attendance" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}">
          ${Icons.clipboard('icon-svg', 14)}
          <span>Lihat Rincian Absensi</span>
        </button>
      </div>
    `}
  `);
}

export function viewEmployeeAttendanceModal(employeeId, month) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return;
  const calc = calculateMonthlySalary(employee, month);
  const rows = [...calc.records].sort((a, b) => (a.work_date || a.period).localeCompare(b.work_date || b.period));

  const tableHtml = rows.length ? `
    <div class="table-wrap" style="max-height: 280px; overflow-y: auto;">
      <table><thead><tr>
        <th>Tanggal</th>
        <th>Kehadiran</th>
        <th>Jam Lembur</th>
        <th>Produksi</th>
        <th>Estimasi Upah</th>
        <th>Catatan</th>
      </tr></thead><tbody>
        ${rows.map((r) => {
          const att = ATTENDANCE_LABELS[r.attendance_status] || { label: r.attendance_status, class: 'status-present' };
          const otHours = Number(r.overtime_hours) || 0;
          const recOtRate = (r.overtime_rate !== undefined && r.overtime_rate !== null && r.overtime_rate !== '') ? Number(r.overtime_rate) : (employee.overtime_rate || 0);
          return `<tr>
            <td class="date-cell">${formatDate(r.work_date || r.period)}</td>
            <td><span class="status-pill ${att.class}">${att.label}</span></td>
            <td>${otHours > 0 ? `<span class="status-ot" style="display:inline-flex; align-items:center; gap:2px;">${Icons.zap('icon-svg', 12)} ${formatQuantity(otHours)} jam</span> <span class="sub-meta">@ ${formatMoney(recOtRate)}</span>` : '<span class="sub-meta">—</span>'}</td>
            <td>${formatQuantity(r.production_quantity)} unit</td>
            <td class="amount-cell"><strong>${formatMoney(r.total_amount)}</strong></td>
            <td class="detail-cell" style="font-size: 11px; color: var(--text-muted);">${escapeHtml(r.notes || '—')}</td>
          </tr>`;
        }).join('')}
      </tbody></table>
    </div>
  ` : emptyState('Belum ada catatan absensi', `Pekerja ini belum memiliki catatan kehadiran pada bulan ${month}.`);

  openDialog(`Rincian Kehadiran — ${escapeHtml(employee.full_name)} (${escapeHtml(month)})`, `
    <div style="margin-bottom: 14px;">
      <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        <span class="status-pill status-present">${calc.present}x Hadir</span>
        <span class="status-pill status-half_day">${calc.halfDay}x ½ Hari</span>
        <span class="status-pill status-permit">${calc.permit}x Izin</span>
        <span class="status-pill status-sick">${calc.sick}x Sakit</span>
        <span class="status-pill status-absent">${calc.absent}x Alpa</span>
        ${calc.totalOvertimeHours > 0 ? `<span class="status-pill" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a;">${Icons.zap('icon-svg', 12)} ${formatQuantity(calc.totalOvertimeHours)} Jam Lembur</span>` : ''}
        <span style="font-size: 11px; margin-left: 6px; color: var(--text-secondary); font-weight: 600;">Total: ${calc.effectiveDays} hari kerja efektif</span>
      </div>
    </div>
    ${tableHtml}
    <div class="slip-box" style="margin-top: 14px;">
      <div class="slip-row"><span>Akumulasi Upah Pokok:</span><strong class="amount-cell">${formatMoney(calc.baseSalary)}</strong></div>
      <div class="slip-row"><span>Akumulasi Upah Lembur (${formatQuantity(calc.totalOvertimeHours)} jam):</span><strong class="amount-cell" style="color: var(--warning);">${formatMoney(calc.overtimeAmount)}</strong></div>
      <div class="slip-row"><span>Akumulasi Insentif (${formatQuantity(calc.totalProduction)} unit):</span><strong class="amount-cell">${formatMoney(calc.incentiveAmount)}</strong></div>
      <div class="slip-row"><span>Total Gaji Periode Ini:</span><strong class="amount-cell" style="font-size: 13px;">${formatMoney(calc.totalSalary)}</strong></div>
    </div>
    <div class="dialog-actions">
      <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
      <button type="button" class="button button-outline" data-action="download-single-employee-attendance" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}" style="margin-right: auto; display: inline-flex; align-items: center; gap: 6px;">
        ${Icons.download('icon-svg', 14)}
        <span>Unduh Absensi CSV</span>
      </button>
      ${!calc.isPaid ? `
        <button type="button" class="button button-primary" data-action="pay-monthly-salary" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}">
          ${Icons.cash('icon-svg', 14)}
          <span>Bayar Gaji Akhir Bulan</span>
        </button>
      ` : `
        <span class="status-pill status-paid">
          ${Icons.check('icon-svg', 12)}
          <span>Sudah Dibayar</span>
        </span>
      `}
    </div>
  `);
}
