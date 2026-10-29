import { state, currentMonth, quantityFormat } from '../../store/state.js';
import { heading, statCard } from '../../components/Header.js';
import { emptyState } from '../../components/Table.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { formatMoney, formatQuantity, formatDate, monthRecords, monthEnd } from '../../utils/formatters.js';
import { calculateMonthlySalary } from '../payroll/salaryCalc.js';

export function categorizeExpense(record) {
  const cat = (record.category || '').toLowerCase();
  const desc = (record.description || '').toLowerCase();
  if (cat.includes('bahan') || cat.includes('material') || cat.includes('belanja') || desc.includes('corrugated') || desc.includes('kardus') || desc.includes('karton') || desc.includes('lem') || desc.includes('lakban') || desc.includes('plastik')) {
    return { group: 'Bahan Baku & Material (HPP)', icon: '📦', role: 'Harga Pokok Penjualan (HPP)', color: '#c93b2b', desc: 'Pengadaan lembaran karton corrugated, lem perekat, lakban, & material produksi' };
  }
  if (cat.includes('gaji') || cat.includes('upah') || desc.includes('gaji') || desc.includes('upah') || desc.includes('karyawan') || desc.includes('pekerja')) {
    return { group: 'Gaji & Upah Karyawan', icon: '👥', role: 'Beban Gaji & Upah (Operasional)', color: '#8e44ad', desc: 'Upah pokok harian, jam lembur kerja, & insentif target produksi' };
  }
  if (cat.includes('listrik') || cat.includes('utilitas') || cat.includes('pln') || cat.includes('air') || desc.includes('listrik') || desc.includes('pln') || desc.includes('utilitas') || desc.includes('air') || desc.includes('internet')) {
    return { group: 'Utilitas & Listrik Pabrik', icon: '⚡', role: 'Beban Utilitas Fasilitas (Operasional)', color: '#d35400', desc: 'Daya listrik mesin cetak/potong, penerangan workshop, air PDAM & fasilitas pabrik' };
  }
  if (cat.includes('rawat') || cat.includes('mesin') || cat.includes('alat') || cat.includes('perbaikan') || desc.includes('mesin') || desc.includes('sparepart') || desc.includes('pisau') || desc.includes('oli') || desc.includes('servis')) {
    return { group: 'Pemeliharaan Alat & Mesin', icon: '🔧', role: 'Beban Perawatan Mesin (Operasional)', color: '#2980b9', desc: 'Servis berkala mesin cetak flexo, ganti pisau potong, dan oli mesin' };
  }
  if (cat.includes('transport') || cat.includes('antar') || cat.includes('kirim') || cat.includes('bensin') || cat.includes('solar') || desc.includes('bensin') || desc.includes('solar') || desc.includes('ongkir') || desc.includes('armada') || desc.includes('tol')) {
    return { group: 'Transportasi & Logistik', icon: '🚚', role: 'Beban Logistik & Armada (Operasional)', color: '#16a085', desc: 'Bahan bakar armada pick-up kirim barang jadi, tarif tol, dan ekspedisi' };
  }
  return { group: record.category || 'Operasional Lainnya', icon: '🏢', role: 'Beban Operasional Usaha', color: '#7f8c8d', desc: 'Konsumsi kerja, perlengkapan safety kerja, ATK kantor, & keperluan umum' };
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
        icon: info.icon,
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
      icon: '👥',
      role: 'Beban Gaji & Upah (Operasional)',
      desc: `Total akumulasi upah ${activeEmployees.length} pekerja (${formatQuantity(totalOvertimeHours)} jam lembur)`,
      color: '#8e44ad',
      amount: totalPayroll,
      count: activeEmployees.length,
      items: [],
      isVirtualPayroll: true,
    };
  }

  const categoryList = Object.values(expenseCategories).sort((a, b) => b.amount - a.amount);
  const totalCombinedExpenses = categoryList.reduce((sum, c) => sum + c.amount, 0) || totalOut;

  const reportViewTabs = [
    { key: 'all', icon: '📊', label: 'Ringkasan Semua', badge: `${cash.length + inventory.length + (state.isAdmin ? monthlyCalcs.length : 0)} catatan` },
    { key: 'gross_profit', icon: '📈', label: 'Laba Kotor', badge: formatMoney(grossProfit) },
    { key: 'net_profit', icon: '💰', label: 'Laba Bersih', badge: formatMoney(netProfit) },
    { key: 'expenses', icon: '📋', label: 'Pengeluaran Kas (Untuk Apa Saja)', badge: formatMoney(totalCombinedExpenses) },
    { key: 'income', icon: '↗', label: 'Pemasukan (Omzet)', badge: formatMoney(totalIn) },
    ...(state.isAdmin ? [{ key: 'payroll', icon: '👥', label: 'Gaji & Lembur', badge: formatMoney(totalPayroll) }] : []),
    { key: 'inventory', icon: '📦', label: 'Persediaan Barang', badge: `${inventory.length} mutasi` },
  ];

  const filterTabs = [
    { key: 'all', label: 'Semua Catatan', count: inventory.length + cash.length + (state.isAdmin ? monthlyCalcs.length : 0) },
    { key: 'gross_profit', label: 'Laba Kotor', count: incomeRecords.length + cogsRecords.length },
    { key: 'net_profit', label: 'Laba Bersih', count: cash.length + (state.isAdmin ? monthlyCalcs.length : 0) },
    { key: 'expenses', label: 'Pengeluaran Kas', count: expenseRecords.length },
    { key: 'income', label: 'Pemasukan (Omzet)', count: incomeRecords.length },
    { key: 'cogs', label: 'HPP / Bahan Baku', count: cogsRecords.length },
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

  filteredItems.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));

  const headingHtml = heading('ANALISIS', 'Laporan bulanan', 'Kelompokkan analisis performa berdasarkan laba bersih, laba kotor, rincian pengeluaran kas, omzet, dan persediaan.');

  const tableRows = filteredItems.length ? `
    <div class="table-wrap"><table><thead><tr>
      <th>TANGGAL</th>
      <th>POS / KATEGORI</th>
      <th>${currentFilter === 'expenses' ? 'UNTUK APA UANG TERSEBUT (KETERANGAN & KEPERLUAN)' : 'RINCIAN TRANSAKSI'}</th>
      <th>KLASIFIKASI KEUANGAN</th>
      <th>ARAH</th>
      <th class="align-right">NOMINAL / UNIT</th>
      <th class="align-right">PRATINJAU</th>
    </tr></thead><tbody>
      ${filteredItems.map((item) => {
        if (item.itemType === 'payroll') {
          return `<tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="payroll" title="Klik untuk melihat slip gaji pekerja">
            <td class="date-cell">${formatDate(item.occurred_on)}</td>
            <td><strong>Gaji & Lembur</strong></td>
            <td class="detail-cell">${escapeHtml(item.title)}<span class="sub-meta">${escapeHtml(item.detail)}</span></td>
            <td><span class="status-pill status-permit" style="font-size: 8px;">Gaji & Upah</span></td>
            <td><span class="direction-pill pill-out"><span></span>Keluar</span></td>
            <td class="align-right amount-cell" style="font-weight: 700; color: #a94438;">−${formatMoney(item.amount)}</td>
            <td class="align-right">
              <button type="button" class="icon-button" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="payroll" title="Pratinjau slip gaji">🔍</button>
            </td>
          </tr>`;
        }
        if (item.itemType === 'inventory') {
          const prod = item.products || state.products.find((p) => p.id === item.product_id);
          const isIn = item.direction === 'in';
          const notes = item.notes || '';
          const isProd = isIn && (notes.includes('Hasil Produksi') || notes.toLowerCase().includes('produksi'));
          const isUsg = !isIn && (notes.includes('Pemakaian') || notes.toLowerCase().includes('internal') || notes.toLowerCase().includes('reject'));

          let pillLabel = isIn ? 'Masuk' : 'Keluar';
          let pillStyle = '';
          let statusLabel = `Stok ${isIn ? 'Masuk' : 'Keluar'}`;
          let statusPillClass = isIn ? 'status-present' : 'status-inactive';

          if (isProd) {
            pillLabel = '🏭 Produksi';
            pillStyle = 'background: #edf7f0; color: #187554; border: 1px solid #b7e2c9; font-weight: 700;';
            statusLabel = 'Hasil Produksi';
            statusPillClass = 'status-active';
          } else if (isUsg) {
            pillLabel = '📦 Pemakaian';
            pillStyle = 'background: #fff8e1; color: #855900; border: 1px solid #ffe082; font-weight: 600;';
            statusLabel = 'Pemakaian/Reject';
            statusPillClass = 'status-pending';
          }

          return `<tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="inventory" title="Klik untuk melihat detail pergerakan barang">
            <td class="date-cell">${formatDate(item.occurred_on)}</td>
            <td><strong>Persediaan</strong></td>
            <td class="detail-cell">${escapeHtml(prod?.name || 'Produk')}${item.notes ? `<span class="sub-meta">${escapeHtml(item.notes)}</span>` : ''}</td>
            <td><span class="status-pill ${statusPillClass}" style="font-size: 8px;">${statusLabel}</span></td>
            <td><span class="direction-pill ${isIn ? 'pill-in' : 'pill-out'}" style="${pillStyle}"><span></span>${pillLabel}</span></td>
            <td class="align-right amount-cell">${isIn ? '+' : '−'}${formatQuantity(item.quantity)} ${escapeHtml(prod?.unit || 'unit')}</td>
            <td class="align-right">
              <button type="button" class="icon-button" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="inventory" title="Pratinjau pergerakan barang">🔍</button>
            </td>
          </tr>`;
        }
        // Cash item
        const isIncome = item.direction === 'in';
        return `<tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="cash" title="Klik untuk melihat detail transaksi kas">
          <td class="date-cell">${formatDate(item.occurred_on)}</td>
          <td><strong>${escapeHtml(item.category)}</strong></td>
          <td class="detail-cell">
            <strong>${escapeHtml(item.description || item.category)}</strong>
            ${currentFilter === 'expenses' ? `<span class="sub-meta">${escapeHtml(item.financialCategory || 'Operasional Pabrik')}</span>` : ''}
          </td>
          <td><span class="status-pill ${isIncome ? 'status-paid' : 'status-pending'}" style="font-size: 8px;">${escapeHtml(item.financialCategory || 'Kas')}</span></td>
          <td><span class="direction-pill ${isIncome ? 'pill-in' : 'pill-out'}"><span></span>${isIncome ? 'Masuk' : 'Keluar'}</span></td>
          <td class="align-right amount-cell" style="font-weight: 700; color: ${isIncome ? '#29865c' : '#a94438'};">${isIncome ? '+' : '−'}${formatMoney(item.amount)}</td>
          <td class="align-right">
            <button type="button" class="icon-button" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="cash" title="Pratinjau transaksi kas">🔍</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody></table></div>
  ` : emptyState('Tidak ada catatan untuk kelompok ini', 'Belum ada transaksi operasional yang tercatat untuk kelompok ini pada periode terpilih.');

  let specificGroupHtml = '';

  if (currentFilter === 'gross_profit') {
    specificGroupHtml = `
      <div class="report-group-header">
        <div class="report-group-title">
          <h2>📈 Analisis Laba Kotor (Gross Profit)</h2>
          <p>Pendapatan penjualan produk dikurangi harga pokok penjualan (HPP pengadaan bahan baku & material).</p>
        </div>
        <span class="report-group-tag">Gross Margin: ${grossMargin}%</span>
      </div>
      <div class="equation-bar">
        <div class="equation-segment">
          <span class="label">(+) Omzet Penjualan Produk</span>
          <span class="value" style="color: #29865c;">+${formatMoney(totalIn)}</span>
        </div>
        <span class="equation-op">−</span>
        <div class="equation-segment">
          <span class="label">(−) HPP / Belanja Bahan Baku</span>
          <span class="value" style="color: #c93b2b;">−${formatMoney(totalCogs)}</span>
        </div>
        <span class="equation-op">=</span>
        <div class="equation-segment is-result">
          <span class="label">Laba Kotor (Gross Profit)</span>
          <span class="value">${formatMoney(grossProfit)}</span>
        </div>
        <span class="margin-badge" style="margin-left: auto; font-size: 11px; padding: 4px 10px;">
          Gross Margin: ${grossMargin}%
        </span>
      </div>
      <div class="report-kpi-strip">
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Omzet Penjualan</div>
          <div class="kpi-val" style="color: #29865c;">${formatMoney(totalIn)}</div>
          <div class="kpi-sub">${incomeRecords.length} transaksi penjualan</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">HPP / Belanja Bahan Baku</div>
          <div class="kpi-val" style="color: #c93b2b;">${formatMoney(totalCogs)}</div>
          <div class="kpi-sub">${cogsRecords.length} pengadaan bahan corrugated & lem</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Laba Kotor (Gross Profit)</div>
          <div class="kpi-val" style="color: #176d51;">${formatMoney(grossProfit)}</div>
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
          <h2>💰 Analisis Laba Bersih (Net Profit)</h2>
          <p>Keuntungan bersih usaha setelah memperhitungkan seluruh beban pokok, biaya operasional pabrik, utilitas listrik, mesin, dan upah karyawan.</p>
        </div>
        <span class="report-group-tag" style="background:${netProfit >= 0 ? '#eef8f2' : '#fcf1ed'}; color:${netProfit >= 0 ? '#176d51' : '#c93b2b'};">
          ${netProfit >= 0 ? 'Surplus (Profit)' : 'Defisit (Rugi)'} · Net Margin: ${netMargin}%
        </span>
      </div>
      <div class="equation-bar">
        <div class="equation-segment">
          <span class="label">Laba Kotor</span>
          <span class="value" style="color: #176d51;">${formatMoney(grossProfit)}</span>
        </div>
        <span class="equation-op">−</span>
        <div class="equation-segment">
          <span class="label">(−) Beban Operasional Lain</span>
          <span class="value" style="color: #c93b2b;">−${formatMoney(operationalCash)}</span>
        </div>
        <span class="equation-op">−</span>
        <div class="equation-segment">
          <span class="label">(−) Beban Gaji & Lembur</span>
          <span class="value" style="color: #c93b2b;">−${formatMoney(totalPayroll)}</span>
        </div>
        <span class="equation-op">=</span>
        <div class="equation-segment is-result" style="background:${netProfit >= 0 ? '#eef8f2' : '#fcf1ed'}; border-color:${netProfit >= 0 ? '#c7e8d5' : '#f5c6cb'};">
          <span class="label" style="color:${netProfit >= 0 ? '#176d51' : '#c93b2b'};">Laba Bersih Operasional</span>
          <span class="value" style="color:${netProfit >= 0 ? '#176d51' : '#c93b2b'};">${formatMoney(netProfit)}</span>
        </div>
        <span class="margin-badge" style="margin-left: auto; font-size: 11px; padding: 4px 10px; background:${netProfit >= 0 ? '#d7ede1' : '#f8d7da'}; color:${netProfit >= 0 ? '#16694b' : '#721c24'};">
          Net Margin: ${netMargin}%
        </span>
      </div>
      <div class="report-kpi-strip">
        <div class="kpi-strip-item">
          <div class="kpi-label">Laba Kotor (Gross Profit)</div>
          <div class="kpi-val" style="color: #176d51;">${formatMoney(grossProfit)}</div>
          <div class="kpi-sub">Omzet dikurangi HPP bahan</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Beban Operasional Pabrik</div>
          <div class="kpi-val" style="color: #c93b2b;">${formatMoney(operationalCash)}</div>
          <div class="kpi-sub">Listrik, perawatan mesin, dll.</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Beban Gaji & Lembur</div>
          <div class="kpi-val" style="color: #b86e1e;">${formatMoney(totalPayroll)}</div>
          <div class="kpi-sub">${activeEmployees.length} pekerja (${formatQuantity(totalOvertimeHours)} jam lembur)</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Seluruh Beban Usaha</div>
          <div class="kpi-val" style="color: #c93b2b;">${formatMoney(totalOperatingExpense)}</div>
          <div class="kpi-sub">Operasional + penggajian</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Laba Bersih (Net Profit)</div>
          <div class="kpi-val" style="color:${netProfit >= 0 ? '#176d51' : '#c93b2b'}; font-weight:800;">${formatMoney(netProfit)}</div>
          <div class="kpi-sub">${netProfit >= 0 ? 'Surplus laba bersih operasional' : 'Defisit beban melebihi omzet'}</div>
        </div>
      </div>
    `;
  } else if (currentFilter === 'expenses') {
    specificGroupHtml = `
      <div class="report-group-header">
        <div class="report-group-title">
          <h2>📋 Rincian Pengeluaran Kas (Untuk Apa Saja)</h2>
          <p>Pemetaan terperinci seluruh uang keluar berdasarkan peruntukan dan pos kebutuhan operasional pabrik.</p>
        </div>
        <span class="report-group-tag" style="background:#fdf2f0; color:#c93b2b;">
          Total Pengeluaran Kas: ${formatMoney(totalOut)}
        </span>
      </div>
      <div class="report-kpi-strip">
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Pengeluaran Kas</div>
          <div class="kpi-val" style="color: #c93b2b;">${formatMoney(totalOut)}</div>
          <div class="kpi-sub">${expenseRecords.length} transaksi kas keluar</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Bahan Baku & Material (HPP)</div>
          <div class="kpi-val" style="color: #c93b2b;">${formatMoney(totalCogs)}</div>
          <div class="kpi-sub">${cogsRecords.length} transaksi belanja modal</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Beban Operasional Fasilitas</div>
          <div class="kpi-val" style="color: #b86e1e;">${formatMoney(operationalCash)}</div>
          <div class="kpi-sub">${operationalCashRecords.length} transaksi listrik & perawatan</div>
        </div>
        ${state.isAdmin ? `
          <div class="kpi-strip-item">
            <div class="kpi-label">Beban Gaji & Lembur</div>
            <div class="kpi-val" style="color: #8e44ad;">${formatMoney(totalPayroll)}</div>
            <div class="kpi-sub">${activeEmployees.length} pekerja aktif</div>
          </div>
        ` : ''}
      </div>
      <div style="margin-bottom: 8px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #1e3329; margin-bottom: 4px;">Kelompok Kategori Pengeluaran:</h3>
        <p style="font-size: 11px; color: #697d72; margin-top: 0;">Pembagian dana keluar menurut pos peruntukan operasional usaha</p>
      </div>
      <div class="category-breakdown-grid">
        ${categoryList.map((cat) => {
          const share = totalCombinedExpenses > 0 ? ((cat.amount / totalCombinedExpenses) * 100).toFixed(1) : '0';
          return `
            <div class="category-breakdown-card">
              <div class="cat-top">
                <span class="cat-name">${cat.icon} ${escapeHtml(cat.name)}</span>
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
  } else if (currentFilter === 'income') {
    specificGroupHtml = `
      <div class="report-group-header">
        <div class="report-group-title">
          <h2>↗ Rincian Pemasukan & Omzet Penjualan</h2>
          <p>Seluruh penerimaan uang kas dari penjualan produk karton box, pesanan retail, dan pembayaran faktur pelanggan.</p>
        </div>
        <span class="report-group-tag" style="background:#eef8f2; color:#176d51;">
          Total Omzet: ${formatMoney(totalIn)}
        </span>
      </div>
      <div class="report-kpi-strip">
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Omzet Penjualan</div>
          <div class="kpi-val" style="color: #29865c;">${formatMoney(totalIn)}</div>
          <div class="kpi-sub">Total penerimaan kas periode ini</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Jumlah Transaksi Penjualan</div>
          <div class="kpi-val">${incomeRecords.length}</div>
          <div class="kpi-sub">Faktur & nota penjualan tercatat</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Rata-rata per Penjualan</div>
          <div class="kpi-val">${formatMoney(incomeRecords.length ? Math.round(totalIn / incomeRecords.length) : 0)}</div>
          <div class="kpi-sub">Nilai transaksi rata-rata</div>
        </div>
      </div>
    `;
  } else if (currentFilter === 'payroll') {
    specificGroupHtml = `
      <div class="report-group-header">
        <div class="report-group-title">
          <h2>👥 Laporan Beban Gaji & Lembur Karyawan</h2>
          <p>Rekapitulasi komprehensif upah pokok harian, akumulasi jam lembur, insentif hasil produksi, dan status pelunasan.</p>
        </div>
        <span class="report-group-tag" style="background:#f4edf8; color:#8e44ad;">
          Total Penggajian: ${formatMoney(totalPayroll)}
        </span>
      </div>
      <div class="report-kpi-strip">
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Beban Gaji & Lembur</div>
          <div class="kpi-val" style="color: #8e44ad;">${formatMoney(totalPayroll)}</div>
          <div class="kpi-sub">${activeEmployees.length} karyawan aktif</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Upah Pokok</div>
          <div class="kpi-val">${formatMoney(totalPayrollBase)}</div>
          <div class="kpi-sub">Dihitung berdasarkan absensi kehadiran</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Upah Lembur</div>
          <div class="kpi-val" style="color: #b86e1e;">${formatMoney(totalPayrollOvertime)}</div>
          <div class="kpi-sub">${formatQuantity(totalOvertimeHours)} jam lembur pabrik</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Insentif Produksi</div>
          <div class="kpi-val">${formatMoney(totalPayrollIncentive)}</div>
          <div class="kpi-sub">Bonus unit hasil kerja</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Status Pelunasan Gaji</div>
          <div class="kpi-val">${paidCount} Lunas</div>
          <div class="kpi-sub">${pendingCount} pekerja belum dibayar</div>
        </div>
      </div>
    `;
  } else if (currentFilter === 'inventory') {
    specificGroupHtml = `
      <div class="report-group-header">
        <div class="report-group-title">
          <h2>📦 Laporan Pergerakan Persediaan (Stok Gudang)</h2>
          <p>Penerimaan stok bahan baku dan pengiriman barang keluar dari gudang selama periode bulan terpilih.</p>
        </div>
        <span class="report-group-tag">
          ${inventory.length} Mutasi Tercatat
        </span>
      </div>
      <div class="report-kpi-strip">
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Catatan Pergerakan</div>
          <div class="kpi-val">${inventory.length}</div>
          <div class="kpi-sub">Riwayat barang masuk & keluar</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Barang Masuk (In)</div>
          <div class="kpi-val" style="color: #29865c;">+${formatQuantity(totalQtyIn)}</div>
          <div class="kpi-sub">Penerimaan dari supplier & produksi</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Barang Keluar (Out)</div>
          <div class="kpi-val" style="color: #c93b2b;">−${formatQuantity(totalQtyOut)}</div>
          <div class="kpi-sub">Pengiriman ke pelanggan / pemakaian</div>
        </div>
        <div class="kpi-strip-item">
          <div class="kpi-label">Total Master Produk</div>
          <div class="kpi-val">${state.products.length} SKU</div>
          <div class="kpi-sub">Katalog produk aktif</div>
        </div>
      </div>
    `;
  } else {
    specificGroupHtml = `
      <section class="stats-grid compact-stats">
        ${statCard('Laba Bersih (Net Profit)', formatMoney(netProfit), `Net Margin: ${netMargin}% (Setelah beban & gaji)`, netProfit >= 0 ? '↗' : '↘', netProfit >= 0 ? 'icon-green' : 'icon-orange', { clickable: true, filter: 'net_profit', isActive: currentFilter === 'net_profit', hint: 'Buka analisis Laba Bersih' })}
        ${statCard('Laba Kotor (Gross Profit)', formatMoney(grossProfit), `Gross Margin: ${grossMargin}% (Omzet − HPP)`, '◎', 'icon-blue', { clickable: true, filter: 'gross_profit', isActive: currentFilter === 'gross_profit', hint: 'Buka analisis Laba Kotor' })}
        ${statCard('Pemasukan (Omzet)', formatMoney(totalIn), `${incomeRecords.length} transaksi penjualan`, '↗', 'icon-green', { clickable: true, filter: 'income', isActive: currentFilter === 'income', hint: 'Buka rincian Omzet' })}
        ${statCard('Pengeluaran Kas (Untuk Apa Saja)', formatMoney(totalOut), `${expenseRecords.length} transaksi kas keluar`, '↘', 'icon-orange', { clickable: true, filter: 'expenses', isActive: currentFilter === 'expenses', hint: 'Buka rincian Pengeluaran' })}
        ${statCard('HPP / Belanja Bahan', formatMoney(totalCogs), `${cogsRecords.length} transaksi belanja modal`, '↘', 'icon-orange', { clickable: true, filter: 'cogs', isActive: currentFilter === 'cogs' })}
        ${state.isAdmin ? statCard('Beban Gaji & Lembur', formatMoney(totalPayroll), `${activeEmployees.length} pekerja (${formatQuantity(totalOvertimeHours)} jam lembur)`, '◎', 'icon-purple', { clickable: true, filter: 'payroll', isActive: currentFilter === 'payroll', hint: 'Buka rincian Gaji' }) : ''}
        ${statCard('Beban Operasional Lain', formatMoney(operationalCash), 'Listrik, mesin, pemeliharaan', '◷', 'icon-orange', { clickable: true, filter: 'operational', isActive: currentFilter === 'operational' })}
        ${statCard('Barang Masuk/Keluar', quantityFormat.format(inventory.length), 'catatan pergerakan stok gudang', '▦', 'icon-blue', { clickable: true, filter: 'inventory', isActive: currentFilter === 'inventory', hint: 'Buka rincian Stok' })}
      </section>

      <section class="content-card is-table-card">
        <div class="card-heading">
          <div>
            <h2>Laporan Laba Rugi (Income Statement) <span class="margin-badge">Laba Bersih ${netMargin}%</span></h2>
            <p>Rincian pendapatan omzet, beban pokok penjualan (HPP), beban operasional pabrik, upah karyawan, dan laba bersih</p>
          </div>
          <span class="count-badge" style="background:${netProfit >= 0 ? '#eef8f2' : '#fcf1ed'}; color:${netProfit >= 0 ? '#176d51' : '#c93b2b'}; font-weight:700;">
            ${netProfit >= 0 ? 'Surplus (Profit)' : 'Defisit (Rugi)'}
          </span>
        </div>

        <div class="income-statement-grid">
          <div class="statement-box">
            <div class="statement-heading">
              <span>A. PERHITUNGAN LABA KOTOR (GROSS PROFIT)</span>
              <span class="margin-badge">Gross Margin ${grossMargin}%</span>
            </div>
            <div class="statement-item">
              <span>(+) Pendapatan Penjualan Produk (Omzet)</span>
              <strong style="color: #29865c;">+${formatMoney(totalIn)}</strong>
            </div>
            <div class="statement-item">
              <span>(−) Beban Pokok Penjualan (HPP / Belanja Bahan Baku)</span>
              <strong style="color: #c93b2b;">−${formatMoney(totalCogs)}</strong>
            </div>
            <div class="statement-item subtotal">
              <span>Subtotal Laba Kotor (Gross Profit)</span>
              <strong style="color: #176d51; font-size: 13px;">${formatMoney(grossProfit)}</strong>
            </div>
            <div style="font-size: 9px; color: #819187; margin-top: 7px; line-height: 1.4;">
              *Dihitung dari seluruh penjualan dikurangi pengadaan bahan baku, lembaran karton corrugated, dan material produk.
            </div>
          </div>

          <div class="statement-box">
            <div class="statement-heading">
              <span>B. BEBAN OPERASIONAL & LABA BERSIH (NET PROFIT)</span>
              <span class="margin-badge">Net Margin ${netMargin}%</span>
            </div>
            <div class="statement-item">
              <span>Laba Kotor (dari bagian A)</span>
              <strong>${formatMoney(grossProfit)}</strong>
            </div>
            <div class="statement-item">
              <span>(−) Beban Upah Pokok Karyawan (${activeEmployees.length} orang)</span>
              <span style="color: #55675d;">−${formatMoney(totalPayrollBase)}</span>
            </div>
            <div class="statement-item">
              <span>(−) Beban Upah Lembur Karyawan (${formatQuantity(totalOvertimeHours)} jam lembur)</span>
              <span style="color: #b86e1e; font-weight:600;">−${formatMoney(totalPayrollOvertime)}</span>
            </div>
            <div class="statement-item">
              <span>(−) Beban Insentif Hasil Produksi Karyawan</span>
              <span style="color: #55675d;">−${formatMoney(totalPayrollIncentive)}</span>
            </div>
            <div class="statement-item">
              <span>(−) Beban Operasional Lain (Listrik, Pemeliharaan Mesin, dll.)</span>
              <span style="color: #55675d;">−${formatMoney(operationalCash)}</span>
            </div>
            <div class="statement-item subtotal">
              <span>Total Beban Operasional & Penggajian</span>
              <strong style="color: #c93b2b;">−${formatMoney(totalOperatingExpense)}</strong>
            </div>
            <div class="statement-item profit-highlight">
              <span>LABA BERSIH OPERASIONAL (NET PROFIT):</span>
              <strong style="font-size: 14px;">${formatMoney(netProfit)}</strong>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  return `${headingHtml}
    <section class="content-card report-filter-card">
      <div>
        <h2>Pilih periode laporan</h2>
        <p>Kelompokkan analisis performa berdasarkan laba bersih, laba kotor, rincian pengeluaran kas, omzet, dan persediaan.</p>
      </div>
      <div class="report-controls">
        <label class="month-label" for="report-month">BULAN</label>
        <input class="month-input" id="report-month" type="month" value="${escapeHtml(selectedMonth)}" />
        <button class="button button-primary" data-action="download-report" data-month="${escapeHtml(selectedMonth)}" title="Unduh laporan lengkap operasional & keuangan bulan ini ke CSV/Excel"><span>↓</span> Unduh Laporan Bulanan</button>
      </div>
    </section>

    <nav class="report-view-nav" aria-label="Kelompok laporan">
      ${reportViewTabs.map((tab) => `
        <button type="button" class="report-view-btn ${currentFilter === tab.key ? 'is-active' : ''}" data-action="filter-report" data-filter="${escapeHtml(tab.key)}">
          <span>${tab.icon}</span> <span>${escapeHtml(tab.label)}</span> <span class="report-view-badge">${escapeHtml(tab.badge)}</span>
        </button>
      `).join('')}
    </nav>

    ${specificGroupHtml}

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Pratinjau rincian catatan <span class="count-badge">${filteredItems.length} ditampilkan</span></h2>
          <p>Klik kolom atau baris pada tabel untuk membuka pratinjau detail transaksi secara lengkap</p>
        </div>
      </div>

      <div class="report-tab-bar">
        ${filterTabs.map((tab) => `
          <button type="button" class="report-tab-pill ${currentFilter === tab.key ? 'is-active' : ''}" data-action="filter-report" data-filter="${escapeHtml(tab.key)}">
            ${escapeHtml(tab.label)} <span class="report-tab-badge">${tab.count}</span>
          </button>
        `).join('')}
      </div>

      ${tableRows}
    </section>`;
}
