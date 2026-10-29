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
  const totalPendingSalary = monthlyCalcs.reduce((sum, item) => sum + (!item.calc.isPaid ? item.calc.totalSalary : 0), 0);
  const pendingCount = monthlyCalcs.filter((item) => !item.calc.isPaid).length;
  const paidCount = monthlyCalcs.filter((item) => item.calc.isPaid).length;

  // Catatan Absensi Hari Ini (selectedDate)
  const dateRecords = state.payroll.filter((r) => (r.work_date || r.period) === selectedDate);
  const presentTodayCount = dateRecords.filter((record) => record.attendance_status === 'present').length;

  // TABEL 1: Rekapitulasi Gaji Akhir Bulan
  const monthlySalaryRows = activeEmployees.length ? `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nama Pekerja</th>
            <th>Kehadiran Bulan Ini</th>
            <th>Upah Pokok / Hari</th>
            <th>Total Pokok</th>
            <th>Jam Lembur</th>
            <th>Total Lembur</th>
            <th>Produksi (Unit)</th>
            <th>Total Insentif</th>
            <th>Total Gaji Bulanan</th>
            <th>Status Gaji</th>
            <th class="align-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${monthlyCalcs.map(({ employee: emp, calc }) => {
            const isPaid = calc.isPaid;
            return `
              <tr>
                <td class="detail-cell">
                  <strong>${escapeHtml(emp.full_name)}</strong>
                  <span class="sub-meta">${escapeHtml(emp.position)}</span>
                </td>
                <td>
                  <strong>${calc.effectiveDays} hari kerja</strong>
                  <span class="sub-meta">${calc.present} Hadir · ${calc.halfDay} ½ Hari · ${calc.permit + calc.sick + calc.absent} Absen</span>
                </td>
                <td class="amount-cell">${formatMoney(calc.dailySalary)}</td>
                <td class="amount-cell">${formatMoney(calc.baseSalary)}</td>
                <td>
                  <strong>${formatQuantity(calc.totalOvertimeHours)} jam</strong>
                  <span class="sub-meta">${calc.overtimeRate ? `@ ${formatMoney(calc.overtimeRate)}/jam` : 'Belum diatur'}</span>
                </td>
                <td class="amount-cell" style="color: var(--warning); font-weight: 600;">${formatMoney(calc.overtimeAmount)}</td>
                <td>${formatQuantity(calc.totalProduction)} unit</td>
                <td class="amount-cell">${formatMoney(calc.incentiveAmount)}</td>
                <td class="amount-cell" style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${formatMoney(calc.totalSalary)}</td>
                <td>
                  <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
                    ${isPaid ? Icons.check('icon-svg', 11) : Icons.clock('icon-svg', 11)}
                    ${isPaid ? 'Lunas' : 'Belum Dibayar'}
                  </span>
                  ${isPaid && calc.payout?.paid_at ? `<span class="sub-meta">${formatDate(calc.payout.paid_at)}</span>` : ''}
                </td>
                <td class="align-right">
                  <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
                    ${!isPaid ? `
                      <button class="button button-small button-primary" data-action="pay-monthly-salary" data-id="${escapeHtml(emp.id)}" data-month="${escapeHtml(selectedMonth)}" title="Bayar gaji akhir bulan">
                        ${Icons.cash('icon-svg', 13)}
                        <span>Bayar Gaji</span>
                      </button>
                    ` : `
                      <button class="button button-small button-quiet" data-action="cancel-monthly-salary" data-id="${escapeHtml(calc.payout.id)}" title="Batalkan pembayaran gaji ini">
                        Batal
                      </button>
                    `}
                    <button class="icon-button" data-action="view-employee-attendance" data-id="${escapeHtml(emp.id)}" data-month="${escapeHtml(selectedMonth)}" title="Lihat rincian absensi bulan ini">
                      ${Icons.clipboard('icon-svg', 14)}
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : emptyState('Belum Ada Karyawan Aktif', 'Tambahkan karyawan terlebih dahulu untuk mengelola penggajian.');

  // TABEL 2: Absensi Harian Realtime (Tanggal Terpilih)
  const attendanceRows = activeEmployees.length ? `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nama Pekerja</th>
            <th>Status Kehadiran</th>
            <th>Lembur (Jam)</th>
            <th>Upah Lembur</th>
            <th>Hasil Produksi</th>
            <th>Estimasi Hari Ini</th>
            <th>Catatan Kerja</th>
            <th class="align-right">Aksi Cepat / Ubah</th>
          </tr>
        </thead>
        <tbody>
          ${activeEmployees.map((emp) => {
            const rec = dateRecords.find((r) => r.employee_id === emp.id);
            if (rec) {
              const attInfo = ATTENDANCE_LABELS[rec.attendance_status] || { label: rec.attendance_status, class: 'status-present' };
              const otHours = Number(rec.overtime_hours) || 0;
              const effectiveRate = (rec.overtime_rate !== undefined && rec.overtime_rate !== null && rec.overtime_rate !== '') ? Number(rec.overtime_rate) : (emp.overtime_rate || 0);
              const otPay = (rec.overtime_pay !== undefined && rec.overtime_pay !== null && rec.overtime_pay !== '') ? Number(rec.overtime_pay) : Math.round(otHours * effectiveRate);
              return `
                <tr>
                  <td class="detail-cell">
                    <strong>${escapeHtml(emp.full_name)}</strong>
                    <span class="sub-meta">${escapeHtml(emp.position)}</span>
                  </td>
                  <td><span class="status-pill ${attInfo.class}">${attInfo.label}</span></td>
                  <td>
                    ${otHours > 0 
                      ? `<span class="status-ot" style="display: inline-flex; align-items: center; gap: 3px;">${Icons.zap('icon-svg', 12)} ${formatQuantity(otHours)} jam</span> <span class="sub-meta">@ ${formatMoney(effectiveRate)}</span>` 
                      : '<span class="sub-meta">—</span>'
                    }
                  </td>
                  <td class="amount-cell" style="color: var(--warning); font-weight: 600;">${otPay > 0 ? formatMoney(otPay) : '<span class="sub-meta">—</span>'}</td>
                  <td>${formatQuantity(rec.production_quantity)} unit</td>
                  <td class="amount-cell"><strong>${formatMoney(rec.total_amount)}</strong></td>
                  <td class="detail-cell" style="font-size: 11px; color: var(--text-muted);">${escapeHtml(rec.notes || '—')}</td>
                  <td class="align-right">
                    <button class="icon-button" data-action="edit-attendance" data-id="${escapeHtml(rec.id)}" aria-label="Ubah absensi" title="Ubah absensi">
                      ${Icons.edit('icon-svg', 14)}
                    </button>
                    <button class="icon-button danger-icon" data-action="delete-attendance" data-id="${escapeHtml(rec.id)}" aria-label="Hapus absensi" title="Hapus absensi">
                      ${Icons.trash('icon-svg', 14)}
                    </button>
                  </td>
                </tr>
              `;
            }
            return `
              <tr>
                <td class="detail-cell">
                  <strong>${escapeHtml(emp.full_name)}</strong>
                  <span class="sub-meta">${escapeHtml(emp.position)}</span>
                </td>
                <td><span class="status-pill status-unmarked">Belum absen</span></td>
                <td><span class="sub-meta">—</span></td>
                <td><span class="sub-meta">@ ${formatMoney(emp.overtime_rate || 0)}/jam</span></td>
                <td><span class="sub-meta">—</span></td>
                <td class="amount-cell"><span class="sub-meta">@ ${formatMoney(emp.daily_salary || 0)}/hr</span></td>
                <td><span class="sub-meta">—</span></td>
                <td class="align-right">
                  <div class="att-quick-bar">
                    <button type="button" class="att-btn att-btn-present" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="present" title="Absen Hadir Penuh">Hadir</button>
                    <button type="button" class="att-btn att-btn-half" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="half_day" title="Absen Setengah Hari">½ Hari</button>
                    <button type="button" class="att-btn att-btn-permit" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="permit" title="Absen Izin">Izin</button>
                    <button type="button" class="att-btn att-btn-sick" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="sick" title="Absen Sakit">Sakit</button>
                    <button type="button" class="att-btn att-btn-absent" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="absent" title="Absen Alpa">Alpa</button>
                    <button type="button" class="icon-button" data-action="open-attendance-modal" data-id="${escapeHtml(emp.id)}" title="Input lembur, produksi & catatan">
                      ${Icons.edit('icon-svg', 13)}
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : emptyState('Belum Ada Karyawan', 'Tambahkan data karyawan terlebih dahulu.');

  // TABEL 3: Master Data Tarif Karyawan
  const employeeRows = employees.length ? `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nama Karyawan</th>
            <th>Posisi / Bagian</th>
            <th>Upah Pokok / Hari</th>
            <th>Tarif Lembur / Jam</th>
            <th>Insentif / Unit</th>
            <th>Status</th>
            <th class="align-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${employees.map((employee) => `
            <tr>
              <td class="detail-cell"><strong>${escapeHtml(employee.full_name)}</strong></td>
              <td>${escapeHtml(employee.position)}</td>
              <td class="amount-cell">${formatMoney(employee.daily_salary || 0)}</td>
              <td class="amount-cell"><strong>${formatMoney(employee.overtime_rate || 0)}</strong></td>
              <td class="amount-cell">${formatMoney(employee.incentive_per_unit || 0)}</td>
              <td><span class="status-pill ${employee.is_active ? 'status-active' : 'status-inactive'}">${employee.is_active ? 'Aktif' : 'Non-aktif'}</span></td>
              <td class="align-right">
                <button class="icon-button" data-action="edit-employee" data-id="${escapeHtml(employee.id)}" aria-label="Ubah ${escapeHtml(employee.full_name)}" title="Ubah data pekerja">
                  ${Icons.edit('icon-svg', 14)}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : emptyState('Belum Ada Karyawan', 'Tambahkan data karyawan untuk mulai mengatur upah dan insentif.');

  const actions = `
    <button class="button button-outline" data-action="add-employee">
      ${Icons.plus('icon-svg', 15)}
      <span>Karyawan Baru</span>
    </button>
    <button class="button button-primary" data-action="open-attendance-modal">
      ${Icons.payroll('icon-svg', 15)}
      <span>Catat Absensi</span>
    </button>
  `;

  return `
    ${heading('MANAJEMEN SDM PABRIK', 'Absensi & Penggajian Karyawan', 'Pencatatan kehadiran harian secara real-time dan perhitungan akumulasi gaji akhir bulan.', actions)}

    <section class="stats-grid">
      ${statCard('Karyawan Aktif', `${activeEmployees.length} Orang`, `${employees.length} pekerja terdaftar`, Icons.users('icon-svg', 18), 'icon-blue')}
      ${statCard(`Total Gaji (${selectedMonth})`, formatMoney(totalMonthSalary), `Pokok, lembur & insentif`, Icons.cash('icon-svg', 18), 'icon-green')}
      ${statCard('Akumulasi Lembur', `${formatQuantity(totalMonthOvertimeHours)} Jam`, `Total lembur ${formatMoney(totalMonthOvertimePay)}`, Icons.zap('icon-svg', 18), 'icon-orange')}
      ${statCard(`Kehadiran (${formatDate(selectedDate)})`, `${presentTodayCount} / ${activeEmployees.length} Hadir`, `${dateRecords.length} pekerja diabsen`, Icons.calendar('icon-svg', 18), 'icon-purple')}
    </section>

    <!-- PANEL 1: REKAPITULASI GAJI BULANAN -->
    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Rekapitulasi Gaji Akhir Bulan <span class="count-badge">${paidCount}/${activeEmployees.length} Lunas</span></h2>
          <p>Rumus: (Hari Kerja × Upah Pokok) + (Jam Lembur × Tarif Lembur) + (Unit Produksi × Insentif)</p>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="button button-small button-outline" data-action="download-payroll-report" data-month="${escapeHtml(selectedMonth)}" title="Unduh rekapitulasi gaji CSV">
            ${Icons.download('icon-svg', 13)}
            <span>Unduh CSV</span>
          </button>
          <div style="display: flex; align-items: center; gap: 6px;">
            <label class="month-label" for="payroll-month-picker">Bulan</label>
            <input class="month-input" id="payroll-month-picker" type="month" value="${escapeHtml(selectedMonth)}" />
          </div>
        </div>
      </div>
      ${monthlySalaryRows}
    </section>

    <!-- PANEL 2: ABSENSI HARIAN REALTIME -->
    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Absensi Harian Shift <span class="count-badge">${dateRecords.length}/${activeEmployees.length}</span></h2>
          <p>Tanggal kerja: <strong>${formatDate(selectedDate)}</strong> · Kehadiran & jam lembur langsung tersinkron ke gaji bulanan</p>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <label class="month-label" for="attendance-date-picker">Tanggal</label>
          <input class="month-input" id="attendance-date-picker" type="date" value="${escapeHtml(selectedDate)}" />
          <button class="button button-outline button-small" data-action="set-date-today">Hari Ini</button>
        </div>
      </div>
      ${attendanceRows}
    </section>

    <!-- PANEL 3: MASTER DATA TARIF UPAH -->
    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Master Tarif & Jabatan <span class="count-badge">${employees.length}</span></h2>
          <p>Tarif upah pokok per hari, lembur per jam, dan insentif hasil produksi per pekerja</p>
        </div>
      </div>
      ${employeeRows}
    </section>
  `;
}
