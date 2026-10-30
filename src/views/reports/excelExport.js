import * as XLSX from 'xlsx';
import { db } from '../../api/db.js';
import { state, currentMonth, localDate, cashBalance, stockFor, refreshData } from '../../store/state.js';
import { openDialog, closeDialog } from '../../components/Dialog.js';
import { notify, showError } from '../../components/Toast.js';
import { runMutation } from '../../utils/mutation.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { formatMoney, formatQuantity, formatDate, monthRecords, monthEnd, ATTENDANCE_LABELS } from '../../utils/formatters.js';
import { movementTable, emptyState } from '../../components/Table.js';
import { calculateMonthlySalary } from '../payroll/salaryCalc.js';
import { payMonthlySalaryModal } from '../payroll/AttendanceModal.js';
import { Icons } from '../../components/Icons.js';

export function csvCell(value) {
  let cell = String(value ?? '');
  if (/^\s*[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}

export function buildReceiptRawText({
  shopName = 'JAYA WIJAYA',
  shopSub = 'PRODUKSI • DISTRIBUSI • GROSIR',
  title = 'NOTA PENJUALAN',
  receiptNumber = '',
  date = '',
  buyer = '',
  supplier = '',
  team = '',
  paymentStatus = 'Lunas',
  itemName = 'Produk',
  qtyText = '',
  priceText = '',
  totalAmount = 0,
  paidAmount = 0,
  remainingAmount = 0,
  isDP = false,
  extraNotes = '',
}) {
  const W = 32;
  const center = (str) => {
    const s = String(str || '').slice(0, W);
    const pad = Math.max(0, Math.floor((W - s.length) / 2));
    return ' '.repeat(pad) + s;
  };
  const row = (left, right) => {
    const l = String(left || '');
    const r = String(right || '');
    const spaces = Math.max(1, W - l.length - r.length);
    return l + ' '.repeat(spaces) + r;
  };
  const divDouble = '='.repeat(W);
  const divDash = '-'.repeat(W);

  const lines = [
    divDouble,
    center(shopName),
    center(shopSub),
    center(title),
    divDouble,
    row('No. Nota :', '#' + receiptNumber),
    row('Tanggal  :', date),
  ];

  if (buyer) {
    lines.push(divDash);
    lines.push('PEMBELI / PELANGGAN:');
    lines.push(buyer.toUpperCase());
    lines.push(row('Status   :', paymentStatus));
  } else if (supplier) {
    lines.push(divDash);
    lines.push('SUPPLIER / TEMPAT BELI:');
    lines.push(supplier.toUpperCase());
    lines.push(row('Status   :', paymentStatus));
  } else if (team) {
    lines.push(divDash);
    lines.push('TIM / SHIFT PRODUKSI:');
    lines.push(team.toUpperCase());
  } else {
    lines.push(row('Status   :', paymentStatus));
  }

  lines.push(divDash);
  lines.push('RINCIAN:');
  lines.push(itemName);
  lines.push(row(qtyText + (priceText ? ' @ ' + priceText : ''), formatMoney(totalAmount)));
  lines.push(divDash);

  lines.push(row('Total Belanja :', formatMoney(totalAmount)));
  if (isDP) {
    lines.push(row('Uang Muka (DP):', formatMoney(paidAmount)));
    lines.push(row('Sisa Tagihan  :', formatMoney(remainingAmount)));
  } else {
    lines.push(row('Total Bayar   :', formatMoney(paidAmount)));
  }

  if (extraNotes) {
    lines.push('Ket: ' + extraNotes);
  }

  lines.push(divDouble);
  lines.push(center('*** TERIMA KASIH ***'));
  lines.push(center('Simpan struk ini sebagai'));
  lines.push(center('bukti transaksi sah'));
  lines.push(divDouble);
  lines.push('\n\n');

  return lines.join('\n');
}

export function printThermalReceipt() {
  const paper = document.querySelector('#receipt-paper');
  if (!paper) {
    window.print();
    return;
  }

  let printFrame = document.querySelector('#receipt-print-iframe');
  if (printFrame) {
    printFrame.remove();
  }

  printFrame = document.createElement('iframe');
  printFrame.id = 'receipt-print-iframe';
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const doc = printFrame.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Cetak Nota Transaksi</title>
  <style>
    @page { size: 58mm auto; margin: 0; }
    @media print {
      html, body { width: 58mm; margin: 0; padding: 0; background: #fff; color: #000; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 58mm; max-width: 58mm; margin: 0 auto; padding: 2mm 1mm 8mm 1mm;
      font-family: 'Consolas', 'Courier New', Courier, monospace; font-size: 11px;
      line-height: 1.25; color: #000; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .receipt-header { text-align: center; margin-bottom: 6px; }
    .receipt-shop-name { font-size: 13.5px; font-weight: 900; letter-spacing: 0.5px; }
    .receipt-shop-sub { font-size: 8.5px; margin-top: 1px; }
    .receipt-title { font-size: 10px; font-weight: 700; margin-top: 3px; }
    .receipt-divider-double { border-top: 2px solid #000; margin: 5px 0; }
    .receipt-divider { border-top: 1px dashed #000; margin: 5px 0; }
    .receipt-divider-dash { border-top: 1px dashed #000; margin: 3px 0; }
    .receipt-row { display: flex; justify-content: space-between; font-size: 9.5px; margin: 2px 0; }
    .receipt-party-box { border: 1px dashed #000; padding: 4px 6px; margin: 5px 0; text-align: left; }
    .receipt-party-label { font-size: 8px; font-weight: 700; }
    .receipt-party-name { font-size: 12.5px; font-weight: 900; margin-top: 1px; }
    .receipt-party-badge { display: inline-block; font-size: 8px; font-weight: 700; border: 1px solid #000; padding: 1px 4px; margin-top: 2px; }
    .receipt-items { margin: 5px 0; }
    .receipt-item-header { display: flex; justify-content: space-between; font-size: 8.5px; font-weight: 700; }
    .receipt-item-line { margin: 3px 0; }
    .receipt-item-name { font-weight: 700; font-size: 10.5px; }
    .receipt-item-sub { display: flex; justify-content: space-between; font-size: 9.5px; margin-top: 1px; }
    .receipt-summary { margin: 5px 0; }
    .receipt-row-total { font-size: 11px; font-weight: 900; margin-top: 4px; padding-top: 3px; border-top: 1px solid #000; }
    .receipt-grand-total { font-size: 12px; font-weight: 900; }
    .receipt-footer { text-align: center; margin-top: 8px; font-size: 8.5px; }
    .receipt-thankyou { font-weight: 700; font-size: 9.5px; }
    .receipt-extra-notes { font-size: 8.5px; font-style: italic; margin-top: 4px; }
  </style>
</head>
<body>
  ${paper.innerHTML}
</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      window.print();
    }
  }, 250);
}

export function copyReceiptText() {
  const paper = document.querySelector('#receipt-paper');
  if (!paper) return;
  const rawText = paper.dataset.rawText || '';
  if (!rawText) return;

  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      notify('Teks nota berhasil disalin! Siap dicetak ke printer bluetooth atau dikirim ke WhatsApp pelanggan.');
    } catch (e) {
      showError('Gagal menyalin teks struk.');
    }
    ta.remove();
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(rawText).then(() => {
      notify('Teks nota berhasil disalin! Siap dicetak ke printer bluetooth atau dikirim ke WhatsApp pelanggan.');
    }).catch(() => {
      fallbackCopy(rawText);
    });
  } else {
    fallbackCopy(rawText);
  }
}

export function downloadReport(month) {
  const selectedMonth = (typeof month === 'string' && month) ? month : (state.selectedReportMonth || currentMonth);
  const inventory = monthRecords(state.inventory, selectedMonth);
  const cash = monthRecords(state.cash, selectedMonth);
  const activeEmployees = state.employees.filter((emp) => emp.is_active);
  const monthlyCalcs = activeEmployees.map((emp) => calculateMonthlySalary(emp, selectedMonth));

  const totalIn = cash.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOut = cash.filter((r) => r.direction === 'out').reduce((sum, r) => sum + Number(r.amount), 0);
  const cogsCash = cash.filter((r) => r.direction === 'out' && ((r.category || '').toLowerCase().includes('bahan') || (r.category || '').toLowerCase().includes('material') || (r.category || '').toLowerCase().includes('belanja'))).reduce((sum, r) => sum + Number(r.amount), 0);
  const inventoryHpp = inventory.filter((inv) => inv.direction === 'out').reduce((sum, inv) => {
    const prod = state.products.find((p) => p.id === inv.product_id);
    return sum + (Number(inv.quantity) * (Number(prod?.purchase_price) || 0));
  }, 0);
  const totalCogs = cogsCash > 0 ? cogsCash : inventoryHpp;
  const grossProfit = totalIn - totalCogs;
  const grossMargin = totalIn > 0 ? ((grossProfit / totalIn) * 100).toFixed(1) : '0';

  const totalPayroll = monthlyCalcs.reduce((sum, c) => sum + c.totalSalary, 0);
  const operationalCash = cash.filter((r) => r.direction === 'out' && !(r.category || '').toLowerCase().includes('bahan') && !(r.category || '').toLowerCase().includes('material') && !(r.category || '').toLowerCase().includes('belanja')).reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOperatingExpense = operationalCash + totalPayroll;
  const netProfit = grossProfit - totalOperatingExpense;
  const netMargin = totalIn > 0 ? ((netProfit / totalIn) * 100).toFixed(1) : '0';

  if (typeof XLSX === 'undefined') {
    showError('Library XLSX belum dimuat. Mengunduh format CSV dasar.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan Laba Rugi
  const summaryRows = [
    ['LAPORAN KEUANGAN & OPERASIONAL BULANAN JAYA WIJAYA'],
    ['Perusahaan', 'JAYA WIJAYA'],
    ['Bidang Usaha', 'PRODUKSI • DISTRIBUSI • GROSIR'],
    ['Slogan', 'Produksi Berkualitas, Harga Bersahabat, Mitra Terpercaya.'],
    ['Periode Bulan', selectedMonth],
    ['Tanggal Ekspor', formatDate(localDate)],
    [],
    ['KOMPONEN KEUANGAN', 'NOMINAL (IDR)', 'PERSENTASE / KETERANGAN'],
    ['Pendapatan Penjualan (Omzet)', totalIn, '100%'],
    ['Beban Pokok Penjualan (HPP / Bahan Baku)', totalCogs, totalIn > 0 ? `${((totalCogs/totalIn)*100).toFixed(1)}%` : '0%'],
    ['Laba Kotor (Gross Profit)', grossProfit, `${grossMargin}% (Margin Kotor)`],
    ['Beban Gaji & Upah Karyawan', totalPayroll, totalIn > 0 ? `${((totalPayroll/totalIn)*100).toFixed(1)}%` : '0%'],
    ['Beban Operasional Lainnya', operationalCash, totalIn > 0 ? `${((operationalCash/totalIn)*100).toFixed(1)}%` : '0%'],
    ['Total Beban Operasional', totalOperatingExpense, totalIn > 0 ? `${((totalOperatingExpense/totalIn)*100).toFixed(1)}%` : '0%'],
    ['Laba Bersih Operasional (Net Profit)', netProfit, `${netMargin}% (Margin Bersih)`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laba Rugi');

  // Sheet 2: Kas Keuangan
  const cashRows = [
    ['Tanggal', 'Arah Kas', 'Kategori', 'Nominal (Rp)', 'Keterangan Transaksi']
  ];
  for (const c of cash) {
    cashRows.push([
      c.occurred_on,
      c.direction === 'in' ? 'Uang Masuk (+)' : 'Uang Keluar (-)',
      c.category,
      Number(c.amount) || 0,
      c.description || ''
    ]);
  }
  const wsCash = XLSX.utils.aoa_to_sheet(cashRows);
  XLSX.utils.book_append_sheet(wb, wsCash, 'Arus Kas Keuangan');

  // Sheet 3: Persediaan & Stok
  const invRows = [
    ['Tanggal', 'Nama Produk', 'Arah Barang', 'Jumlah / Qty', 'Satuan', 'Nilai Est (Rp)', 'Catatan / Pihak Terkait']
  ];
  for (const inv of inventory) {
    const prod = inv.products || state.products.find((p) => p.id === inv.product_id);
    const isIn = inv.direction === 'in';
    const unitPrice = isIn ? (Number(prod?.purchase_price) || 0) : (Number(prod?.selling_price) || 0);
    const estVal = Math.round(Number(inv.quantity || 0) * unitPrice);
    invRows.push([
      inv.occurred_on,
      prod?.name || 'Produk',
      isIn ? 'Masuk (+)' : 'Keluar (-)',
      Number(inv.quantity) || 0,
      prod?.unit || 'unit',
      estVal,
      inv.notes || ''
    ]);
  }
  const wsInv = XLSX.utils.aoa_to_sheet(invRows);
  XLSX.utils.book_append_sheet(wb, wsInv, 'Persediaan Barang');

  // Sheet 4: Gaji & Upah
  if (state.isAdmin && monthlyCalcs.length) {
    const payRows = [
      ['Nama Karyawan', 'Jabatan', 'Hari Kerja', 'Upah Pokok (Rp)', 'Jam Lembur', 'Upah Lembur (Rp)', 'Unit Produksi', 'Insentif (Rp)', 'Total Gaji (Rp)', 'Status Pembayaran']
    ];
    for (const c of monthlyCalcs) {
      payRows.push([
        c.employee.full_name,
        c.employee.position || 'Produksi',
        c.effectiveDays,
        c.baseSalary,
        c.totalOvertimeHours,
        c.overtimeAmount,
        c.totalProduction,
        c.incentiveAmount,
        c.totalSalary,
        c.isPaid ? 'Lunas' : 'Belum Dibayar'
      ]);
    }
    const wsPay = XLSX.utils.aoa_to_sheet(payRows);
    XLSX.utils.book_append_sheet(wb, wsPay, 'Gaji & Upah Karyawan');
  }

  XLSX.writeFile(wb, `Laporan-Jaya-Wijaya-${selectedMonth}.xlsx`);
  notify(`Laporan bulanan ${selectedMonth} berhasil diunduh (Excel).`);
}

export function downloadPayrollReport(month) {
  const selectedMonth = (typeof month === 'string' && month) ? month : (state.selectedPayrollMonth || currentMonth);
  const activeEmployees = state.employees.filter((emp) => emp.is_active);
  const monthlyCalcs = activeEmployees.map((emp) => ({
    employee: emp,
    calc: calculateMonthlySalary(emp, selectedMonth),
  }));

  const totalMonthSalary = monthlyCalcs.reduce((sum, item) => sum + item.calc.totalSalary, 0);
  const totalBaseSalary = monthlyCalcs.reduce((sum, item) => sum + item.calc.baseSalary, 0);
  const totalOvertimeHours = monthlyCalcs.reduce((sum, item) => sum + item.calc.totalOvertimeHours, 0);
  const totalOvertimePay = monthlyCalcs.reduce((sum, item) => sum + item.calc.overtimeAmount, 0);
  const totalProduction = monthlyCalcs.reduce((sum, item) => sum + item.calc.totalProduction, 0);
  const totalIncentive = monthlyCalcs.reduce((sum, item) => sum + item.calc.incentiveAmount, 0);
  const paidCount = monthlyCalcs.filter((item) => item.calc.isPaid).length;
  const pendingCount = monthlyCalcs.filter((item) => !item.calc.isPaid).length;

  const attendanceRecords = monthRecords(state.payroll, selectedMonth, 'work_date')
    .sort((a, b) => String(a?.work_date || a?.period || '').localeCompare(String(b?.work_date || b?.period || '')));

  const rows = [
    ['REKAPITULASI GAJI & ABSENSI KARYAWAN BULANAN'],
    ['Nama Perusahaan', 'Jaya Wijaya'],
    ['Bidang Usaha', 'PRODUKSI • DISTRIBUSI • GROSIR'],
    ['Slogan', 'Produksi Berkualitas, Harga Bersahabat, Mitra Terpercaya.'],
    ['Periode Bulan', selectedMonth],
    ['Tanggal Cetak / Unduh', formatDate(localDate)],
    ['Total Karyawan Aktif', `${activeEmployees.length} orang`],
    ['Total Pengeluaran Gaji Bulan Ini', totalMonthSalary],
    ['Status Pembayaran Gaji', `${paidCount} Lunas, ${pendingCount} Belum dibayar`],
    [],
    ['=== BAGIAN 1: REKAPITULASI PENDAPATAN GAJI KARYAWAN (AKHIR BULAN) ==='],
    [
      'No',
      'Nama Pekerja',
      'Jabatan',
      'Hadir Penuh (Hari)',
      'Setengah Hari',
      'Izin',
      'Sakit',
      'Alpa',
      'Total Hari Kerja Efektif',
      'Upah Pokok / Hari (IDR)',
      'Total Upah Pokok (IDR)',
      'Total Jam Lembur',
      'Total Upah Lembur (IDR)',
      'Total Hasil Produksi (Unit)',
      'Total Insentif Produksi (IDR)',
      'TOTAL PENDAPATAN GAJI (IDR)',
      'Status Pembayaran',
      'Tanggal Pembayaran'
    ],
    ...monthlyCalcs.map(({ employee: emp, calc }, idx) => [
      idx + 1,
      emp.full_name,
      emp.position || 'Pekerja Produksi',
      calc.present,
      calc.halfDay,
      calc.permit,
      calc.sick,
      calc.absent,
      calc.effectiveDays,
      calc.dailySalary,
      calc.baseSalary,
      calc.totalOvertimeHours,
      calc.overtimeAmount,
      calc.totalProduction,
      calc.incentiveAmount,
      calc.totalSalary,
      calc.isPaid ? 'Lunas (Dibayar)' : 'Belum Dibayar',
      calc.payout?.paid_at ? formatDate(calc.payout.paid_at) : '—'
    ]),
    [
      'TOTAL',
      'KESELURUHAN',
      '',
      monthlyCalcs.reduce((s, i) => s + i.calc.present, 0),
      monthlyCalcs.reduce((s, i) => s + i.calc.halfDay, 0),
      monthlyCalcs.reduce((s, i) => s + i.calc.permit, 0),
      monthlyCalcs.reduce((s, i) => s + i.calc.sick, 0),
      monthlyCalcs.reduce((s, i) => s + i.calc.absent, 0),
      monthlyCalcs.reduce((s, i) => s + i.calc.effectiveDays, 0),
      '',
      totalBaseSalary,
      totalOvertimeHours,
      totalOvertimePay,
      totalProduction,
      totalIncentive,
      totalMonthSalary,
      `${paidCount} Lunas`,
      ''
    ],
    [],
    ['=== BAGIAN 2: LOG RINCIAN ABSENSI HARIAN REALTIME (SEMUA KARYAWAN) ==='],
    [
      'No',
      'Tanggal Kerja',
      'Nama Pekerja',
      'Jabatan',
      'Status Kehadiran',
      'Upah Harian Hari Ini (IDR)',
      'Jam Lembur',
      'Tarif Lembur / Jam (IDR)',
      'Upah Lembur Hari Ini (IDR)',
      'Hasil Produksi (Unit)',
      'Insentif Produksi (IDR)',
      'Total Estimasi Hari Ini (IDR)',
      'Catatan / Hasil Kerja'
    ],
    ...attendanceRecords.map((r, idx) => {
      const emp = state.employees.find((e) => e.id === r.employee_id) || r.employees;
      const att = ATTENDANCE_LABELS[r.attendance_status] || { label: r.attendance_status || 'Hadir' };
      const otHours = Number(r.overtime_hours) || 0;
      const recOtRate = (r.overtime_rate !== undefined && r.overtime_rate !== null && r.overtime_rate !== '') ? Number(r.overtime_rate) : (emp?.overtime_rate || 0);
      const otPay = (r.overtime_pay !== undefined && r.overtime_pay !== null && r.overtime_pay !== '') ? Number(r.overtime_pay) : Math.round(otHours * recOtRate);
      const prodQty = Number(r.production_quantity) || 0;
      const incRate = Number(emp?.incentive_per_unit) || 0;
      const incAmount = Math.round(prodQty * incRate);
      const dailyWage = Number(r.daily_wage || r.base_salary) || 0;
      const totalDay = dailyWage + otPay + incAmount;

      return [
        idx + 1,
        r.work_date || r.period,
        emp?.full_name || 'Karyawan',
        emp?.position || 'Produksi',
        att.label,
        dailyWage,
        otHours,
        recOtRate,
        otPay,
        prodQty,
        incAmount,
        totalDay,
        r.notes || '—'
      ];
    })
  ];

  if (typeof XLSX !== 'undefined') {
    try {
      const wb = XLSX.utils.book_new();

      const payRows = [
        ['REKAPITULASI GAJI & ABSENSI KARYAWAN — JAYA WIJAYA'],
        ['Nama Perusahaan:', 'Jaya Wijaya', '', 'Periode Bulan:', selectedMonth],
        ['Bidang Usaha:', 'PRODUKSI • DISTRIBUSI • GROSIR', '', 'Tanggal Unduh:', formatDate(localDate)],
        ['Total Karyawan Aktif:', `${activeEmployees.length} orang`, '', 'Total Beban Gaji:', totalMonthSalary],
        ['Status Pembayaran:', `${paidCount} Lunas, ${pendingCount} Belum Dibayar`],
        [],
        [
          'No',
          'Nama Pekerja',
          'Jabatan',
          'Hadir Penuh (Hari)',
          'Setengah Hari',
          'Izin',
          'Sakit',
          'Alpa',
          'Total Hari Kerja Efektif',
          'Upah Pokok / Hari (IDR)',
          'Total Upah Pokok (IDR)',
          'Total Jam Lembur',
          'Total Upah Lembur (IDR)',
          'Total Hasil Produksi (Unit)',
          'Total Insentif Produksi (IDR)',
          'TOTAL PENDAPATAN GAJI (IDR)',
          'Status Pembayaran',
          'Tanggal Pembayaran'
        ],
        ...monthlyCalcs.map(({ employee: emp, calc }, idx) => [
          idx + 1,
          emp.full_name,
          emp.position || 'Pekerja Produksi',
          calc.present,
          calc.halfDay,
          calc.permit,
          calc.sick,
          calc.absent,
          calc.effectiveDays,
          calc.dailySalary,
          calc.baseSalary,
          calc.totalOvertimeHours,
          calc.overtimeAmount,
          calc.totalProduction,
          calc.incentiveAmount,
          calc.totalSalary,
          calc.isPaid ? 'Lunas (Dibayar)' : 'Belum Dibayar',
          calc.payout?.paid_at ? formatDate(calc.payout.paid_at) : '—'
        ]),
        [
          'TOTAL',
          'KESELURUHAN',
          '',
          monthlyCalcs.reduce((s, i) => s + i.calc.present, 0),
          monthlyCalcs.reduce((s, i) => s + i.calc.halfDay, 0),
          monthlyCalcs.reduce((s, i) => s + i.calc.permit, 0),
          monthlyCalcs.reduce((s, i) => s + i.calc.sick, 0),
          monthlyCalcs.reduce((s, i) => s + i.calc.absent, 0),
          monthlyCalcs.reduce((s, i) => s + i.calc.effectiveDays, 0),
          '',
          totalBaseSalary,
          totalOvertimeHours,
          totalOvertimePay,
          totalProduction,
          totalIncentive,
          totalMonthSalary,
          `${paidCount} Lunas`,
          ''
        ]
      ];
      const wsPay = XLSX.utils.aoa_to_sheet(payRows);
      XLSX.utils.book_append_sheet(wb, wsPay, 'Rekap Gaji Bulanan');

      const attRows = [
        ['LOG ABSENSI HARIAN REALTIME — JAYA WIJAYA'],
        ['Periode Bulan:', selectedMonth],
        [],
        [
          'No',
          'Tanggal Kerja',
          'Nama Pekerja',
          'Jabatan',
          'Status Kehadiran',
          'Upah Harian Hari Ini (IDR)',
          'Jam Lembur',
          'Tarif Lembur / Jam (IDR)',
          'Upah Lembur Hari Ini (IDR)',
          'Hasil Produksi (Unit)',
          'Insentif Produksi (IDR)',
          'Total Estimasi Hari Ini (IDR)',
          'Catatan / Hasil Kerja'
        ],
        ...attendanceRecords.map((r, idx) => {
          const emp = state.employees.find((e) => e.id === r.employee_id) || r.employees;
          const att = ATTENDANCE_LABELS[r.attendance_status] || { label: r.attendance_status || 'Hadir' };
          const otHours = Number(r.overtime_hours) || 0;
          const recOtRate = (r.overtime_rate !== undefined && r.overtime_rate !== null && r.overtime_rate !== '') ? Number(r.overtime_rate) : (emp?.overtime_rate || 0);
          const otPay = (r.overtime_pay !== undefined && r.overtime_pay !== null && r.overtime_pay !== '') ? Number(r.overtime_pay) : Math.round(otHours * recOtRate);
          const prodQty = Number(r.production_quantity) || 0;
          const incRate = Number(emp?.incentive_per_unit) || 0;
          const incAmount = Math.round(prodQty * incRate);
          const dailyWage = Number(r.daily_wage || r.base_salary) || 0;
          const totalDay = dailyWage + otPay + incAmount;

          return [
            idx + 1,
            r.work_date || r.period,
            emp?.full_name || 'Karyawan',
            emp?.position || 'Produksi',
            att.label,
            dailyWage,
            otHours,
            recOtRate,
            otPay,
            prodQty,
            incAmount,
            totalDay,
            r.notes || '—'
          ];
        })
      ];
      const wsAtt = XLSX.utils.aoa_to_sheet(attRows);
      XLSX.utils.book_append_sheet(wb, wsAtt, 'Log Absensi Harian');

      XLSX.writeFile(wb, `rekap-gaji-dan-absensi-${selectedMonth}.xlsx`);
      notify(`Rekap gaji & absensi periode ${selectedMonth} berhasil diunduh (Excel).`);
      return;
    } catch (err) {
      console.warn('XLSX export failed, fallback to CSV:', err);
    }
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `rekap-gaji-dan-absensi-${selectedMonth}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  notify(`Rekap gaji & absensi periode ${selectedMonth} berhasil diunduh (CSV).`);
}

export function downloadSingleEmployeeAttendance(employeeId, month) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return;
  const calc = calculateMonthlySalary(employee, month);
  const records = [...calc.records].sort((a, b) => String(a?.work_date || a?.period || '').localeCompare(String(b?.work_date || b?.period || '')));

  const rows = [
    ['RINCIAN ABSENSI & ESTIMASI UPAH KARYAWAN'],
    ['Nama Pekerja', employee.full_name],
    ['Jabatan', employee.position || 'Produksi'],
    ['Periode Bulan', month],
    ['Upah Pokok Per Hari', employee.daily_salary || 0],
    ['Tarif Lembur Standar', `${employee.overtime_rate || 0} / jam`],
    ['Insentif Standar', `${employee.incentive_per_unit || 0} / unit`],
    ['Hari Kerja Efektif', `${calc.effectiveDays} hari (${calc.present} Hadir, ${calc.halfDay} ½ Hari, ${calc.permit} Izin, ${calc.sick} Sakit, ${calc.absent} Alpa)`],
    ['Akumulasi Jam Lembur', `${calc.totalOvertimeHours} jam`],
    ['Total Upah Pokok', calc.baseSalary],
    ['Total Upah Lembur', calc.overtimeAmount],
    ['Total Insentif Produksi', calc.incentiveAmount],
    ['TOTAL GAJI BULAN INI', calc.totalSalary],
    ['Status Pembayaran', calc.isPaid ? `Lunas (${formatDate(calc.payout?.paid_at)})` : 'Belum Dibayar'],
    [],
    ['No', 'Tanggal Kerja', 'Status Kehadiran', 'Upah Pokok Hari Ini (IDR)', 'Jam Lembur', 'Tarif Lembur (IDR)', 'Upah Lembur (IDR)', 'Produksi (Unit)', 'Insentif (IDR)', 'Estimasi Hari Ini (IDR)', 'Catatan'],
    ...records.map((r, idx) => {
      const att = ATTENDANCE_LABELS[r.attendance_status] || { label: r.attendance_status };
      const otHours = Number(r.overtime_hours) || 0;
      const recOtRate = (r.overtime_rate !== undefined && r.overtime_rate !== null && r.overtime_rate !== '') ? Number(r.overtime_rate) : (employee.overtime_rate || 0);
      const otPay = (r.overtime_pay !== undefined && r.overtime_pay !== null && r.overtime_pay !== '') ? Number(r.overtime_pay) : Math.round(otHours * recOtRate);
      const prodQty = Number(r.production_quantity) || 0;
      const incRate = Number(employee.incentive_per_unit) || 0;
      const incAmount = Math.round(prodQty * incRate);
      const dailyWage = Number(r.daily_wage || r.base_salary) || 0;
      const totalDay = dailyWage + otPay + incAmount;

      return [
        idx + 1,
        r.work_date || r.period,
        att.label,
        dailyWage,
        otHours,
        recOtRate,
        otPay,
        prodQty,
        incAmount,
        totalDay,
        r.notes || '—'
      ];
    })
  ];

  const safeName = employee.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `absensi-${safeName}-${month}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  notify(`Rincian absensi ${employee.full_name} berhasil diunduh.`);
}

export function downloadFileBlob(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function exportProducts(format = 'csv') {
  let products = [...(state.products || [])];
  if (!products.length) {
    showError('Belum ada data barang untuk diunduh.');
    return;
  }

  const currentFilter = state.productsFilter || 'all';
  if (currentFilter === 'available') {
    products = products.filter((p) => stockFor(p.id) > 0);
  } else if (currentFilter === 'empty') {
    products = products.filter((p) => stockFor(p.id) <= 0);
  }

  const dateStr = typeof localDate === 'function' ? localDate() : (localDate || new Date().toISOString().slice(0, 10));
  const filterLabel = currentFilter === 'available' ? 'Stok Tersedia (>0)' : (currentFilter === 'empty' ? 'Stok Habis / Kritis (<=0)' : 'Semua Data Barang');

  const rows = [
    ['KATALOG DATA BARANG - JAYA WIJAYA'],
    ['Kategori Saring', filterLabel],
    ['Tanggal Ekspor', formatDate(dateStr)],
    ['Total Produk', `${products.length} SKU`],
    [],
    ['NO', 'KODE SKU', 'NAMA BARANG', 'KATEGORI', 'SATUAN', 'HARGA BELI (RP)', 'HARGA JUAL (RP)', 'ESTIMASI LABA/SATUAN (RP)', 'STOK FISIK', 'STATUS STOK']
  ];

  products.forEach((p, idx) => {
    const stock = stockFor(p.id);
    const purchase = Number(p.purchase_price) || 0;
    const sale = Number(p.sale_price) || 0;
    const margin = sale - purchase;
    const status = stock <= 0 ? 'Habis / Kritis' : (stock <= (p.min_stock || 5) ? 'Menipis' : 'Tersedia');

    rows.push([
      idx + 1,
      p.sku || `PRD-${p.id}`,
      p.name,
      p.category || 'Umum',
      p.unit || 'Pcs',
      purchase,
      sale,
      margin,
      stock,
      status
    ]);
  });

  const baseFilename = `Data_Barang_Jaya_Wijaya_${dateStr.replace(/-/g, '')}`;

  if (format === 'excel' && typeof XLSX !== 'undefined') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Barang');
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
    notify('Data barang berhasil diunduh (Excel).');
  } else {
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    downloadFileBlob(csv, `${baseFilename}.csv`, 'text/csv;charset=utf-8;');
    notify('Data barang berhasil diunduh (CSV).');
  }
}

export function exportInventory(format = 'csv') {
  const inventory = [...(state.inventory || [])];
  if (!inventory.length) {
    showError('Belum ada data pergerakan barang untuk diunduh.');
    return;
  }

  inventory.sort((a, b) => String(b.occurred_on || '').localeCompare(String(a.occurred_on || '')));
  const dateStr = typeof localDate === 'function' ? localDate() : (localDate || new Date().toISOString().slice(0, 10));

  const rows = [
    ['RIWAYAT PERGERAKAN STOK GUDANG (MUTASI) - JAYA WIJAYA'],
    ['Tanggal Ekspor', formatDate(dateStr)],
    ['Total Mutasi Tercatat', `${inventory.length} Transaksi`],
    [],
    ['NO', 'TANGGAL', 'KODE TRANSAKSI', 'NAMA BARANG', 'ARUS MUTASI', 'JUMLAH (QTY)', 'SATUAN', 'KETERANGAN / KEPERLUAN', 'WAKTU INPUT']
  ];

  inventory.forEach((inv, idx) => {
    const prod = state.products.find((p) => p.id === inv.product_id);
    const directionLabel = inv.direction === 'in' ? 'Barang Masuk (+)' : 'Barang Keluar (-)';
    const unit = prod?.unit || 'Pcs';
    const prodName = prod?.name || `Produk #${inv.product_id}`;

    rows.push([
      idx + 1,
      formatDate(inv.occurred_on),
      inv.id || `#${idx + 1}`,
      prodName,
      directionLabel,
      Number(inv.quantity),
      unit,
      inv.notes || '',
      inv.created_at ? formatDate(inv.created_at) : ''
    ]);
  });

  const baseFilename = `Mutasi_Gudang_Jaya_Wijaya_${dateStr.replace(/-/g, '')}`;

  if (format === 'excel' && typeof XLSX !== 'undefined') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Mutasi Stok');
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
    notify('Data mutasi gudang berhasil diunduh (Excel).');
  } else {
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    downloadFileBlob(csv, `${baseFilename}.csv`, 'text/csv;charset=utf-8;');
    notify('Data mutasi gudang berhasil diunduh (CSV).');
  }
}

export function exportCash(format = 'csv') {
  let cash = [...(state.cash || [])];
  if (!cash.length) {
    showError('Belum ada data transaksi kas untuk diunduh.');
    return;
  }

  const currentFilter = state.cashFilter || 'all';
  if (currentFilter === 'in') {
    cash = cash.filter((c) => c.direction === 'in');
  } else if (currentFilter === 'out') {
    cash = cash.filter((c) => c.direction === 'out');
  }

  cash.sort((a, b) => String(b.occurred_on || '').localeCompare(String(a.occurred_on || '')));
  const dateStr = typeof localDate === 'function' ? localDate() : (localDate || new Date().toISOString().slice(0, 10));
  const filterLabel = currentFilter === 'in' ? 'Hanya Uang Masuk (Pemasukan)' : (currentFilter === 'out' ? 'Hanya Uang Keluar (Pengeluaran)' : 'Semua Transaksi Kas');

  const totalIn = cash.filter((c) => c.direction === 'in').reduce((sum, c) => sum + Number(c.amount), 0);
  const totalOut = cash.filter((c) => c.direction === 'out').reduce((sum, c) => sum + Number(c.amount), 0);
  const saldoFilter = totalIn - totalOut;

  const rows = [
    ['BUKU BESAR ARUS KAS MASUK & KELUAR - JAYA WIJAYA'],
    ['Kategori Saring', filterLabel],
    ['Tanggal Ekspor', formatDate(dateStr)],
    ['Total Pemasukan Saring (Rp)', totalIn],
    ['Total Pengeluaran Saring (Rp)', totalOut],
    ['Selisih Arus Kas (Rp)', saldoFilter],
    [],
    ['NO', 'TANGGAL', 'KATEGORI', 'ARUS TRANSAKSI', 'UANG MASUK (RP)', 'UANG KELUAR (RP)', 'KETERANGAN', 'WAKTU INPUT']
  ];

  cash.forEach((c, idx) => {
    const isMasuk = c.direction === 'in';
    const amt = Number(c.amount) || 0;

    rows.push([
      idx + 1,
      formatDate(c.occurred_on),
      c.category || 'Operasional',
      isMasuk ? 'Uang Masuk (+)' : 'Uang Keluar (-)',
      isMasuk ? amt : 0,
      !isMasuk ? amt : 0,
      c.notes || '',
      c.created_at ? formatDate(c.created_at) : ''
    ]);
  });

  const baseFilename = `Buku_Kas_Jaya_Wijaya_${dateStr.replace(/-/g, '')}`;

  if (format === 'excel' && typeof XLSX !== 'undefined') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas');
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
    notify('Data buku kas berhasil diunduh (Excel).');
  } else {
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    downloadFileBlob(csv, `${baseFilename}.csv`, 'text/csv;charset=utf-8;');
    notify('Data buku kas berhasil diunduh (CSV).');
  }
}


export function openReportDetailModal(type, id, month = currentMonth) {
  if (type === 'cash') {
    const rec = state.cash.find((c) => c.id === id);
    if (!rec) return;
    const isIncome = rec.direction === 'in';
    const desc = rec.description || '';
    const catLower = (rec.category || '').toLowerCase();

    // Parse Buyer, Supplier, Production Team
    const buyerName = (desc.match(/Pembeli:\s*([^·\r\n]+)/i) || [])[1]?.trim() || '';
    const supplierName = (desc.match(/Supplier:\s*([^·\r\n]+)/i) || [])[1]?.trim() || '';
    const teamName = (desc.match(/Produksi:\s*([^·\r\n]+)/i) || [])[1]?.trim() || '';

    // Payment Status & Amounts
    let paymentStatusText = 'Lunas';
    let paymentStatusClass = 'lunas';
    let isDP = false;
    let remainingAmount = 0;
    let paidAmount = Number(rec.amount) || 0;

    if (desc.includes('Lunas') && !desc.includes('Sisa Tagihan') && !desc.includes('Sisa Piutang') && !desc.includes('Sisa Utang')) {
      paymentStatusText = 'Lunas';
      paymentStatusClass = 'lunas';
      isDP = false;
      paidAmount = Number(rec.amount) || 0;
      remainingAmount = 0;
    } else if (desc.includes('DP') || (rec.category || '').includes('DP')) {
      paymentStatusText = 'Uang Muka (DP)';
      paymentStatusClass = 'dp';
      isDP = true;
      const remMatch = desc.match(/(?:Sisa Tagihan|Sisa Piutang|Sisa Utang)[:\s]+(?:Rp\s*)?([\d.,]+)/i);
      if (remMatch) {
        remainingAmount = Number(remMatch[1].replace(/[.,]/g, '')) || 0;
      }
    } else if (desc.includes('Tempo') || desc.includes('Piutang') || desc.includes('Utang')) {
      paymentStatusText = isIncome ? 'Tempo / Piutang' : 'Tempo / Utang';
      paymentStatusClass = 'tempo';
    }

    const totalAmount = isDP ? (paidAmount + remainingAmount) : paidAmount;

    // Parse Item & Qty
    let itemName = '';
    let itemQtyText = '1 transaksi';
    let itemPriceText = '';

    const matchingInv = state.inventory.find((inv) => {
      if (inv.occurred_on !== rec.occurred_on) return false;
      if (isIncome && inv.direction === 'out') {
        if (buyerName && (inv.notes || '').includes(buyerName)) return true;
        return true;
      }
      if (!isIncome && inv.direction === 'in') {
        if (supplierName && (inv.notes || '').includes(supplierName)) return true;
      }
      return false;
    });

    if (matchingInv) {
      const prod = state.products.find((p) => p.id === matchingInv.product_id) || matchingInv.products;
      itemName = prod?.name || 'Produk';
      itemQtyText = `${formatQuantity(matchingInv.quantity)} ${prod?.unit || 'unit'}`;
      const unitPrice = isIncome ? (Number(prod?.selling_price) || 0) : (Number(prod?.purchase_price) || 0);
      if (unitPrice > 0) itemPriceText = formatMoney(unitPrice);
    }

    if (!itemName) {
      const itemMatch = desc.match(/(?:Penjualan|DP Penjualan|Belanja|DP Belanja)\s+([\d.,]+)\s+([a-zA-Z]+)\s+([^·\r\n(]+)/i);
      if (itemMatch) {
        itemQtyText = `${itemMatch[1]} ${itemMatch[2]}`;
        itemName = itemMatch[3].trim();
        const numQty = Number(itemMatch[1].replace(/[.,]/g, '')) || 1;
        if (numQty > 1 && totalAmount > 0) {
          itemPriceText = formatMoney(Math.round(totalAmount / numQty));
        }
      } else {
        const parts = desc.split('·').map((p) => p.trim());
        const mainPart = parts[0] || rec.category;
        itemName = mainPart.replace(/\s*\((Lunas|DP)\)\s*/gi, '').trim();
      }
    }

    // Extra notes
    const parts = desc.split('·').map((p) => p.trim());
    const extraParts = parts.filter((p) =>
      !p.match(/^(Pembeli|Supplier|Produksi|Keperluan):/i) &&
      !p.match(/^(Penjualan|DP Penjualan|Belanja|DP Belanja)/i) &&
      !p.match(/^(Diterima:|Dibayar:)/i)
    );
    const extraNotes = extraParts.join(' · ');

    let receiptTitle = isIncome ? 'NOTA PENJUALAN' : 'BUKTI PENGELUARAN KAS';
    if (catLower.includes('belanja') || catLower.includes('bahan')) {
      receiptTitle = 'NOTA PEMBELIAN';
    } else if (catLower.includes('gaji')) {
      receiptTitle = 'BUKTI PEMBAYARAN GAJI';
    }

    const receiptNumber = `TRX-${rec.occurred_on.replace(/-/g, '')}-${rec.id.slice(0, 4).toUpperCase()}`;

    const rawText = buildReceiptRawText({
      shopName: 'JAYA WIJAYA',
      shopSub: 'PRODUKSI • DISTRIBUSI • GROSIR',
      title: receiptTitle,
      receiptNumber,
      date: formatDate(rec.occurred_on),
      buyer: buyerName,
      supplier: supplierName,
      team: teamName,
      paymentStatus: paymentStatusText,
      itemName,
      qtyText: itemQtyText,
      priceText: itemPriceText,
      totalAmount,
      paidAmount,
      remainingAmount,
      isDP,
      extraNotes,
    });

    let financialRole = 'Beban Operasional Usaha';
    let impactText = 'Mengurangi kas dan mengurangi laba bersih operasional.';
    if (isIncome) {
      financialRole = 'Pendapatan Usaha (Omzet Penjualan)';
      impactText = 'Menambah kas masuk, meningkatkan laba kotor, dan laba bersih.';
    } else if (catLower.includes('bahan') || catLower.includes('material') || catLower.includes('belanja')) {
      financialRole = 'Harga Pokok Penjualan (HPP) / Belanja Bahan Baku';
      impactText = 'Beban pokok pengadaan material/produk. Mengurangi laba kotor & laba bersih.';
    } else if (catLower.includes('gaji') || catLower.includes('upah')) {
      financialRole = 'Beban Gaji & Upah Karyawan (Operasional)';
      impactText = 'Beban upah tenaga kerja produksi. Mengurangi laba bersih.';
    } else if (catLower.includes('listrik') || catLower.includes('utilitas')) {
      financialRole = 'Beban Utilitas & Listrik Pabrik (Operasional)';
      impactText = 'Biaya operasional fasilitas produksi. Mengurangi laba bersih.';
    } else if (catLower.includes('rawat') || catLower.includes('perbaikan') || catLower.includes('mesin') || catLower.includes('alat')) {
      financialRole = 'Beban Pemeliharaan Mesin & Alat (Operasional)';
      impactText = 'Biaya perawatan mesin cetak & potong. Mengurangi laba bersih.';
    }

    openDialog(`Nota Transaksi — ${receiptTitle}`, `
      <div class="nota-card-container">
        <div id="receipt-paper" class="receipt-paper" data-raw-text="${escapeHtml(rawText)}">
          <div class="receipt-header">
            <div class="receipt-shop-name">JAYA WIJAYA</div>
            <div class="receipt-shop-sub">PRODUKSI • DISTRIBUSI • GROSIR</div>
            <div class="receipt-title">${escapeHtml(receiptTitle)}</div>
            <div class="receipt-divider-double"></div>
          </div>
          <div class="receipt-meta">
            <div class="receipt-row">
              <span>No. Bukti / Nota:</span>
              <strong>#${escapeHtml(receiptNumber)}</strong>
            </div>
            <div class="receipt-row">
              <span>Tanggal Transaksi:</span>
              <strong>${formatDate(rec.occurred_on)}</strong>
            </div>
          </div>
          ${buyerName ? `
          <div class="receipt-party-box party-buyer">
            <div class="receipt-party-label">PEMBELI / PELANGGAN:</div>
            <div class="receipt-party-name">${escapeHtml(buyerName)}</div>
            <div class="receipt-party-badge badge-${paymentStatusClass}">${escapeHtml(paymentStatusText)}</div>
          </div>` : ''}
          ${supplierName ? `
          <div class="receipt-party-box party-supplier">
            <div class="receipt-party-label">SUPPLIER / TEMPAT BELI:</div>
            <div class="receipt-party-name">${escapeHtml(supplierName)}</div>
            <div class="receipt-party-badge badge-${paymentStatusClass}">${escapeHtml(paymentStatusText)}</div>
          </div>` : ''}
          ${teamName ? `
          <div class="receipt-party-box party-prod">
            <div class="receipt-party-label">TIM / SHIFT PRODUKSI:</div>
            <div class="receipt-party-name">${escapeHtml(teamName)}</div>
          </div>` : ''}
          <div class="receipt-divider"></div>
          <div class="receipt-items">
            <div class="receipt-item-header">
              <span>RINCIAN / KETERANGAN</span>
              <span class="align-right">TOTAL</span>
            </div>
            <div class="receipt-divider-dash"></div>
            <div class="receipt-item-line">
              <div class="receipt-item-name">${escapeHtml(itemName)}</div>
              <div class="receipt-item-sub">
                <span>${escapeHtml(itemQtyText)}${itemPriceText ? ` @ ${escapeHtml(itemPriceText)}` : ''}</span>
                <span class="receipt-item-total">${formatMoney(totalAmount)}</span>
              </div>
            </div>
          </div>
          <div class="receipt-divider"></div>
          <div class="receipt-summary">
            <div class="receipt-row">
              <span>Total Transaksi:</span>
              <strong>${formatMoney(totalAmount)}</strong>
            </div>
            ${isDP ? `
            <div class="receipt-row">
              <span>Uang Muka (DP) Masuk Kas:</span>
              <strong style="color: #187554;">${formatMoney(paidAmount)}</strong>
            </div>
            <div class="receipt-row">
              <span>Sisa Tagihan (Piutang):</span>
              <strong style="color: #c53030;">${formatMoney(remainingAmount)}</strong>
            </div>` : `
            <div class="receipt-row receipt-row-total">
              <span>${isIncome ? 'Total Diterima (Kas):' : 'Total Dibayar (Kas):'}</span>
              <span class="receipt-grand-total">${formatMoney(paidAmount)}</span>
            </div>`}
            ${remainingAmount > 0 ? `
            <div class="receipt-row no-print" style="background:#eff6ff; border:1px dashed #38bdf8; border-radius:6px; padding:6px 9px; margin:7px 0; align-items:center;">
              <span style="color:#0284c7; font-weight:700;">Status Pelunasan:</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="color:#dc2626; font-size:11px; font-weight:700;">Sisa ${formatMoney(remainingAmount)}</span>
                <button type="button" class="button button-small button-primary" data-action="open-settlement-modal" data-type="${type}" data-id="${escapeHtml(rec.id)}" style="background:#0284c7; font-size:10px; padding:2px 8px; height:24px; min-height:24px; display:inline-flex; align-items:center; gap:4px;">
                  ${Icons.cash('icon-svg', 11)} Lunasi
                </button>
              </div>
            </div>` : ''}
            <div class="receipt-row">
              <span>Status Pembayaran:</span>
              <strong style="color: ${paymentStatusClass === 'lunas' ? '#187554' : (paymentStatusClass === 'dp' ? '#9c6312' : '#b82d2d')};">${escapeHtml(paymentStatusText)}</strong>
            </div>
            ${extraNotes ? `
            <div class="receipt-row receipt-extra-notes">
              <span>Catatan:</span>
              <span>${escapeHtml(extraNotes)}</span>
            </div>` : ''}
          </div>
          <div class="receipt-divider-double"></div>
          <div class="receipt-footer">
            <p class="receipt-thankyou">*** TERIMA KASIH ***</p>
            <p class="receipt-disclaimer">Simpan struk ini sebagai bukti transaksi sah.</p>
          </div>
        </div>
        <details class="nota-audit-details">
          <summary style="display:inline-flex; align-items:center; gap:6px;">${Icons.reports('icon-svg', 13)} Rincian Akuntansi & Pembukuan Kas</summary>
          <div class="nota-audit-content">
            <div class="slip-row"><span>Kategori Pos:</span> <strong>${escapeHtml(rec.category)}</strong></div>
            <div class="slip-row"><span>Klasifikasi Akuntansi:</span> <strong>${financialRole}</strong></div>
            <div class="slip-row"><span>Dampak Laba Rugi:</span> <span>${impactText}</span></div>
          </div>
        </details>
      </div>
      <div class="dialog-actions nota-dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
        ${remainingAmount > 0 ? `
        <button type="button" class="button button-primary" data-action="open-settlement-modal" data-type="${type}" data-id="${escapeHtml(rec.id)}" style="display:inline-flex; align-items:center; gap:6px; background:#0284c7;" title="Catat pembayaran pelunasan tagihan ini">
          <span>${Icons.cash('icon-svg', 13)}</span> Lunasi ${isIncome ? 'Piutang' : 'Utang'} (${formatMoney(remainingAmount)})
        </button>` : ''}
        <button type="button" class="button button-outline" data-action="copy-receipt-text" style="display:inline-flex; align-items:center; gap:5px;" title="Salin format teks monospaced untuk dicetak lewat aplikasi Bluetooth atau dikirim ke WhatsApp">
          <span>${Icons.clipboard('icon-svg', 13)}</span> Salin Teks Struk
        </button>
        <button type="button" class="button button-primary" data-action="print-thermal-receipt" style="display:inline-flex; align-items:center; gap:6px; background:#187554;" title="Cetak dokumen nota atau simpan sebagai PDF">
          <span>${Icons.printer('icon-svg', 13)}</span> Cetak Nota / Faktur
        </button>
      </div>
    `);
  } else if (type === 'inventory') {
    const rec = state.inventory.find((i) => i.id === id);
    if (!rec) return;
    const prod = state.products.find((p) => p.id === rec.product_id) || rec.products;
    const isIn = rec.direction === 'in';
    const notes = rec.notes || '';
    const isProduction = isIn && (notes.includes('Hasil Produksi') || notes.toLowerCase().includes('produksi'));
    const isUsage = !isIn && (notes.includes('Pemakaian') || notes.toLowerCase().includes('internal') || notes.toLowerCase().includes('reject'));
    const purchasePrice = Number(prod?.purchase_price) || 0;
    const sellingPrice = Number(prod?.selling_price) || 0;
    const qty = Number(rec.quantity) || 0;
    const unitPrice = isIn ? purchasePrice : sellingPrice;
    const totalAmount = Math.round(qty * unitPrice);

    const buyerName = (notes.match(/Pembeli:\s*([^·\r\n]+)/i) || [])[1]?.trim() || '';
    const supplierName = (notes.match(/Supplier:\s*([^·\r\n]+)/i) || [])[1]?.trim() || '';
    const teamName = (notes.match(/Produksi:\s*([^·\r\n]+)/i) || [])[1]?.trim() || '';

    let paymentStatusText = 'Lunas';
    let paymentStatusClass = 'lunas';
    let isDP = false;
    let paidAmount = totalAmount;
    let remainingAmount = 0;

    if (notes.includes('Lunas') && !notes.includes('Sisa Piutang') && !notes.includes('Sisa Utang') && !notes.includes('Sisa Tagihan')) {
      paymentStatusText = 'Lunas';
      paymentStatusClass = 'lunas';
      isDP = false;
      paidAmount = totalAmount;
      remainingAmount = 0;
    } else if (notes.includes('DP')) {
      paymentStatusText = 'Uang Muka (DP)';
      paymentStatusClass = 'dp';
      isDP = true;
      const dpMatch = notes.match(/DP\s+(?:Rp\s*)?([\d.,]+)/i);
      const remMatch = notes.match(/(?:Sisa Tagihan|Sisa Piutang|Sisa Utang)[:\s]+(?:Rp\s*)?([\d.,]+)/i);
      if (dpMatch) paidAmount = Number(dpMatch[1].replace(/[.,]/g, '')) || 0;
      if (remMatch) remainingAmount = Number(remMatch[1].replace(/[.,]/g, '')) || 0;
    } else if (notes.includes('Tempo') || notes.includes('Piutang') || notes.includes('Utang')) {
      paymentStatusText = isIn ? 'Tempo / Utang' : 'Tempo / Piutang';
      paymentStatusClass = 'tempo';
      paidAmount = 0;
      remainingAmount = totalAmount;
    } else if (isProduction) {
      paymentStatusText = 'Hasil Produksi';
      paymentStatusClass = 'prod';
    } else if (isUsage) {
      paymentStatusText = 'Pemakaian Internal';
      paymentStatusClass = 'tempo';
    }

    let receiptTitle = isProduction
      ? 'BUKTI HASIL PRODUKSI'
      : (isUsage ? 'BUKTI PEMAKAIAN INTERNAL' : (isIn ? 'NOTA PEMBELIAN BARANG' : 'NOTA PENJUALAN PRODUK'));

    const receiptNumber = `INV-${rec.occurred_on.replace(/-/g, '')}-${rec.id.slice(0, 4).toUpperCase()}`;

    const parts = notes.split('·').map((p) => p.trim());
    const extraParts = parts.filter((p) =>
      !p.match(/^\[.*\]/i) &&
      !p.match(/^(Pembeli|Supplier|Produksi|Keperluan):/i)
    );
    const extraNotes = extraParts.join(' · ');

    const rawText = buildReceiptRawText({
      shopName: 'JAYA WIJAYA',
      shopSub: 'PRODUKSI • DISTRIBUSI • GROSIR',
      title: receiptTitle,
      receiptNumber,
      date: formatDate(rec.occurred_on),
      buyer: buyerName,
      supplier: supplierName,
      team: teamName,
      paymentStatus: paymentStatusText,
      itemName: prod?.name || 'Produk',
      qtyText: `${formatQuantity(qty)} ${prod?.unit || 'unit'}`,
      priceText: unitPrice > 0 ? formatMoney(unitPrice) : '',
      totalAmount,
      paidAmount,
      remainingAmount,
      isDP,
      extraNotes,
    });

    let operationalClassification = isIn
      ? 'Penerimaan Stok Gudang (Menambah Persediaan)'
      : 'Barang Keluar Gudang (Pengiriman Pesanan / Terjual)';
    if (isProduction) {
      operationalClassification = 'Hasil Produksi Mandiri Pabrik. Menambah stok barang jadi tanpa beban kas belanja.';
    } else if (isUsage) {
      operationalClassification = 'Pemakaian Operasional / Afkir Reject. Mengurangi stok fisik tanpa uang masuk.';
    } else if (!isIn && notes.includes('DP')) {
      operationalClassification = 'Penjualan Barang dengan Pembayaran Uang Muka (DP). Kas masuk sebesar uang DP, sisa dicatat sebagai piutang.';
    } else if (!isIn && (notes.includes('Tempo') || notes.includes('Piutang'))) {
      operationalClassification = 'Penjualan Barang Tempo (Piutang Penuh). Barang dikirim tanpa kas masuk saat ini.';
    }

    openDialog(`Nota Transaksi — ${receiptTitle}`, `
      <div class="nota-card-container">
        <div id="receipt-paper" class="receipt-paper" data-raw-text="${escapeHtml(rawText)}">
          <div class="receipt-header">
            <div class="receipt-shop-name">JAYA WIJAYA</div>
            <div class="receipt-shop-sub">PRODUKSI • DISTRIBUSI • GROSIR</div>
            <div class="receipt-title">${escapeHtml(receiptTitle)}</div>
            <div class="receipt-divider-double"></div>
          </div>
          <div class="receipt-meta">
            <div class="receipt-row">
              <span>No. Bukti / Nota:</span>
              <strong>#${escapeHtml(receiptNumber)}</strong>
            </div>
            <div class="receipt-row">
              <span>Tanggal:</span>
              <strong>${formatDate(rec.occurred_on)}</strong>
            </div>
          </div>
          ${buyerName ? `
          <div class="receipt-party-box party-buyer">
            <div class="receipt-party-label">PEMBELI / PELANGGAN:</div>
            <div class="receipt-party-name">${escapeHtml(buyerName)}</div>
            <div class="receipt-party-badge badge-${paymentStatusClass}">${escapeHtml(paymentStatusText)}</div>
          </div>` : ''}
          ${supplierName ? `
          <div class="receipt-party-box party-supplier">
            <div class="receipt-party-label">SUPPLIER / TEMPAT BELI:</div>
            <div class="receipt-party-name">${escapeHtml(supplierName)}</div>
            <div class="receipt-party-badge badge-${paymentStatusClass}">${escapeHtml(paymentStatusText)}</div>
          </div>` : ''}
          ${teamName ? `
          <div class="receipt-party-box party-prod">
            <div class="receipt-party-label">TIM / SHIFT PRODUKSI:</div>
            <div class="receipt-party-name">${escapeHtml(teamName)}</div>
          </div>` : ''}
          <div class="receipt-divider"></div>
          <div class="receipt-items">
            <div class="receipt-item-header">
              <span>PRODUK / SATUAN</span>
              <span class="align-right">TOTAL</span>
            </div>
            <div class="receipt-divider-dash"></div>
            <div class="receipt-item-line">
              <div class="receipt-item-name">${escapeHtml(prod?.name || 'Produk')}</div>
              <div class="receipt-item-sub">
                <span>${formatQuantity(qty)} ${escapeHtml(prod?.unit || 'unit')}${unitPrice > 0 ? ` @ ${formatMoney(unitPrice)}` : ''}</span>
                <span class="receipt-item-total">${formatMoney(totalAmount)}</span>
              </div>
            </div>
          </div>
          <div class="receipt-divider"></div>
          <div class="receipt-summary">
            <div class="receipt-row">
              <span>Total Nilai Barang:</span>
              <strong>${formatMoney(totalAmount)}</strong>
            </div>
            ${isDP ? `
            <div class="receipt-row">
              <span>Uang Muka (DP):</span>
              <strong style="color: #187554;">${formatMoney(paidAmount)}</strong>
            </div>
            <div class="receipt-row">
              <span>Sisa Tagihan:</span>
              <strong style="color: #c53030;">${formatMoney(remainingAmount)}</strong>
            </div>` : `
            <div class="receipt-row receipt-row-total">
              <span>Total Transaksi:</span>
              <span class="receipt-grand-total">${formatMoney(totalAmount)}</span>
            </div>`}
            ${remainingAmount > 0 ? `
            <div class="receipt-row no-print" style="background:#eff6ff; border:1px dashed #38bdf8; border-radius:6px; padding:6px 9px; margin:7px 0; align-items:center;">
              <span style="color:#0284c7; font-weight:700;">Status Pelunasan:</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="color:#dc2626; font-size:11px; font-weight:700;">Sisa ${formatMoney(remainingAmount)}</span>
                <button type="button" class="button button-small button-primary" data-action="open-settlement-modal" data-type="${type}" data-id="${escapeHtml(rec.id)}" style="background:#0284c7; font-size:10px; padding:2px 8px; height:24px; min-height:24px; display:inline-flex; align-items:center; gap:4px;">
                  ${Icons.cash('icon-svg', 11)} Lunasi
                </button>
              </div>
            </div>` : ''}
            <div class="receipt-row">
              <span>Status:</span>
              <strong>${escapeHtml(paymentStatusText)}</strong>
            </div>
            ${extraNotes ? `
            <div class="receipt-row receipt-extra-notes">
              <span>Catatan:</span>
              <span>${escapeHtml(extraNotes)}</span>
            </div>` : ''}
          </div>
          <div class="receipt-divider-double"></div>
          <div class="receipt-footer">
            <p class="receipt-thankyou">*** TERIMA KASIH ***</p>
            <p class="receipt-disclaimer">Simpan struk ini sebagai bukti transaksi sah.</p>
          </div>
        </div>
        <details class="nota-audit-details">
          <summary style="display:inline-flex; align-items:center; gap:6px;">${Icons.inventory('icon-svg', 13)} Rincian Operasional & Mutasi Stok</summary>
          <div class="nota-audit-content">
            <div class="slip-row"><span>Kode SKU:</span> <strong>${escapeHtml(prod?.sku || '—')}</strong></div>
            <div class="slip-row"><span>Arah Stok:</span> <strong>${isIn ? 'Masuk (+)' : 'Keluar (−)'}</strong></div>
            <div class="slip-row"><span>Klasifikasi Operasional:</span> <strong>${operationalClassification}</strong></div>
          </div>
        </details>
      </div>
      <div class="dialog-actions nota-dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
        ${remainingAmount > 0 ? `
        <button type="button" class="button button-primary" data-action="open-settlement-modal" data-type="${type}" data-id="${escapeHtml(rec.id)}" style="display:inline-flex; align-items:center; gap:6px; background:#0284c7;" title="Catat pembayaran pelunasan tagihan ini">
          <span>${Icons.cash('icon-svg', 13)}</span> Lunasi ${isIn ? 'Utang' : 'Piutang'} (${formatMoney(remainingAmount)})
        </button>` : ''}
        <button type="button" class="button button-outline" data-action="copy-receipt-text" style="display:inline-flex; align-items:center; gap:5px;" title="Salin format teks monospaced untuk dicetak lewat aplikasi Bluetooth atau dikirim ke WhatsApp">
          <span>${Icons.clipboard('icon-svg', 13)}</span> Salin Teks Struk
        </button>
        <button type="button" class="button button-primary" data-action="print-thermal-receipt" style="display:inline-flex; align-items:center; gap:6px; background:#187554;" title="Cetak nota langsung ke printer Bluetooth (58mm / 80mm)">
          <span>${Icons.printer('icon-svg', 13)}</span> Cetak Nota / Faktur
        </button>
      </div>
    `);
  } else if (type === 'payroll' || type === 'employee') {
    const emp = state.employees.find((e) => e.id === id);
    if (!emp) return;
    payMonthlySalaryModal(emp.id, month);
  }
}

export function openSettlementModal(targetType, targetId) {
  let rec, isSale, partyName = '', itemName = 'Produk', itemQtyText = '1 unit', totalAmount = 0, paidAmount = 0, remainingAmount = 0;

  if (targetType === 'inventory') {
    rec = state.inventory.find((i) => i.id === targetId);
    if (!rec) return;
    const prod = state.products.find((p) => p.id === rec.product_id) || rec.products;
    const isIn = rec.direction === 'in';
    isSale = !isIn;
    const notes = rec.notes || '';
    partyName = (notes.match(/Pembeli:\s*([^·\r\n]+)/i) || notes.match(/Supplier:\s*([^·\r\n]+)/i) || [])[1]?.trim() || '';
    const qty = Number(rec.quantity) || 0;
    const unitPrice = isIn ? (Number(prod?.purchase_price) || 0) : (Number(prod?.selling_price) || 0);
    totalAmount = Math.round(qty * unitPrice);
    paidAmount = totalAmount;
    remainingAmount = 0;

    if (notes.includes('DP')) {
      const dpMatch = notes.match(/DP\s+(?:Rp\s*)?([\d.,]+)/i);
      const remMatch = notes.match(/(?:Sisa Tagihan|Sisa Piutang|Sisa Utang)[:\s]+(?:Rp\s*)?([\d.,]+)/i);
      if (dpMatch) paidAmount = Number(dpMatch[1].replace(/[.,]/g, '')) || 0;
      if (remMatch) remainingAmount = Number(remMatch[1].replace(/[.,]/g, '')) || 0;
      if (remainingAmount === 0 && totalAmount > paidAmount) {
        remainingAmount = Math.max(0, totalAmount - paidAmount);
      }
    } else if (notes.includes('Tempo') || notes.includes('Piutang') || notes.includes('Utang')) {
      paidAmount = 0;
      remainingAmount = totalAmount;
    }

    itemName = prod?.name || 'Produk';
    itemQtyText = `${formatQuantity(qty)} ${prod?.unit || 'unit'}`;
  } else if (targetType === 'cash') {
    rec = state.cash.find((c) => c.id === targetId);
    if (!rec) return;
    const isIncome = rec.direction === 'in';
    isSale = isIncome;
    const desc = rec.description || '';
    partyName = (desc.match(/Pembeli:\s*([^·\r\n]+)/i) || desc.match(/Supplier:\s*([^·\r\n]+)/i) || [])[1]?.trim() || '';
    paidAmount = Number(rec.amount) || 0;
    remainingAmount = 0;
    const remMatch = desc.match(/(?:Sisa Tagihan|Sisa Piutang|Sisa Utang)[:\s]+(?:Rp\s*)?([\d.,]+)/i);
    if (remMatch) {
      remainingAmount = Number(remMatch[1].replace(/[.,]/g, '')) || 0;
    }
    totalAmount = paidAmount + remainingAmount;

    const matchingInv = state.inventory.find((inv) => {
      if (inv.occurred_on !== rec.occurred_on) return false;
      if (isSale && inv.direction === 'out' && partyName && (inv.notes || '').includes(partyName)) return true;
      if (!isSale && inv.direction === 'in' && partyName && (inv.notes || '').includes(partyName)) return true;
      return false;
    });

    if (matchingInv) {
      const prod = state.products.find((p) => p.id === matchingInv.product_id) || matchingInv.products;
      itemName = prod?.name || 'Produk';
      itemQtyText = `${formatQuantity(matchingInv.quantity)} ${prod?.unit || 'unit'}`;
    } else {
      const itemMatch = desc.match(/(?:Penjualan|DP Penjualan|Belanja|DP Belanja)\s+([\d.,]+)\s+([a-zA-Z]+)\s+([^·\r\n(]+)/i);
      if (itemMatch) {
        itemQtyText = `${itemMatch[1]} ${itemMatch[2]}`;
        itemName = itemMatch[3].trim();
      } else {
        const parts = desc.split('·').map((p) => p.trim());
        itemName = parts[0] || rec.category;
        itemQtyText = '1 transaksi';
      }
    }
  }

  if (remainingAmount <= 0) {
    showError('Transaksi ini sudah lunas, tidak ada sisa tagihan.');
    return;
  }

  openDialog(`Pelunasan ${isSale ? 'Piutang Penjualan' : 'Utang Pembelian'}`, `
    <form id="settlement-form" class="form-stack">
      <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 12px 14px; font-size: 11px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <span style="color:#166534; font-weight:700;">${isSale ? 'Pelanggan / Pembeli:' : 'Supplier / Toko:'}</span>
          <strong style="font-size:13px; color:#14532d;">${escapeHtml(partyName || (isSale ? 'Pelanggan' : 'Supplier'))}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:#4b5563;">Rincian Barang:</span>
          <strong>${escapeHtml(itemName)} (${escapeHtml(itemQtyText)})</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:#4b5563;">Total Nilai Pesanan:</span>
          <span>${formatMoney(totalAmount)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:#15803d;">Sudah Dibayar (DP):</span>
          <strong style="color:#15803d;">${formatMoney(paidAmount)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; border-top:1px dashed #86efac; padding-top:6px; margin-top:5px;">
          <span style="color:#dc2626; font-weight:700;">Sisa Tagihan Belum Lunas:</span>
          <strong style="color:#dc2626; font-size:14px;">${formatMoney(remainingAmount)}</strong>
        </div>
      </div>

      <input type="hidden" name="target_type" value="${targetType}" />
      <input type="hidden" name="target_id" value="${escapeHtml(targetId)}" />

      <label>Jumlah Pembayaran Pelunasan (Rp) <span style="color:#dc2626;">*</span>
        <input name="settle_amount" id="settle-amount" type="number" min="1" max="${remainingAmount}" value="${remainingAmount}" required />
        <span class="sub-meta">Bisa melunasi penuh (${formatMoney(remainingAmount)}) atau membayar cicilan bertahap.</span>
      </label>

      <div class="form-row">
        <label>Tanggal Pembayaran
          <input name="settle_date" type="date" value="${localDate}" required />
        </label>
        <label>Pencatatan Kas
          <select name="sync_cash" required>
            <option value="yes">Catat Kas Masuk (+Rp)</option>
            <option value="no">Hanya Update Status Nota (Tanpa Kas)</option>
          </select>
        </label>
      </div>

      <label>Catatan Pembayaran / Kuitansi <span class="optional">(opsional)</span>
        <input name="settle_notes" maxlength="200" placeholder="Contoh: Transfer Bank BCA / Cash di kantor / Kuitansi #045" />
      </label>

      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="back-to-nota" data-type="${targetType}" data-id="${escapeHtml(targetId)}">Kembali</button>
        <button type="submit" class="button button-primary" style="background:#187554;">Simpan Pembayaran Pelunasan</button>
      </div>
    </form>
  `);

  document.querySelector('#settlement-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const settleAmount = Number(form.get('settle_amount')) || 0;
    const settleDate = form.get('settle_date') || localDate;
    const syncCash = form.get('sync_cash') === 'yes';
    const settleNotes = (form.get('settle_notes') || '').trim();

    if (settleAmount <= 0) {
      showError('Nominal pelunasan harus lebih dari Rp 0.');
      return;
    }

    const newRemaining = Math.max(0, remainingAmount - settleAmount);
    const isFullSettlement = newRemaining === 0;
    const newPaidAmount = paidAmount + settleAmount;

    let updatedNote = '';
    if (isFullSettlement) {
      updatedNote = isSale
        ? `[Penjualan Lunas - Dilunasi ${formatDate(settleDate)}]`
        : `[Beli Lunas - Dilunasi ${formatDate(settleDate)}]`;
    } else {
      updatedNote = isSale
        ? `[Penjualan DP ${formatMoney(newPaidAmount)} · Sisa Piutang ${formatMoney(newRemaining)}]`
        : `[Beli DP ${formatMoney(newPaidAmount)} · Sisa Utang ${formatMoney(newRemaining)}]`;
    }

    if (partyName) {
      updatedNote += ` ${isSale ? 'Pembeli' : 'Supplier'}: ${partyName}`;
    }
    if (settleNotes) {
      updatedNote += ` · ${settleNotes}`;
    }

    await runMutation(async () => {
      if (targetType === 'inventory') {
        const { error: invErr } = await db.from('inventory_movements').update({ notes: updatedNote }).eq('id', targetId);
        if (invErr) return invErr;
      } else if (targetType === 'cash') {
        const updatedCashDesc = isFullSettlement
          ? `${rec.category} (Lunas - Dilunasi ${formatDate(settleDate)}) · ${partyName ? `${isSale ? 'Pembeli' : 'Supplier'}: ${partyName}` : ''}${settleNotes ? ' · ' + settleNotes : ''}`
          : `${rec.category} (DP Diterima ${formatMoney(newPaidAmount)} · Sisa Tagihan: ${formatMoney(newRemaining)}) · ${partyName ? `${isSale ? 'Pembeli' : 'Supplier'}: ${partyName}` : ''}`;

        const { error: cashErr } = await db.from('cash_transactions').update({ description: updatedCashDesc }).eq('id', targetId);
        if (cashErr) return cashErr;

        const origInv = state.inventory.find((i) =>
          i.occurred_on === rec.occurred_on &&
          i.notes &&
          i.notes.includes(partyName || '')
        );
        if (origInv) {
          await db.from('inventory_movements').update({ notes: updatedNote }).eq('id', origInv.id);
        }
      }

      if (syncCash && settleAmount > 0) {
        const cashCategory = isSale ? 'Pelunasan Piutang Penjualan' : 'Pelunasan Utang Pembelian';
        const cashDesc = `Pelunasan ${isSale ? 'piutang penjualan' : 'utang pembelian'} ${itemName} (${itemQtyText}) · ${isSale ? 'Pembeli' : 'Supplier'}: ${partyName || 'Pelanggan'}${isFullSettlement ? ' (LUNAS)' : ` (Sisa Tagihan: ${formatMoney(newRemaining)})`}${settleNotes ? ` · ${settleNotes}` : ''}`;

        const cashPayload = {
          direction: isSale ? 'in' : 'out',
          amount: settleAmount,
          category: cashCategory,
          description: cashDesc,
          occurred_on: settleDate,
        };

        const { error: newCashErr } = await db.from('cash_transactions').insert(cashPayload);
        if (newCashErr) return newCashErr;
      }

      return null;
    }, isFullSettlement
      ? `Pelunasan berhasil! Tagihan ${partyName ? `atas nama ${partyName}` : ''} sebesar ${formatMoney(settleAmount)} telah LUNAS.`
      : `Pembayaran cicilan sebesar ${formatMoney(settleAmount)} berhasil dicatat (Sisa tagihan: ${formatMoney(newRemaining)}).`);

    await refreshData();
    window.dispatchEvent(new CustomEvent('app:rerender'));
    openReportDetailModal(targetType, targetId, state.selectedReportMonth || currentMonth);
  });
}

export function openStatDetailModal(statType) {
  const monthCash = monthRecords(state.cash, currentMonth);
  const monthInventory = monthRecords(state.inventory, currentMonth);
  const balance = cashBalance();
  const netMonthCash = cashBalance(monthCash);
  const monthIn = monthCash.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount), 0);
  const monthOut = monthCash.filter((r) => r.direction === 'out').reduce((sum, r) => sum + Number(r.amount), 0);
  const monthInCount = monthCash.filter((r) => r.direction === 'in').length;
  const monthOutCount = monthCash.filter((r) => r.direction === 'out').length;

  if (statType === 'cash-balance') {
    openDialog('Rincian Nilai Kas Perusahaan', `
      <div class="modal-stat-detail">
        <div class="report-kpi-strip" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin-bottom: 14px;">
          <div class="kpi-strip-item" style="border-left: 3px solid #187554;">
            <div class="kpi-label">Saldo Kas Saat Ini</div>
            <div class="kpi-val" style="font-size: 15px; color: #187554;">${formatMoney(balance)}</div>
            <div class="kpi-sub">Total kas riil tercatat</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #23855e;">
            <div class="kpi-label">Pemasukan Bulan Ini</div>
            <div class="kpi-val" style="font-size: 15px; color: #23855e;">+${formatMoney(monthIn)}</div>
            <div class="kpi-sub">${monthInCount} transaksi masuk</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #c93b2b;">
            <div class="kpi-label">Pengeluaran Bulan Ini</div>
            <div class="kpi-val" style="font-size: 15px; color: #c93b2b;">−${formatMoney(monthOut)}</div>
            <div class="kpi-sub">${monthOutCount} transaksi keluar</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid ${netMonthCash >= 0 ? '#187554' : '#c93b2b'};">
            <div class="kpi-label">Arus Kas Bersih</div>
            <div class="kpi-val" style="font-size: 15px; color: ${netMonthCash >= 0 ? '#187554' : '#c93b2b'};">${netMonthCash >= 0 ? '+' : '−'}${formatMoney(Math.abs(netMonthCash))}</div>
            <div class="kpi-sub">Bulan berjalan</div>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; color: #24312c; margin-bottom: 4px;">Riwayat Transaksi Kas Bulan Ini</h3>
          <p style="font-size: 11px; color: #62746b; margin-bottom: 8px;">Klik salah satu transaksi untuk melihat rincian nota & struk pembayaran.</p>
          ${monthCash.length ? movementTable(monthCash, 10) : emptyState('Belum ada transaksi kas bulan ini', 'Catat transaksi pemasukan atau pengeluaran untuk mulai.')}
        </div>

        <div class="dialog-actions">
          <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
          <button type="button" class="button button-outline" data-action="add-cash"><span>＋</span> Catat Transaksi</button>
          <button type="button" class="button button-primary" data-page="cash" data-action="close-dialog">Buka Menu Keuangan →</button>
        </div>
      </div>
    `);
  } else if (statType === 'products') {
    const inStockCount = state.products.filter((p) => stockFor(p.id) > 0).length;
    const outOfStockCount = state.products.filter((p) => stockFor(p.id) <= 0).length;
    const totalAssetHpp = state.products.reduce((sum, p) => {
      const stock = Math.max(0, stockFor(p.id));
      return sum + Math.round(stock * (Number(p.purchase_price) || 0));
    }, 0);

    openDialog('Daftar & Rincian Jenis Produk Perusahaan', `
      <div class="modal-stat-detail">
        <div class="report-kpi-strip" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin-bottom: 14px;">
          <div class="kpi-strip-item" style="border-left: 3px solid #2563eb;">
            <div class="kpi-label">Total Jenis Produk</div>
            <div class="kpi-val" style="font-size: 15px; color: #2563eb;">${state.products.length} Jenis</div>
            <div class="kpi-sub">Katalog produk aktif</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #187554;">
            <div class="kpi-label">Stok Tersedia</div>
            <div class="kpi-val" style="font-size: 15px; color: #187554;">${inStockCount} Produk</div>
            <div class="kpi-sub">Stok di atas 0</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #ea580c;">
            <div class="kpi-label">Stok Habis / Kosong</div>
            <div class="kpi-val" style="font-size: 15px; color: #ea580c;">${outOfStockCount} Produk</div>
            <div class="kpi-sub">Perlu restock/produksi</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #7c3aed;">
            <div class="kpi-label">Total Nilai Aset Stok</div>
            <div class="kpi-val" style="font-size: 15px; color: #7c3aed;">${formatMoney(totalAssetHpp)}</div>
            <div class="kpi-sub">Estimasi modal HPP</div>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; color: #24312c; margin-bottom: 4px;">Daftar Seluruh Jenis Produk Perusahaan (${state.products.length} Produk)</h3>
          <p style="font-size: 11px; color: #62746b; margin-bottom: 8px;">Berikut rincian jenis produk, stok fisik saat ini, serta harga modal dan jual.</p>
          <div class="table-wrap" style="max-height: 280px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>NAMA PRODUK</th>
                  <th>SKU</th>
                  <th>STOK FISIK</th>
                  <th>HARGA BELI</th>
                  <th>HARGA JUAL</th>
                  <th class="align-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                ${state.products.length ? state.products.map((p) => {
                  const s = stockFor(p.id);
                  const isZero = s <= 0;
                  return `<tr>
                    <td class="detail-cell">
                      <strong>${escapeHtml(p.name)}</strong>
                    </td>
                    <td><small style="color:#64748b;">${escapeHtml(p.sku || '—')}</small></td>
                    <td>
                      <strong style="color:${isZero ? '#dc2626' : '#187554'}; font-size:12px;">
                        ${formatQuantity(s)} ${escapeHtml(p.unit || 'unit')}
                      </strong>
                      ${isZero ? '<span style="font-size:8px; background:#fee2e2; color:#b91c1c; padding:1px 4px; border-radius:3px; margin-left:3px;">Habis</span>' : ''}
                    </td>
                    <td>${formatMoney(p.purchase_price || 0)}</td>
                    <td><strong style="color:#187554;">${formatMoney(p.selling_price || 0)}</strong></td>
                    <td class="align-right">
                      <button type="button" class="button button-small button-outline" data-action="product-movement" data-id="${escapeHtml(p.id)}" style="font-size:10px; padding:2px 7px;">
                        ± Gerak
                      </button>
                    </td>
                  </tr>`;
                }).join('') : `<tr><td colspan="6" style="text-align:center; padding:16px; color:#888;">Belum ada produk terdaftar.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="dialog-actions">
          <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
          <button type="button" class="button button-outline" data-action="add-product"><span>＋</span> Tambah Produk</button>
          <button type="button" class="button button-primary" data-page="products" data-action="close-dialog">Buka Menu Produk →</button>
        </div>
      </div>
    `);
  } else if (statType === 'inventory-movements') {
    const invInCount = monthInventory.filter((i) => i.direction === 'in').length;
    const invOutCount = monthInventory.filter((i) => i.direction === 'out').length;
    const prodInCount = monthInventory.filter((i) => i.direction === 'in' && (i.notes || '').includes('Hasil Produksi')).length;

    openDialog('Riwayat Pergerakan Barang (Stok Masuk & Keluar)', `
      <div class="modal-stat-detail">
        <div class="report-kpi-strip" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin-bottom: 14px;">
          <div class="kpi-strip-item" style="border-left: 3px solid #ea580c;">
            <div class="kpi-label">Pergerakan Bulan Ini</div>
            <div class="kpi-val" style="font-size: 15px; color: #ea580c;">${monthInventory.length} Catatan</div>
            <div class="kpi-sub">Total mutasi gudang</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #187554;">
            <div class="kpi-label">Stok Masuk</div>
            <div class="kpi-val" style="font-size: 15px; color: #187554;">${invInCount} Kali</div>
            <div class="kpi-sub">Produksi & belanja</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #0284c7;">
            <div class="kpi-label">Stok Keluar</div>
            <div class="kpi-val" style="font-size: 15px; color: #0284c7;">${invOutCount} Kali</div>
            <div class="kpi-sub">Penjualan & pemakaian</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #16a34a;">
            <div class="kpi-label">Hasil Produksi Pabrik</div>
            <div class="kpi-val" style="font-size: 15px; color: #16a34a;">${prodInCount} Kali</div>
            <div class="kpi-sub">Barang jadi mandiri</div>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; color: #24312c; margin-bottom: 4px;">Riwayat Mutasi Barang Bulan Ini</h3>
          <p style="font-size: 11px; color: #62746b; margin-bottom: 8px;">Klik salah satu mutasi di bawah untuk melihat rincian nota / surat jalan barang.</p>
          ${monthInventory.length ? movementTable(monthInventory, 10) : emptyState('Belum ada pergerakan barang bulan ini', 'Catat barang masuk atau keluar untuk mulai.')}
        </div>

        <div class="dialog-actions">
          <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
          <button type="button" class="button button-outline" data-action="add-production" style="display:inline-flex; align-items:center; gap:5px; color:#187554;"><span>${Icons.factory('icon-svg', 13)}</span> Hasil Produksi</button>
          <button type="button" class="button button-outline" data-action="add-inventory" style="display:inline-flex; align-items:center; gap:5px;"><span>${Icons.plus('icon-svg', 13)}</span> Catat Pergerakan</button>
          <button type="button" class="button button-primary" data-page="inventory" data-action="close-dialog">Buka Menu Persediaan →</button>
        </div>
      </div>
    `);
  } else if (statType === 'cash-transactions') {
    openDialog('Riwayat Transaksi Kas Perusahaan', `
      <div class="modal-stat-detail">
        <div class="report-kpi-strip" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin-bottom: 14px;">
          <div class="kpi-strip-item" style="border-left: 3px solid #7c3aed;">
            <div class="kpi-label">Transaksi Bulan Ini</div>
            <div class="kpi-val" style="font-size: 15px; color: #7c3aed;">${monthCash.length} Transaksi</div>
            <div class="kpi-sub">Arus kas tercatat</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #187554;">
            <div class="kpi-label">Total Uang Masuk</div>
            <div class="kpi-val" style="font-size: 15px; color: #187554;">+${formatMoney(monthIn)}</div>
            <div class="kpi-sub">${monthInCount} transaksi penjualan/kas</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #c93b2b;">
            <div class="kpi-label">Total Uang Keluar</div>
            <div class="kpi-val" style="font-size: 15px; color: #c93b2b;">−${formatMoney(monthOut)}</div>
            <div class="kpi-sub">${monthOutCount} transaksi belanja/biaya</div>
          </div>
          <div class="kpi-strip-item" style="border-left: 3px solid #0284c7;">
            <div class="kpi-label">Saldo Kas Saat Ini</div>
            <div class="kpi-val" style="font-size: 15px; color: #0284c7;">${formatMoney(balance)}</div>
            <div class="kpi-sub">Posisi kas keseluruhan</div>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <h3 style="font-size: 13px; font-weight: 700; color: #24312c; margin-bottom: 4px;">Riwayat Seluruh Transaksi Kas Bulan Ini</h3>
          <p style="font-size: 11px; color: #62746b; margin-bottom: 8px;">Klik transaksi kas di bawah untuk membuka nota kuitansi / rincian bukti kas.</p>
          ${monthCash.length ? movementTable(monthCash, 10) : emptyState('Belum ada transaksi kas bulan ini', 'Catat transaksi pemasukan atau pengeluaran untuk mulai.')}
        </div>

        <div class="dialog-actions">
          <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
          <button type="button" class="button button-outline" data-action="add-cash"><span>＋</span> Catat Transaksi</button>
          <button type="button" class="button button-primary" data-page="cash" data-action="close-dialog">Buka Menu Keuangan →</button>
        </div>
      </div>
    `);
  }
}
