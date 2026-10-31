import { state, currentMonth, quantityFormat } from '../../store/state.js';
import { heading, statCard } from '../../components/Header.js';
import { emptyState } from '../../components/Table.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { formatMoney, formatQuantity, formatDate, monthRecords, monthEnd } from '../../utils/formatters.js';
import { calculateMonthlySalary } from '../payroll/salaryCalc.js';
import { Icons } from '../../components/Icons.js';

export function categorizeExpense(record) {
  const cat = (record.category || '').toLowerCase();
  const desc = (record.description || '').toLowerCase();
  if (cat.includes('bahan') || cat.includes('material') || cat.includes('belanja') || desc.includes('corrugated') || desc.includes('kardus') || desc.includes('karton') || desc.includes('lem') || desc.includes('lakban') || desc.includes('plastik')) {
    return { group: 'Bahan Baku & Material (HPP)', iconSvg: Icons.box('icon-svg', 14), role: 'Harga Pokok Penjualan (HPP)', color: '#b91c1c', desc: 'Pengadaan lembaran karton corrugated, lem perekat, lakban, & material produksi' };
  }
  if (cat.includes('gaji') || cat.includes('upah') || desc.includes('gaji') || desc.includes('upah') || desc.includes('karyawan') || desc.includes('pekerja')) {
    return { group: 'Gaji & Upah Karyawan', iconSvg: Icons.users('icon-svg', 14), role: 'Beban Gaji & Upah (Operasional)', color: '#7e22ce', desc: 'Upah pokok harian, jam lembur kerja, & insentif target produksi' };
  }
  if (cat.includes('listrik') || cat.includes('utilitas') || cat.includes('pln') || cat.includes('air') || desc.includes('listrik') || desc.includes('pln') || desc.includes('utilitas') || desc.includes('air') || desc.includes('internet')) {
    return { group: 'Utilitas & Listrik Pabrik', iconSvg: Icons.zap('icon-svg', 14), role: 'Beban Utilitas Fasilitas (Operasional)', color: '#b45309', desc: 'Daya listrik mesin cetak/potong, penerangan workshop, air PDAM & fasilitas pabrik' };
  }
  if (cat.includes('rawat') || cat.includes('mesin') || cat.includes('alat') || cat.includes('perbaikan') || desc.includes('mesin') || desc.includes('sparepart') || desc.includes('pisau') || desc.includes('oli') || desc.includes('servis')) {
    return { group: 'Pemeliharaan Alat & Mesin', iconSvg: Icons.wrench('icon-svg', 14), role: 'Beban Perawatan Mesin (Operasional)', color: '#0369a1', desc: 'Servis berkala mesin cetak flexo, ganti pisau potong, dan oli mesin' };
  }
  if (cat.includes('transport') || cat.includes('antar') || cat.includes('kirim') || cat.includes('bensin') || cat.includes('solar') || desc.includes('bensin') || desc.includes('solar') || desc.includes('ongkir') || desc.includes('armada') || desc.includes('tol')) {
    return { group: 'Transportasi & Logistik', iconSvg: Icons.truck('icon-svg', 14), role: 'Beban Logistik & Armada (Operasional)', color: '#0f766e', desc: 'Bahan bakar armada pick-up kirim barang jadi, tarif tol, dan ekspedisi' };
  }
  return { group: record.category || 'Operasional Lainnya', iconSvg: Icons.pallet('icon-svg', 14), role: 'Beban Operasional Usaha', color: '#475569', desc: 'Konsumsi kerja, perlengkapan safety kerja, ATK kantor, & keperluan umum' };
}

export function renderReports(month = currentMonth) {
  const selectedMonth = (typeof month === 'string' && month) ? month : (state.selectedReportMonth || currentMonth);
  state.selectedReportMonth = selectedMonth;
  let currentFilter = state.selectedReportFilter || 'all';
  if (currentFilter === 'expense') currentFilter = 'expenses';

  const inventory = monthRecords(state.inventory, selectedMonth);
  const cash = monthRecords(state.cash, selectedMonth);

  const activeEmployees = state.employees.filter((emp) => emp.is_active);
  const monthlyCalcs = activeEmployees.map((emp) => ({
    employee: emp,
    calc: calculateMonthlySalary(emp, selectedMonth),
  }));

  const totalPayroll = monthlyCalcs.reduce((sum, item) => sum + item.calc.totalSalary, 0);
  const totalPayrollBase = monthlyCalcs.reduce((sum, item) => sum + item.calc.baseSalary, 0);
  const totalPayrollOvertime = monthlyCalcs.reduce((sum, item) => sum + item.calc.overtimeAmount, 0);
  const totalPayrollIncentive = monthlyCalcs.reduce((sum, item) => sum + item.calc.incentiveAmount, 0);
  const totalOvertimeHours = monthlyCalcs.reduce((sum, item) => sum + item.calc.totalOvertimeHours, 0);
  const paidCount = monthlyCalcs.filter((item) => item.calc.isPaid).length;
  const pendingCount = monthlyCalcs.filter((item) => !item.calc.isPaid).length;

  const incomeRecords = cash.filter((row) => row.direction === 'in');
  const totalIn = incomeRecords.reduce((sum, row) => sum + Number(row.amount), 0);

  const expenseRecords = cash.filter((row) => row.direction === 'out');
  const totalOut = expenseRecords.reduce((sum, row) => sum + Number(row.amount), 0);

  const totalQtyIn = inventory.filter((inv) => inv.direction === 'in').reduce((sum, inv) => sum + Number(inv.quantity), 0);
  const totalQtyOut = inventory.filter((inv) => inv.direction === 'out').reduce((sum, inv) => sum + Number(inv.quantity), 0);

  const cogsRecords = expenseRecords.filter((row) => {
    const cat = (row.category || '').toLowerCase();
    return cat.includes('bahan') || cat.includes('material') || cat.includes('belanja');
  });
  const cogsCash = cogsRecords.reduce((sum, row) => sum + Number(row.amount), 0);
  const inventoryHpp = inventory.filter((inv) => inv.direction === 'out').reduce((sum, inv) => {
    const prod = state.products.find((p) => p.id === inv.product_id);
    return sum + (Number(inv.quantity) * (Number(prod?.purchase_price) || 0));
  }, 0);
  const totalCogs = cogsCash > 0 ? cogsCash : inventoryHpp;

  const grossProfit = totalIn - totalCogs;
  const grossMargin = totalIn > 0 ? ((grossProfit / totalIn) * 100).toFixed(1) : '0';

  const operationalCashRecords = expenseRecords.filter((row) => {
    const cat = (row.category || '').toLowerCase();
    return !cat.includes('bahan') && !cat.includes('material') && !cat.includes('belanja') && !cat.includes('gaji') && !cat.includes('upah');
  });
  const operationalCash = operationalCashRecords.reduce((sum, row) => sum + Number(row.amount), 0);
  const totalOperatingExpense = operationalCash + totalPayroll;

  const netProfit = grossProfit - totalOperatingExpense;
  const netMargin = totalIn > 0 ? ((netProfit / totalIn) * 100).toFixed(1) : '0';

  const expenseCategories = {};
  for (const exp of expenseRecords) {
    const info = categorizeExpense(exp);
    const key = info.group;
    if (!expenseCategories[key]) {
      expenseCategories[key] = {
        name: key,
        iconSvg: info.iconSvg,
        role: info.role,
        desc: info.desc,
        color: info.color,
        amount: 0,
        count: 0,
        items: [],
      };
    }
    const amt = Number(exp.amount) || 0;
    expenseCategories[key].amount += amt;
    expenseCategories[key].count += 1;
    expenseCategories[key].items.push(exp);
  }

  const hasCashPayroll = expenseRecords.some((r) => (r.category || '').toLowerCase().includes('gaji') || (r.category || '').toLowerCase().includes('upah'));
  if (state.isAdmin && totalPayroll > 0 && !hasCashPayroll) {
    expenseCategories['Gaji & Upah Karyawan (Akumulasi)'] = {
      name: 'Gaji & Upah Karyawan (Akumulasi Bulanan)',
      iconSvg: Icons.users('icon-svg', 14),
      role: 'Beban Gaji & Upah (Operasional)',
      desc: `Total akumulasi upah ${activeEmployees.length} pekerja (${formatQuantity(totalOvertimeHours)} jam lembur)`,
      color: '#7e22ce',
      amount: totalPayroll,
      count: activeEmployees.length,
      items: [],
      isVirtualPayroll: true,
    };
  }

  const categoryList = Object.values(expenseCategories).sort((a, b) => b.amount - a.amount);
  const totalCombinedExpenses = categoryList.reduce((sum, c) => sum + c.amount, 0) || totalOut;

  const reportViewTabs = [
    { key: 'all', iconSvg: Icons.reports('icon-svg', 14), label: 'Ringkasan Semua', badge: `${cash.length + inventory.length + (state.isAdmin ? monthlyCalcs.length : 0)}` },
    { key: 'gross_profit', iconSvg: Icons.trendingUp('icon-svg', 14), label: 'Laba Kotor', badge: formatMoney(grossProfit) },
    { key: 'net_profit', iconSvg: Icons.cash('icon-svg', 14), label: 'Laba Bersih', badge: formatMoney(netProfit) },
    { key: 'expenses', iconSvg: Icons.receipt('icon-svg', 14), label: 'Rincian Pengeluaran', badge: formatMoney(totalCombinedExpenses) },
    { key: 'income', iconSvg: Icons.arrowIn('icon-svg', 14), label: 'Omzet Penjualan', badge: formatMoney(totalIn) },
    ...(state.isAdmin ? [{ key: 'payroll', iconSvg: Icons.users('icon-svg', 14), label: 'Beban Gaji', badge: formatMoney(totalPayroll) }] : []),
    { key: 'inventory', iconSvg: Icons.inventory('icon-svg', 14), label: 'Persediaan Barang', badge: `${inventory.length}` },
  ];

  const filterTabs = [
    { key: 'all', label: 'Semua Catatan', count: inventory.length + cash.length + (state.isAdmin ? monthlyCalcs.length : 0) },
    { key: 'gross_profit', label: 'Laba Kotor', count: incomeRecords.length + cogsRecords.length },
    { key: 'net_profit', label: 'Laba Bersih', count: cash.length + (state.isAdmin ? monthlyCalcs.length : 0) },
    { key: 'expenses', label: 'Pengeluaran Kas', count: expenseRecords.length },
    { key: 'income', label: 'Omzet Penjualan', count: incomeRecords.length },
    { key: 'cogs', label: 'HPP Bahan Baku', count: cogsRecords.length },
    { key: 'operational', label: 'Beban Operasional', count: operationalCashRecords.length },
    ...(state.isAdmin ? [{ key: 'payroll', label: 'Gaji & Lembur', count: monthlyCalcs.length }] : []),
    { key: 'inventory', label: 'Persediaan Barang', count: inventory.length },
  ];

  let filteredItems = [];
  if (currentFilter === 'income') {
    filteredItems = incomeRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: 'Pendapatan (Omzet)' }));
  } else if (currentFilter === 'expenses' || currentFilter === 'expense') {
    filteredItems = expenseRecords.map((r) => {
      const catInfo = categorizeExpense(r);
      return { ...r, itemType: 'cash', financialCategory: catInfo.group };
    });
  } else if (currentFilter === 'cogs') {
    filteredItems = cogsRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: 'HPP / Bahan Baku' }));
  } else if (currentFilter === 'gross_profit') {
    filteredItems = [
      ...incomeRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: 'Pendapatan (Omzet)' })),
      ...cogsRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: 'HPP / Bahan Baku' })),
    ];
  } else if (currentFilter === 'operational') {
    filteredItems = operationalCashRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: 'Beban Operasional Usaha' }));
  } else if (currentFilter === 'net_profit') {
    filteredItems = [
      ...incomeRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: 'Pendapatan (Omzet)' })),
      ...expenseRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: (r.category || '').toLowerCase().includes('bahan') ? 'HPP / Bahan Baku' : 'Beban Operasional' })),
      ...monthlyCalcs.map(({ employee: emp, calc }) => ({
        id: emp.id,
        occurred_on: monthEnd(selectedMonth),
        itemType: 'payroll',
        financialCategory: 'Beban Gaji & Upah',
        title: `${emp.full_name} (${emp.position})`,
        direction: 'out',
        amount: calc.totalSalary,
        detail: `${calc.effectiveDays} hr kerja, ${formatQuantity(calc.totalOvertimeHours)} jam lembur, ${formatQuantity(calc.totalProduction)} unit`,
        notes: `Pokok: ${formatMoney(calc.baseSalary)} · Lembur: ${formatMoney(calc.overtimeAmount)} · Insentif: ${formatMoney(calc.incentiveAmount)}`,
        isPaid: calc.isPaid,
      })),
    ];
  } else if (currentFilter === 'payroll') {
    filteredItems = monthlyCalcs.map(({ employee: emp, calc }) => ({
      id: emp.id,
      occurred_on: monthEnd(selectedMonth),
      itemType: 'payroll',
      financialCategory: 'Beban Gaji & Upah',
      title: `${emp.full_name} (${emp.position})`,
      direction: 'out',
      amount: calc.totalSalary,
      detail: `${calc.effectiveDays} hr kerja, ${formatQuantity(calc.totalOvertimeHours)} jam lembur, ${formatQuantity(calc.totalProduction)} unit produksi`,
      notes: `Pokok: ${formatMoney(calc.baseSalary)} · Lembur: ${formatMoney(calc.overtimeAmount)} · Insentif: ${formatMoney(calc.incentiveAmount)}`,
      isPaid: calc.isPaid,
    }));
  } else if (currentFilter === 'inventory') {
    filteredItems = inventory.map((r) => ({ ...r, itemType: 'inventory', financialCategory: 'Persediaan Barang' }));
  } else {
    filteredItems = [
      ...cash.map((r) => ({ ...r, itemType: 'cash', financialCategory: r.direction === 'in' ? 'Pendapatan' : ((r.category || '').toLowerCase().includes('bahan') ? 'HPP / Bahan Baku' : 'Beban Operasional') })),
      ...inventory.map((r) => ({ ...r, itemType: 'inventory', financialCategory: 'Persediaan Barang' })),
      ...monthlyCalcs.map(({ employee: emp, calc }) => ({
        id: emp.id,
        occurred_on: monthEnd(selectedMonth),
        itemType: 'payroll',
        financialCategory: 'Beban Gaji & Upah',
        title: `${emp.full_name} (${emp.position})`,
        direction: 'out',
        amount: calc.totalSalary,
        detail: `${calc.effectiveDays} hr kerja, ${formatQuantity(calc.totalOvertimeHours)} jam lembur, ${formatQuantity(calc.totalProduction)} unit`,
        notes: `Pokok: ${formatMoney(calc.baseSalary)} · Lembur: ${formatMoney(calc.overtimeAmount)} · Insentif: ${formatMoney(calc.incentiveAmount)}`,
        isPaid: calc.isPaid,
      })),
    ];
  }

  filteredItems.sort((a, b) => String(b?.occurred_on || '').localeCompare(String(a?.occurred_on || '')));

  const headingHtml = heading(
    'ANALISIS & KEUANGAN',
    'Laporan Finansial Bulanan',
    'Ringkasan kinerja pendapatan omzet, beban pokok (HPP), beban operasional, dan laba bersih perusahaan.',
    `
    <div style="display: flex; align-items: center; gap: 8px;">
      <label class="month-label" for="report-month">Periode</label>
      <input class="month-input" id="report-month" type="month" value="${escapeHtml(selectedMonth)}" />
      <button class="button button-primary" data-action="download-report" data-month="${escapeHtml(selectedMonth)}" title="Unduh laporan bulanan format Excel">
        ${Icons.download('icon-svg', 15)}
        <span>Unduh Excel</span>
      </button>
    </div>
    `
  );

  const tableRows = filteredItems.length ? `
    <div class="table-responsive">
      <table class="table table-bordered table-hover table-striped">
        <thead>
          <tr>
            <th style="width: 45px;" class="align-center">NO</th>
            <th>TANGGAL</th>
            <th>POS / KATEGORI</th>
            <th>${currentFilter === 'expenses' ? 'KEPERLUAN PENGELUARAN DANA' : 'RINCIAN TRANSAKSI'}</th>
            <th>KLASIFIKASI</th>
            <th>ARAH</th>
            <th class="align-right">NOMINAL / UNIT</th>
            <th style="width: 70px;" class="align-center">OPSI</th>
          </tr>
        </thead>
        <tbody>
          ${filteredItems.map((item, idx) => {
            if (item.itemType === 'payroll') {
              return `
                <tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="payroll" title="Klik untuk melihat slip gaji pekerja">
                  <td class="align-center">${idx + 1}</td>
                  <td class="date-cell">${formatDate(item.occurred_on)}</td>
                  <td><strong>Gaji & Upah</strong></td>
                  <td>${escapeHtml(item.title)}<br /><small style="color:#777;">${escapeHtml(item.detail)}</small></td>
                  <td><span class="status-pill status-pending" style="font-size: 10px;">Beban Gaji</span></td>
                  <td><span class="direction-pill pill-out">Keluar</span></td>
                  <td class="align-right amount-cell" style="font-weight: 700; color: #dd4b39;">−${formatMoney(item.amount)}</td>
                  <td class="align-center">
                    <button type="button" class="btn btn-info btn-xs" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="payroll" title="Pratinjau slip gaji">
                      ${Icons.eye('icon-svg', 11)} Slip
                    </button>
                  </td>
                </tr>
              `;
            }
            if (item.itemType === 'inventory') {
              const prod = item.products || state.products.find((p) => p.id === item.product_id);
              const isIn = item.direction === 'in';
              const notes = item.notes || '';
              const isProd = isIn && (notes.includes('Hasil Produksi') || notes.toLowerCase().includes('produksi'));
              const isUsg = !isIn && (notes.includes('Pemakaian') || notes.toLowerCase().includes('internal') || notes.toLowerCase().includes('reject'));

              let pillLabel = isIn ? 'Masuk' : 'Keluar';
              let statusLabel = `Stok ${isIn ? 'Masuk' : 'Keluar'}`;
              let statusPillClass = isIn ? 'status-paid' : 'status-danger';

              if (isProd) {
                pillLabel = 'Produksi';
                statusLabel = 'Hasil Produksi';
                statusPillClass = 'status-paid';
              } else if (isUsg) {
                pillLabel = 'Pemakaian';
                statusLabel = 'Pemakaian/Reject';
                statusPillClass = 'status-pending';
              }

              return `
                <tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="inventory" title="Klik untuk melihat detail pergerakan barang">
                  <td class="align-center">${idx + 1}</td>
                  <td class="date-cell">${formatDate(item.occurred_on)}</td>
                  <td><strong>Persediaan</strong></td>
                  <td>${escapeHtml(prod?.name || 'Produk')}${item.notes ? `<br /><small style="color:#777;">${escapeHtml(item.notes)}</small>` : ''}</td>
                  <td><span class="status-pill ${statusPillClass}" style="font-size: 10px;">${statusLabel}</span></td>
                  <td><span class="direction-pill ${isIn ? 'pill-in' : 'pill-out'}"><span>${pillLabel}</span></span></td>
                  <td class="align-right amount-cell" style="font-weight: 600;">${isIn ? '+' : '−'}${formatQuantity(item.quantity)} ${escapeHtml(prod?.unit || 'unit')}</td>
                  <td class="align-center">
                    <button type="button" class="btn btn-info btn-xs" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="inventory" title="Pratinjau mutasi barang">
                      ${Icons.eye('icon-svg', 11)} Nota
                    </button>
                  </td>
                </tr>
              `;
            }
            // Cash item
            const isIncome = item.direction === 'in';
            return `
              <tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="cash" title="Klik untuk melihat detail transaksi kas">
                <td class="align-center">${idx + 1}</td>
                <td class="date-cell">${formatDate(item.occurred_on)}</td>
                <td><strong>${escapeHtml(item.category)}</strong></td>
                <td>
                  <strong>${escapeHtml(item.description || item.category)}</strong>
                  ${currentFilter === 'expenses' ? `<br /><small style="color:#777;">${escapeHtml(item.financialCategory || 'Operasional Pabrik')}</small>` : ''}
                </td>
                <td><span class="status-pill ${isIncome ? 'status-paid' : 'status-pending'}" style="font-size: 10px;">${escapeHtml(item.financialCategory || 'Kas')}</span></td>
                <td><span class="direction-pill ${isIncome ? 'pill-in' : 'pill-out'}"><span>${isIncome ? 'Masuk' : 'Keluar'}</span></span></td>
                <td class="align-right amount-cell" style="font-weight: 700; color: ${isIncome ? '#00a65a' : '#dd4b39'};">${isIncome ? '+' : '−'}${formatMoney(item.amount)}</td>
                <td class="align-center">
                  <button type="button" class="btn btn-info btn-xs" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="cash" title="Pratinjau nota transaksi">
                    ${Icons.eye('icon-svg', 11)} Nota
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : emptyState('Tidak Ada Catatan Finansial', 'Belum ada transaksi operasional yang tercatat untuk kelompok ini pada periode terpilih.');

  let specificGroupHtml = '';

  if (currentFilter === 'gross_profit') {
    specificGroupHtml = `
      <div class="report-group-header">
        <div class="report-group-title">
          <h2>Analisis Laba Kotor (Gross Profit)</h2>
          <p>Pendapatan omzet penjualan produk dikurangi harga pokok penjualan (HPP pengadaan bahan baku).</p>
        </div>
        <span class="report-group-tag">Margin Kotor: ${grossMargin}%</span>
      </div>
      <div class="equation-bar">
        <div class="equation-segment">
          <span class="label">(+) Omzet Penjualan Produk</span>
          <span class="value" style="color: var(--success);">+${formatMoney(totalIn)}</span>
        </div>
        <span class="equation-op">−</span>
        <div class="equation-segment">
          <span class="label">(−) HPP Bahan Baku</span>
          <span class="value" style="color: var(--danger);">−${formatMoney(totalCogs)}</span>
        </div>
        <span class="equation-op">=</span>
        <div class="equation-segment is-result">
          <span class="label">Laba Kotor</span>
          <span class="value">${formatMoney(grossProfit)}</span>
        </div>
      </div>
      <div class="report-kpi-strip">
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Omzet Penjualan</div>
          <div class="kpi-val" style="color: var(--success);">${formatMoney(totalIn)}</div>
          <div class="kpi-sub">${incomeRecords.length} transaksi penjualan</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">HPP / Belanja Bahan Baku</div>
          <div class="kpi-val" style="color: var(--danger);">${formatMoney(totalCogs)}</div>
          <div class="kpi-sub">${cogsRecords.length} pengadaan bahan</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Laba Kotor (Gross Profit)</div>
          <div class="kpi-val">${formatMoney(grossProfit)}</div>
          <div class="kpi-sub">Selisih penjualan terhadap modal bahan</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Persentase Margin Kotor</div>
          <div class="kpi-val">${grossMargin}%</div>
          <div class="kpi-sub">Efisiensi harga jual terhadap HPP bahan</div>
        </div>
      </div>
    `;
  } else if (currentFilter === 'net_profit') {
    specificGroupHtml = `
      <div class="report-group-header">
        <div class="report-group-title">
          <h2>Analisis Laba Bersih Operasional</h2>
          <p>Keuntungan bersih usaha setelah memperhitungkan seluruh beban pokok, biaya fasilitas, dan upah tenaga kerja.</p>
        </div>
        <span class="report-group-tag" style="background: ${netProfit >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">
          ${netProfit >= 0 ? 'Surplus (Profit)' : 'Defisit (Rugi)'} · Margin Bersih: ${netMargin}%
        </span>
      </div>
      <div class="equation-bar">
        <div class="equation-segment">
          <span class="label">Laba Kotor</span>
          <span class="value">${formatMoney(grossProfit)}</span>
        </div>
        <span class="equation-op">−</span>
        <div class="equation-segment">
          <span class="label">(−) Beban Operasional Lain</span>
          <span class="value" style="color: var(--danger);">−${formatMoney(operationalCash)}</span>
        </div>
        <span class="equation-op">−</span>
        <div class="equation-segment">
          <span class="label">(−) Beban Gaji & Lembur</span>
          <span class="value" style="color: var(--danger);">−${formatMoney(totalPayroll)}</span>
        </div>
        <span class="equation-op">=</span>
        <div class="equation-segment is-result" style="background: ${netProfit >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)'};">
          <span class="label" style="color: ${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">Laba Bersih</span>
          <span class="value" style="color: ${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatMoney(netProfit)}</span>
        </div>
      </div>
      <div class="report-kpi-strip">
        <div class="kpi-strip-item">
          <div class="kpi-label">Laba Kotor</div>
          <div class="kpi-val">${formatMoney(grossProfit)}</div>
          <div class="kpi-sub">Omzet dikurangi HPP bahan</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Beban Operasional Pabrik</div>
          <div class="kpi-val" style="color: var(--danger);">${formatMoney(operationalCash)}</div>
          <div class="kpi-sub">Listrik, perawatan mesin, dll.</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Beban Gaji & Lembur</div>
          <div class="kpi-val" style="color: var(--warning);">${formatMoney(totalPayroll)}</div>
          <div class="kpi-sub">${activeEmployees.length} pekerja (${formatQuantity(totalOvertimeHours)} jam lembur)</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Laba Bersih (Net Profit)</div>
          <div class="kpi-val" style="color: ${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 800;">${formatMoney(netProfit)}</div>
          <div class="kpi-sub">${netProfit >= 0 ? 'Surplus operasional' : 'Defisit melebihi omzet'}</div>
        </div>
      </div>
    `;
  } else if (currentFilter === 'expenses') {
    specificGroupHtml = `
      <div class="report-group-header">
        <div class="report-group-title">
          <h2>Rincian Pengeluaran Kas Operasional</h2>
          <p>Pemetaan terperinci seluruh uang keluar berdasarkan peruntukan dan pos kebutuhan pabrik.</p>
        </div>
        <span class="report-group-tag">Total Kas Keluar: ${formatMoney(totalOut)}</span>
      </div>
      <div class="category-breakdown-grid">
        ${categoryList.map((cat) => {
          const share = totalCombinedExpenses > 0 ? ((cat.amount / totalCombinedExpenses) * 100).toFixed(1) : '0';
          return `
            <div class="category-breakdown-card">
              <div class="cat-top">
                <span class="cat-name">${cat.iconSvg} ${escapeHtml(cat.name)}</span>
                <span class="cat-share">${share}%</span>
              </div>
              <div class="cat-amount">−${formatMoney(cat.amount)}</div>
              <div class="cat-desc">${cat.count} transaksi · ${escapeHtml(cat.desc)}</div>
              <div class="cat-bar-wrap">
                <div class="cat-bar-fill" style="width: ${Math.min(100, Math.round(Number(share)))}%; background: ${cat.color};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    specificGroupHtml = `
      <section class="stats-grid">
        ${statCard('Laba Bersih Operasional', formatMoney(netProfit), `Margin: ${netMargin}% (Setelah beban & gaji)`, netProfit >= 0 ? Icons.trendingUp('icon-svg', 18) : Icons.trendingDown('icon-svg', 18), netProfit >= 0 ? 'icon-green' : 'icon-orange', { filter: 'net_profit', hint: 'Buka analisis Laba Bersih' })}
        ${statCard('Laba Kotor (Gross Profit)', formatMoney(grossProfit), `Margin: ${grossMargin}% (Omzet − HPP)`, Icons.trendingUp('icon-svg', 18), 'icon-blue', { filter: 'gross_profit', hint: 'Buka analisis Laba Kotor' })}
        ${statCard('Pemasukan (Omzet)', formatMoney(totalIn), `${incomeRecords.length} transaksi penjualan`, Icons.arrowIn('icon-svg', 18), 'icon-green', { filter: 'income', hint: 'Buka rincian Omzet' })}
        ${statCard('Pengeluaran Kas Operasional', formatMoney(totalOut), `${expenseRecords.length} transaksi kas keluar`, Icons.arrowOut('icon-svg', 18), 'icon-orange', { filter: 'expenses', hint: 'Buka rincian Pengeluaran' })}
      </section>

      <div class="box box-primary">
        <div class="box-header">
          <h3 class="box-title">${Icons.receipt('icon-svg', 18)} Laporan Laba Rugi (Income Statement)</h3>
          <div class="box-tools">
            <span class="label ${netProfit >= 0 ? 'label-success' : 'label-danger'}" style="font-size: 11.5px; padding: 4px 8px;">
              ${netProfit >= 0 ? 'Surplus (Profit)' : 'Defisit (Rugi)'}
            </span>
          </div>
        </div>
        <div class="box-body">
          <div class="income-statement-grid">
            <div class="statement-box">
              <div class="statement-heading">
                <span>A. Perhitungan Laba Kotor</span>
                <span>Margin ${grossMargin}%</span>
              </div>
              <div class="statement-item">
                <span>(+) Pendapatan Penjualan Produk (Omzet)</span>
                <strong style="color: #00a65a;">+${formatMoney(totalIn)}</strong>
              </div>
              <div class="statement-item">
                <span>(−) Beban Pokok Penjualan (HPP Bahan Baku)</span>
                <strong style="color: #dd4b39;">−${formatMoney(totalCogs)}</strong>
              </div>
              <div class="statement-item subtotal">
                <span>Subtotal Laba Kotor</span>
                <strong>${formatMoney(grossProfit)}</strong>
              </div>
            </div>

            <div class="statement-box">
              <div class="statement-heading">
                <span>B. Beban Usaha & Laba Bersih</span>
                <span>Margin ${netMargin}%</span>
              </div>
              <div class="statement-item">
                <span>Laba Kotor (dari bagian A)</span>
                <strong>${formatMoney(grossProfit)}</strong>
              </div>
              <div class="statement-item">
                <span>(−) Beban Upah Pokok Karyawan</span>
                <span>−${formatMoney(totalPayrollBase)}</span>
              </div>
              <div class="statement-item">
                <span>(−) Beban Lembur & Insentif Produksi</span>
                <span style="color: #f39c12;">−${formatMoney(totalPayrollOvertime + totalPayrollIncentive)}</span>
              </div>
              <div class="statement-item">
                <span>(−) Beban Operasional Lainnya</span>
                <span>−${formatMoney(operationalCash)}</span>
              </div>
              <div class="statement-item subtotal">
                <span>Total Seluruh Beban Usaha</span>
                <strong style="color: #dd4b39;">−${formatMoney(totalOperatingExpense)}</strong>
              </div>
              <div class="statement-item profit-highlight">
                <span>Laba Bersih Operasional:</span>
                <strong style="font-size: 14px; color: ${netProfit >= 0 ? '#00a65a' : '#dd4b39'};">${formatMoney(netProfit)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    ${headingHtml}

    <div class="report-tabs-bar" style="margin-bottom: 15px; display: flex; gap: 6px; flex-wrap: wrap;">
      ${reportViewTabs.map((tab) => `
        <button type="button" class="btn ${currentFilter === tab.key ? 'btn-primary' : 'btn-default'} btn-sm" data-action="filter-report" data-filter="${escapeHtml(tab.key)}">
          ${tab.iconSvg}
          <span>${escapeHtml(tab.label)}</span>
          <span class="badge" style="background:${currentFilter === tab.key ? '#ffffff' : '#3c8dbc'}; color:${currentFilter === tab.key ? '#3c8dbc' : '#ffffff'}; font-size:10px; margin-left:4px; padding:2px 6px; border-radius:10px;">${escapeHtml(tab.badge)}</span>
        </button>
      `).join('')}
    </div>

    ${specificGroupHtml}

    <div class="box box-primary">
      <div class="box-header">
        <h3 class="box-title">${Icons.reports('icon-svg', 18)} Pratinjau Catatan Operasional (${selectedMonth})</h3>
        <div class="box-tools">
          <label style="font-size:12px; margin-right:4px;">Bulan:</label>
          <input type="month" id="report-month" value="${escapeHtml(selectedMonth)}" style="height:30px; font-size:12px; padding:2px 8px; border:1px solid #ccc; border-radius:3px;" />
          <button type="button" class="btn btn-success btn-sm" data-action="download-report" data-month="${escapeHtml(selectedMonth)}">
            ${Icons.download('icon-svg', 13)} Unduh Excel
          </button>
        </div>
      </div>
      <div class="box-body">
        ${tableRows}
      </div>
      <div class="box-footer">
        <div>Showing 1 to ${filteredItems.length} of ${filteredItems.length} entries</div>
      </div>
    </div>
  `;
}
