import { state, currentMonth, localDate } from '../../store/state.js';
import { heading, statCard } from '../../components/Header.js';
import { emptyState } from '../../components/Table.js';
import { formatMoney, formatQuantity, formatDate, ATTENDANCE_LABELS } from '../../utils/formatters.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { calculateMonthlySalary } from './salaryCalc.js';
import { Icons } from '../../components/Icons.js';

export function renderPayroll() {
  const selectedMonth = state.selectedPayrollMonth || currentMonth;
  const selectedDate = state.selectedPayrollDate || localDate;
  const employees = [...state.employees].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const activeEmployees = employees.filter((employee) => employee.is_active);

  // Perhitungan Bulanan Seluruh Karyawan Aktif
  const monthlyCalcs = activeEmployees.map((emp) => ({
    employee: emp,
    calc: calculateMonthlySalary(emp, selectedMonth),
  }));

  const totalMonthSalary = monthlyCalcs.reduce((sum, item) => sum + item.calc.totalSalary, 0);
  const totalMonthOvertimeHours = monthlyCalcs.reduce((sum, item) => sum + item.calc.totalOvertimeHours, 0);
  const totalMonthOvertimePay = monthlyCalcs.reduce((sum, item) => sum + item.calc.overtimeAmount, 0);
  const pendingCount = monthlyCalcs.filter((item) => !item.calc.isPaid).length;
  const paidCount = monthlyCalcs.filter((item) => item.calc.isPaid).length;

  // Catatan Absensi Hari Ini
  const dateRecords = state.payroll.filter((r) => (r.work_date || r.period) === selectedDate);
  const presentTodayCount = dateRecords.filter((record) => record.attendance_status === 'present').length;

  return `
    ${heading('', 'Penggajian & Absensi', 'Sistem absensi harian dan rekap upah bulanan pekerja pabrik')}

    <div class="stats-grid">
      ${statCard('Karyawan Aktif', `${activeEmployees.length} Pekerja`, `${employees.length} terdaftar`, Icons.users('icon-svg', 28), 'blue')}
      ${statCard(`Total Gaji (${selectedMonth})`, formatMoney(totalMonthSalary), `Pokok + lembur + bonus`, Icons.cash('icon-svg', 28), 'green')}
      ${statCard('Akumulasi Lembur', `${formatQuantity(totalMonthOvertimeHours)} Jam`, `Total upah ${formatMoney(totalMonthOvertimePay)}`, Icons.zap('icon-svg', 28), 'yellow')}
      ${statCard(`Kehadiran (${formatDate(selectedDate)})`, `${presentTodayCount} / ${activeEmployees.length} Hadir`, `${dateRecords.length} diabsen`, Icons.calendar('icon-svg', 28), 'purple')}
    </div>

    <!-- BOX 1: REKAPITULASI GAJI BULANAN -->
    <div class="box box-primary">
      <div class="box-header">
        <h3 class="box-title">${Icons.payroll('icon-svg', 18)} Rekapitulasi Gaji Karyawan (${selectedMonth})</h3>
        <div class="box-tools">
          <label style="font-size:12px; margin-right:4px;">Periode:</label>
          <input type="month" id="payroll-month-picker" value="${escapeHtml(selectedMonth)}" style="height:30px; font-size:12px; padding:2px 8px; border:1px solid #ccc; border-radius:3px;" />
          <button type="button" class="btn btn-success btn-sm" data-action="download-payroll-report" data-month="${escapeHtml(selectedMonth)}">
            ${Icons.download('icon-svg', 13)} Unduh Excel/CSV
          </button>
        </div>
      </div>
      <div class="box-body">
        ${activeEmployees.length ? `
          <div class="table-responsive">
            <table class="table table-bordered table-hover table-striped">
              <thead>
                <tr>
                  <th style="width: 45px;" class="align-center">NO</th>
                  <th>NAMA PEKERJA</th>
                  <th>KEHADIRAN BULAN INI</th>
                  <th class="align-right">UPAH POKOK</th>
                  <th class="align-right">TOTAL POKOK</th>
                  <th>JAM LEMBUR</th>
                  <th class="align-right">TOTAL LEMBUR</th>
                  <th class="align-right">TOTAL GAJI</th>
                  <th class="align-center">STATUS</th>
                  <th style="width: 140px;" class="align-center">OPSI / PEMBAYARAN</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyCalcs.map(({ employee: emp, calc }, idx) => {
                  const isPaid = calc.isPaid;
                  return `
                    <tr>
                      <td class="align-center">${idx + 1}</td>
                      <td><strong>${escapeHtml(emp.full_name)}</strong><br /><small style="color:#777;">${escapeHtml(emp.position)}</small></td>
                      <td>${calc.effectiveDays} hari (${calc.present} Hadir · ${calc.permit + calc.sick + calc.absent} Absen)</td>
                      <td class="align-right amount-cell">${formatMoney(calc.dailySalary)}</td>
                      <td class="align-right amount-cell">${formatMoney(calc.baseSalary)}</td>
                      <td>${formatQuantity(calc.totalOvertimeHours)} jam</td>
                      <td class="align-right amount-cell" style="color: #f39c12; font-weight: 600;">${formatMoney(calc.overtimeAmount)}</td>
                      <td class="align-right amount-cell" style="font-weight: 700; color: #333;">${formatMoney(calc.totalSalary)}</td>
                      <td class="align-center">
                        <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
                          ${isPaid ? 'Lunas' : 'Belum Bayar'}
                        </span>
                      </td>
                      <td class="align-center">
                        ${!isPaid ? `
                          <button class="btn btn-success btn-xs" data-action="pay-monthly-salary" data-id="${escapeHtml(emp.id)}" data-month="${escapeHtml(selectedMonth)}" title="Bayar gaji">
                            ${Icons.cash('icon-svg', 11)} Bayar
                          </button>
                        ` : `
                          <button class="btn btn-default btn-xs" data-action="cancel-monthly-salary" data-id="${escapeHtml(calc.payout.id)}" title="Batalkan">
                            Batal
                          </button>
                        `}
                        <button class="btn btn-info btn-xs" data-action="view-employee-attendance" data-id="${escapeHtml(emp.id)}" data-month="${escapeHtml(selectedMonth)}" title="Rincian">
                          ${Icons.clipboard('icon-svg', 11)} Slip
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : emptyState('Belum ada karyawan aktif', 'Tambahkan karyawan terlebih dahulu.')}
      </div>
      <div class="box-footer">
        <span>Status Pembayaran: <strong>${paidCount} Lunas</strong> · <strong>${pendingCount} Belum Dibayar</strong></span>
      </div>
    </div>

    <!-- BOX 2: ABSENSI HARIAN SHIFT -->
    <div class="box box-warning">
      <div class="box-header">
        <h3 class="box-title">${Icons.calendar('icon-svg', 18)} Absensi Shift Harian (${formatDate(selectedDate)})</h3>
        <div class="box-tools">
          <label style="font-size:12px; margin-right:4px;">Tanggal:</label>
          <input type="date" id="attendance-date-picker" value="${escapeHtml(selectedDate)}" style="height:30px; font-size:12px; padding:2px 8px; border:1px solid #ccc; border-radius:3px;" />
          <button type="button" class="btn btn-default btn-sm" data-action="set-date-today">Hari Ini</button>
          <button type="button" class="btn btn-warning btn-sm" data-action="open-attendance-modal">
            ${Icons.plus('icon-svg', 13)} Form Absensi
          </button>
        </div>
      </div>
      <div class="box-body">
        ${activeEmployees.length ? `
          <div class="table-responsive">
            <table class="table table-bordered table-hover table-striped">
              <thead>
                <tr>
                  <th style="width: 45px;" class="align-center">NO</th>
                  <th>NAMA PEKERJA</th>
                  <th>STATUS ABSEN</th>
                  <th>LEMBUR (JAM)</th>
                  <th class="align-right">UPAH LEMBUR</th>
                  <th>PRODUKSI</th>
                  <th class="align-right">ESTIMASI GAJI</th>
                  <th style="width: 110px;" class="align-center">OPSI</th>
                </tr>
              </thead>
              <tbody>
                ${activeEmployees.map((emp, idx) => {
                  const rec = dateRecords.find((r) => r.employee_id === emp.id);
                  if (rec) {
                    const attInfo = ATTENDANCE_LABELS[rec.attendance_status] || { label: rec.attendance_status, class: 'status-present' };
                    const otHours = Number(rec.overtime_hours) || 0;
                    const effectiveRate = (rec.overtime_rate !== undefined && rec.overtime_rate !== null && rec.overtime_rate !== '') ? Number(rec.overtime_rate) : (emp.overtime_rate || 0);
                    const otPay = (rec.overtime_pay !== undefined && rec.overtime_pay !== null && rec.overtime_pay !== '') ? Number(rec.overtime_pay) : Math.round(otHours * effectiveRate);
                    return `
                      <tr>
                        <td class="align-center">${idx + 1}</td>
                        <td><strong>${escapeHtml(emp.full_name)}</strong></td>
                        <td><span class="status-pill status-paid">${attInfo.label}</span></td>
                        <td>${otHours > 0 ? `${formatQuantity(otHours)} jam` : '—'}</td>
                        <td class="align-right amount-cell">${otPay > 0 ? formatMoney(otPay) : '—'}</td>
                        <td>${formatQuantity(rec.production_quantity)} unit</td>
                        <td class="align-right amount-cell"><strong>${formatMoney(rec.total_amount)}</strong></td>
                        <td class="align-center">
                          <div class="btn-group-opsi">
                            <button type="button" class="btn-opsi-edit" data-action="edit-attendance" data-id="${escapeHtml(rec.id)}" title="Ubah absensi">
                              ${Icons.wrench('icon-svg', 13)}
                            </button>
                            <button type="button" class="btn-opsi-delete" data-action="delete-attendance" data-id="${escapeHtml(rec.id)}" title="Hapus absensi">
                              ${Icons.trash('icon-svg', 13)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }
                  return `
                    <tr>
                      <td class="align-center">${idx + 1}</td>
                      <td><strong>${escapeHtml(emp.full_name)}</strong></td>
                      <td><span class="status-pill status-danger">Belum Hadir</span></td>
                      <td>—</td>
                      <td class="align-right amount-cell">—</td>
                      <td>—</td>
                      <td class="align-right amount-cell">—</td>
                      <td class="align-center">
                        <button type="button" class="btn btn-info btn-xs" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="present">
                          Hadir
                        </button>
                        <button type="button" class="btn btn-default btn-xs" data-action="open-attendance-modal" data-id="${escapeHtml(emp.id)}">
                          Detail
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : emptyState('Belum ada karyawan aktif', 'Tambahkan karyawan terlebih dahulu.')}
      </div>
    </div>

    <!-- BOX 3: MASTER DATA PEKERJA -->
    <div class="box box-info">
      <div class="box-header">
        <h3 class="box-title">${Icons.users('icon-svg', 18)} Master Karyawan & Tarif Upah</h3>
        <div class="box-tools">
          <button type="button" class="btn btn-info btn-sm" data-action="add-employee">
            ${Icons.plus('icon-svg', 13)} Tambah Karyawan Baru
          </button>
        </div>
      </div>
      <div class="box-body">
        ${employees.length ? `
          <div class="table-responsive">
            <table class="table table-bordered table-hover table-striped">
              <thead>
                <tr>
                  <th style="width: 45px;" class="align-center">NO</th>
                  <th>NAMA KARYAWAN</th>
                  <th>POSISI / BAGIAN</th>
                  <th class="align-right">UPAH HARIAN</th>
                  <th class="align-right">TARIF LEMBUR / JAM</th>
                  <th class="align-right">INSENTIF / UNIT</th>
                  <th class="align-center">STATUS</th>
                  <th style="width: 60px;" class="align-center">OPSI</th>
                </tr>
              </thead>
              <tbody>
                ${employees.map((emp, idx) => `
                  <tr>
                    <td class="align-center">${idx + 1}</td>
                    <td><strong>${escapeHtml(emp.full_name)}</strong></td>
                    <td>${escapeHtml(emp.position)}</td>
                    <td class="align-right amount-cell">${formatMoney(emp.daily_salary || 0)}</td>
                    <td class="align-right amount-cell"><strong>${formatMoney(emp.overtime_rate || 0)}</strong></td>
                    <td class="align-right amount-cell">${formatMoney(emp.incentive_per_unit || 0)}</td>
                    <td class="align-center">
                      <span class="status-pill ${emp.is_active ? 'status-paid' : 'status-danger'}">
                        ${emp.is_active ? 'AKTIF' : 'NON-AKTIF'}
                      </span>
                    </td>
                    <td class="align-center">
                      <button type="button" class="btn-opsi-edit" data-action="edit-employee" data-id="${escapeHtml(emp.id)}" title="Ubah pekerja">
                        ${Icons.wrench('icon-svg', 13)}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : emptyState('Belum ada karyawan', 'Tambahkan karyawan baru untuk mulai.')}
      </div>
    </div>
  `;
}
