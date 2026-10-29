import { state, currentMonth, localDate } from '../../store/state.js';
import { heading, statCard } from '../../components/Header.js';
import { emptyState } from '../../components/Table.js';
import { formatMoney, formatQuantity, formatDate, ATTENDANCE_LABELS } from '../../utils/formatters.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { calculateMonthlySalary } from './salaryCalc.js';

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
  const monthlySalaryRows = activeEmployees.length ? `<div class="table-wrap"><table><thead><tr>
    <th>NAMA PEKERJA</th>
    <th>KEHADIRAN BULAN INI</th>
    <th>UPAH POKOK / HARI</th>
    <th>TOTAL UPAH POKOK</th>
    <th>JAM LEMBUR</th>
    <th>TOTAL LEMBUR</th>
    <th>PRODUKSI (UNIT)</th>
    <th>TOTAL INSENTIF</th>
    <th>TOTAL GAJI BULANAN</th>
    <th>STATUS GAJI</th>
    <th class="align-right">AKSI</th>
  </tr></thead><tbody>
    ${monthlyCalcs.map(({ employee: emp, calc }) => {
      const isPaid = calc.isPaid;
      return `<tr>
        <td class="detail-cell">
          ${escapeHtml(emp.full_name)}
          <span class="sub-meta">${escapeHtml(emp.position)}</span>
        </td>
        <td>
          <strong>${calc.effectiveDays} hari kerja</strong>
          <span class="sub-meta">${calc.present} Hadir · ${calc.halfDay} ½ Hari · ${calc.permit + calc.sick + calc.absent} Absen</span>
        </td>
        <td>${formatMoney(calc.dailySalary)} / hari</td>
        <td>${formatMoney(calc.baseSalary)}</td>
        <td>
          <strong>${formatQuantity(calc.totalOvertimeHours)} jam</strong>
          <span class="sub-meta">${calc.overtimeRate ? `Tarif ${formatMoney(calc.overtimeRate)}/jam` : 'Belum diatur'}</span>
        </td>
        <td style="color: #b86e1e; font-weight: 600;">${formatMoney(calc.overtimeAmount)}</td>
        <td>${formatQuantity(calc.totalProduction)} unit</td>
        <td>${formatMoney(calc.incentiveAmount)}</td>
        <td class="amount-cell" style="font-size: 12px; font-weight: 700;">${formatMoney(calc.totalSalary)}</td>
        <td>
          <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
            ${isPaid ? 'Lunas (Dibayar)' : 'Belum dibayar'}
          </span>
          ${isPaid && calc.payout?.paid_at ? `<span class="sub-meta">${formatDate(calc.payout.paid_at)}</span>` : ''}
        </td>
        <td class="align-right">
          ${!isPaid ? `
            <button class="button button-small button-primary" data-action="pay-monthly-salary" data-id="${escapeHtml(emp.id)}" data-month="${escapeHtml(selectedMonth)}" title="Bayar gaji akhir bulan">
              Bayar gaji
            </button>
          ` : `
            <button class="button button-small button-quiet" data-action="cancel-monthly-salary" data-id="${escapeHtml(calc.payout.id)}" title="Batalkan pembayaran gaji ini">
              Batal bayar
            </button>
          `}
          <button class="icon-button" data-action="view-employee-attendance" data-id="${escapeHtml(emp.id)}" data-month="${escapeHtml(selectedMonth)}" title="Lihat rincian absensi bulan ini">📋</button>
        </td>
      </tr>`;
    }).join('')}
  </tbody></table></div>` : emptyState('Belum ada karyawan aktif', 'Tambahkan karyawan terlebih dahulu.');

  // TABEL 2: Absensi Harian Realtime (Tanggal Terpilih)
  const attendanceRows = activeEmployees.length ? `<div class="table-wrap"><table><thead><tr>
    <th>NAMA PEKERJA</th>
    <th>STATUS KEHADIRAN HARI INI</th>
    <th>LEMBUR (JAM)</th>
    <th>UPAH LEMBUR</th>
    <th>HASIL PRODUKSI</th>
    <th>ESTIMASI NILAI HARI INI</th>
    <th>CATATAN KERJA</th>
    <th class="align-right">AKSI CEPAT / UBAH</th>
  </tr></thead><tbody>
    ${activeEmployees.map((emp) => {
      const rec = dateRecords.find((r) => r.employee_id === emp.id);
      if (rec) {
        const attInfo = ATTENDANCE_LABELS[rec.attendance_status] || { label: rec.attendance_status, class: 'status-present' };
        const otHours = Number(rec.overtime_hours) || 0;
        const effectiveRate = (rec.overtime_rate !== undefined && rec.overtime_rate !== null && rec.overtime_rate !== '') ? Number(rec.overtime_rate) : (emp.overtime_rate || 0);
        const otPay = (rec.overtime_pay !== undefined && rec.overtime_pay !== null && rec.overtime_pay !== '') ? Number(rec.overtime_pay) : Math.round(otHours * effectiveRate);
        return `<tr>
          <td class="detail-cell">
            ${escapeHtml(emp.full_name)}
            <span class="sub-meta">${escapeHtml(emp.position)}</span>
          </td>
          <td><span class="status-pill ${attInfo.class}">${attInfo.label}</span></td>
          <td>${otHours > 0 ? `<span class="status-ot">⚡ ${formatQuantity(otHours)} jam</span> <span class="sub-meta">@ ${formatMoney(effectiveRate)}</span>` : '<span class="sub-meta">—</span>'}</td>
          <td style="color: #b86e1e; font-weight: 500;">${otPay > 0 ? formatMoney(otPay) : '<span class="sub-meta">—</span>'}</td>
          <td>${formatQuantity(rec.production_quantity)} unit</td>
          <td><strong>${formatMoney(rec.total_amount)}</strong></td>
          <td class="detail-cell" style="font-weight: normal; font-size: 9px; color: #88938d;">${escapeHtml(rec.notes || '—')}</td>
          <td class="align-right">
            <button class="icon-button" data-action="edit-attendance" data-id="${escapeHtml(rec.id)}" aria-label="Ubah absensi">✎</button>
            <button class="icon-button danger-icon" data-action="delete-attendance" data-id="${escapeHtml(rec.id)}" aria-label="Hapus absensi">×</button>
          </td>
        </tr>`;
      }
      return `<tr>
        <td class="detail-cell">
          ${escapeHtml(emp.full_name)}
          <span class="sub-meta">${escapeHtml(emp.position)}</span>
        </td>
        <td><span class="status-pill status-unmarked">Belum absen</span></td>
        <td><span class="sub-meta">—</span></td>
        <td><span class="sub-meta">Tarif ${formatMoney(emp.overtime_rate || 0)}/jam</span></td>
        <td><span class="sub-meta">—</span></td>
        <td><span class="sub-meta">Tarif ${formatMoney(emp.daily_salary || 0)}/hari</span></td>
        <td><span class="sub-meta">—</span></td>
        <td class="align-right">
          <div class="att-quick-bar">
            <button type="button" class="att-btn att-btn-present" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="present" title="Absen Hadir Penuh">✓ Hadir</button>
            <button type="button" class="att-btn att-btn-half" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="half_day" title="Absen Setengah Hari">½ Hari</button>
            <button type="button" class="att-btn att-btn-permit" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="permit" title="Absen Izin">Izin</button>
            <button type="button" class="att-btn att-btn-sick" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="sick" title="Absen Sakit">Sakit</button>
            <button type="button" class="att-btn att-btn-absent" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="absent" title="Absen Alpa">Alpa</button>
            <button type="button" class="icon-button" data-action="open-attendance-modal" data-id="${escapeHtml(emp.id)}" title="Input lembur, produksi & detail">✎</button>
          </div>
        </td>
      </tr>`;
    }).join('')}
  </tbody></table></div>` : emptyState('Belum ada karyawan aktif', 'Tambahkan karyawan terlebih dahulu untuk mulai mengabsen.');

  // TABEL 3: Master Data Tarif Karyawan
  const employeeRows = employees.length ? `<div class="table-wrap"><table><thead><tr>
    <th>NAMA KARYAWAN</th>
    <th>JABATAN</th>
    <th>UPAH POKOK / HARI</th>
    <th>TARIF LEMBUR / JAM</th>
    <th>INSENTIF / UNIT</th>
    <th>STATUS</th>
    <th class="align-right">AKSI</th>
  </tr></thead><tbody>
    ${employees.map((employee) => `<tr>
      <td class="detail-cell">${escapeHtml(employee.full_name)}</td>
      <td>${escapeHtml(employee.position)}</td>
      <td>${formatMoney(employee.daily_salary || 0)} / hari</td>
      <td><strong>${formatMoney(employee.overtime_rate || 0)}</strong> / jam</td>
      <td>${formatMoney(employee.incentive_per_unit || 0)} / unit</td>
      <td><span class="status-pill ${employee.is_active ? 'status-active' : 'status-inactive'}">${employee.is_active ? 'Aktif' : 'Tidak aktif'}</span></td>
      <td class="align-right"><button class="icon-button" data-action="edit-employee" data-id="${escapeHtml(employee.id)}" aria-label="Ubah ${escapeHtml(employee.full_name)}">✎</button></td>
    </tr>`).join('')}
  </tbody></table></div>` : emptyState('Belum ada karyawan', 'Tambahkan karyawan untuk mulai mengatur upah dan insentif.');

  return `${heading('MANAJEMEN KARYAWAN', 'Absensi & gaji karyawan', 'Absensi dicatat harian secara realtime, total gaji dihitung di akhir bulan berdasarkan akumulasi kehadiran.', `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      <button class="button button-outline" data-action="add-employee">＋ Karyawan baru</button>
      <button class="button button-primary" data-action="open-attendance-modal"><span>＋</span> Catat absensi harian</button>
    </div>`)}
    <section class="stats-grid compact-stats">
      ${statCard('Karyawan aktif', `${activeEmployees.length} orang`, `${employees.length} pekerja terdaftar`, '◎', 'icon-blue')}
      ${statCard(`Total gaji (${selectedMonth})`, formatMoney(totalMonthSalary), `pokok, lembur & insentif`, '↗', 'icon-green')}
      ${statCard('Akumulasi lembur', `${formatQuantity(totalMonthOvertimeHours)} jam`, `Total lembur ${formatMoney(totalMonthOvertimePay)}`, '⚡', 'icon-orange')}
      ${statCard(`Kehadiran (${formatDate(selectedDate)})`, `${presentTodayCount} / ${activeEmployees.length} hadir`, `${dateRecords.length} pekerja telah diabsen`, '▦', 'icon-purple')}
    </section>

    <!-- PANEL 1: PERHITUNGAN GAJI AKHIR BULAN -->
    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Perhitungan gaji akhir bulan <span class="count-badge">${paidCount}/${activeEmployees.length} lunas</span></h2>
          <p>Dihitung dari: <strong>(Hari kerja × Upah pokok/hari) + (Jam lembur × Tarif lembur/jam) + (Hasil produksi × Insentif/unit)</strong></p>
        </div>
        <div class="payroll-controls" style="display:flex;align-items:center;gap:8px;">
          <button class="button button-small button-outline" data-action="download-payroll-report" data-month="${escapeHtml(selectedMonth)}" style="display:inline-flex;align-items:center;gap:4px;" title="Unduh rekapitulasi gaji dan absensi bulan ini ke format CSV/Excel">
            <span>📥</span> Unduh CSV
          </button>
          <div>
            <label class="month-label" for="payroll-month-picker">PERIODE BULAN</label>
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
          <h2>Absensi harian realtime <span class="count-badge">${dateRecords.length}/${activeEmployees.length}</span></h2>
          <p>Tanggal kerja: <strong>${formatDate(selectedDate)}</strong> · Kehadiran & jam lembur otomatis mengakumulasi perhitungan gaji akhir bulan</p>
        </div>
        <div class="payroll-controls">
          <label class="month-label" for="attendance-date-picker">TANGGAL KERJA</label>
          <input class="month-input" id="attendance-date-picker" type="date" value="${escapeHtml(selectedDate)}" />
          <button class="button button-outline button-small" data-action="set-date-today">Hari ini</button>
        </div>
      </div>
      ${attendanceRows}
    </section>

    <!-- PANEL 3: MASTER TARIF UPAH KARYAWAN -->
    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Master tarif upah karyawan <span class="count-badge">${employees.length}</span></h2>
          <p>Tarif upah pokok per hari kerja, tarif lembur per jam, dan insentif per unit produksi</p>
        </div>
      </div>
      ${employeeRows}
    </section>`;
}
