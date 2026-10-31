import './styles.css';
import { db } from './api/db.js';
import { state, currentMonth, localDate, userDisplayId, checkMysqlStatus, refreshData } from './store/state.js';
import { notify, showError } from './components/Toast.js';
import { openDialog, closeDialog } from './components/Dialog.js';
import { renderSidebar } from './components/Sidebar.js';
import { renderTopbar } from './components/Topbar.js';
import { renderLoginView, attachLoginHandlers } from './views/auth/LoginView.js';
import { renderDashboard } from './views/dashboard/DashboardView.js';
import { renderProducts } from './views/products/ProductsView.js';
import { openProductModal } from './views/products/ProductModal.js';
import { renderInventory } from './views/inventory/InventoryView.js';
import { openMovementModal } from './views/inventory/InventoryModal.js';
import { renderCash } from './views/cash/CashView.js';
import { openCashModal } from './views/cash/CashModal.js';
import { renderPayroll } from './views/payroll/PayrollView.js';
import { employeeForm, attendanceForm, payMonthlySalaryModal, viewEmployeeAttendanceModal, openOvertimeDetailModal, openActiveEmployeesDetailModal, openSalarySummaryModal, openDailyAttendanceDetailModal } from './views/payroll/AttendanceModal.js';
import { calculateMonthlySalary } from './views/payroll/salaryCalc.js';
import { renderUsers } from './views/users/UsersView.js';
import { userForm } from './views/users/UserModal.js';
import { renderReports } from './views/reports/ReportsView.js';
import {
  downloadReport,
  downloadPayrollReport,
  downloadSingleEmployeeAttendance,
  openReportDetailModal,
  openSettlementModal,
  openStatDetailModal,
  printThermalReceipt,
  copyReceiptText,
  exportProducts,
  exportInventory,
  exportCash,
} from './views/reports/excelExport.js';
import { ATTENDANCE_LABELS, formatQuantity, formatDate, formatMoney } from './utils/formatters.js';
import { Icons } from './components/Icons.js';

let refreshTimer = null;

function renderLogin(errorMsg = '') {
  const app = document.querySelector('#app');
  app.innerHTML = renderLoginView(state, errorMsg);
  attachLoginHandlers(handleLogin);
}

function renderShell() {
  const app = document.querySelector('#app');
  if (state.sidebarCollapsed) {
    app?.classList.add('sidebar-collapse');
    document.body.classList.add('sidebar-collapse');
  } else {
    app?.classList.remove('sidebar-collapse');
    document.body.classList.remove('sidebar-collapse');
  }
  app.innerHTML = `
    <div class="wrapper">
      ${renderTopbar(state)}
      ${renderSidebar(state)}
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <div class="content-wrapper">
        <main class="content" id="page-content"></main>
        <footer class="main-footer">
          <div>
            <strong>Copyright &copy; 2026 <a href="#" data-page="dashboard">Jaya Wijaya</a>.</strong> Sistem Informasi Inventaris & Produksi.
          </div>
          <div class="hidden-xs">
            <b>Version</b> 2.4.0
          </div>
        </footer>
      </div>
    </div>
    <dialog id="app-dialog"><div id="dialog-content"></div></dialog>
    <div id="toast" class="toast"></div>
  `;

  renderPage();
}

function renderPage() {
  const pages = {
    dashboard: ['Ringkasan', renderDashboard],
    inventory: ['Inventaris & Gudang', renderInventory],
    products: ['Inventaris & Gudang', () => { state.inventoryTab = 'catalog'; return renderInventory(); }],
    cash: ['Keuangan', renderCash],
    payroll: ['Absensi & gaji', renderPayroll],
    users: ['Kelola Pengguna', renderUsers],
    reports: ['Laporan', () => renderReports(state.selectedReportMonth || currentMonth)],
  };

  if (!pages[state.page] || ((state.page === 'payroll' || state.page === 'users') && !state.isAdmin)) {
    state.page = 'dashboard';
  }

  const [label, render] = pages[state.page];
  const crumb = document.querySelector('#page-crumb');
  if (crumb) crumb.textContent = label;

  const content = document.querySelector('#page-content');
  if (!content) return;

  try {
    content.innerHTML = render();
  } catch (err) {
    console.error(`Error rendering page "${state.page}":`, err);
    content.innerHTML = `
      <div class="box box-danger" style="margin: 20px;">
        <div class="box-header">
          <h3 class="box-title">${Icons.alertCircle('icon-svg', 18)} Terjadi Kendala Saat Menampilkan Halaman ${escapeHtml(label)}</h3>
        </div>
        <div class="box-body">
          <p style="color: #dd4b39; font-weight: 600;">${escapeHtml(err.message || String(err))}</p>
          <p style="color: #666; font-size: 12.5px;">Sistem telah mencatat kendala ini. Silakan coba buka halaman kembali atau kembali ke ringkasan.</p>
          <button type="button" class="btn btn-primary btn-sm" data-page="dashboard" style="margin-top: 8px;">
            ${Icons.dashboard('icon-svg', 13)} Kembali ke Dashboard
          </button>
        </div>
      </div>
    `;
  }
}

function setupGlobalEvents() {
  const app = document.querySelector('#app');
  if (!app || app.dataset.globalEventsAttached) return;
  app.dataset.globalEventsAttached = 'true';

  app.addEventListener('click', async (event) => {
    // 1. Signout (Topbar button, Sidebar menu, modal button)
    const signoutBtn = event.target.closest('[data-action="signout"]');
    if (signoutBtn) {
      event.preventDefault();
      await handleSignOut();
      return;
    }

    // 2. Sidebar toggle (Desktop collapse & expand / Mobile drawer)
    const mobileToggle = event.target.closest('#mobile-menu-toggle, .sidebar-toggle');
    if (mobileToggle) {
      event.preventDefault();
      const isMobile = window.innerWidth <= 768;
      const appEl = document.querySelector('#app');
      const sidebar = document.querySelector('#app-sidebar');
      const backdrop = document.querySelector('#sidebar-backdrop');

      if (isMobile) {
        // Mobile drawer overlay
        sidebar?.classList.toggle('is-open');
        backdrop?.classList.toggle('is-active');
      } else {
        // Desktop collapse / expand
        state.sidebarCollapsed = !state.sidebarCollapsed;
        appEl?.classList.toggle('sidebar-collapse', state.sidebarCollapsed);
        document.body.classList.toggle('sidebar-collapse', state.sidebarCollapsed);
      }
      return;
    }

    // 2b. Mobile backdrop tap to close sidebar
    const backdrop = event.target.closest('#sidebar-backdrop');
    if (backdrop) {
      event.preventDefault();
      document.querySelector('#app-sidebar')?.classList.remove('is-open');
      backdrop.classList.remove('is-active');
      return;
    }

    // 3. Page routing via [data-page] (Sidebar, Topbar logo, Breadcrumb, Footer)
    const navItem = event.target.closest('[data-page]');
    if (navItem) {
      event.preventDefault();
      let targetPage = navItem.dataset.page;
      if (targetPage === 'products') {
        targetPage = 'inventory';
        state.inventoryTab = 'catalog';
      }
      if (targetPage) {
        state.page = targetPage;
        sessionStorage.setItem('jw_current_page', targetPage);
        document.querySelector('#app-sidebar')?.classList.remove('is-open');
        document.querySelector('#sidebar-backdrop')?.classList.remove('is-active');
        renderShell();
      }
      return;
    }

    // 4. Other actions
    const button = event.target.closest('[data-action]');
    if (button) {
      if (event.target.closest('a')) event.preventDefault();
      handlePageAction(event);
      return;
    }
  });

  // Table search live filter
  app.addEventListener('input', (event) => {
    if (event.target.matches('.table-filter-search input, input[id^="search-"]')) {
      const q = event.target.value.toLowerCase().trim();
      const box = event.target.closest('.box') || event.target.closest('.content-wrapper') || document;
      const table = box.querySelector('table.table');
      if (table) {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row) => {
          if (row.classList.contains('empty-row')) return;
          const text = row.textContent.toLowerCase();
          row.style.display = !q || text.includes(q) ? '' : 'none';
        });
      }
    }
  });

  // Date / Month picker changes
  app.addEventListener('change', (event) => {
    if (event.target.id === 'report-month') {
      state.selectedReportMonth = event.target.value || currentMonth;
      renderPage();
    } else if (event.target.id === 'attendance-date-picker') {
      state.selectedPayrollDate = event.target.value || localDate;
      renderPage();
    } else if (event.target.id === 'payroll-month-picker') {
      state.selectedPayrollMonth = event.target.value || currentMonth;
      renderPage();
    }
  });
}

async function handlePageAction(event) {
  if (event && event.target && event.target.closest('a')) event.preventDefault();
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'close-dialog') {
    closeDialog();
  } else if (action === 'signout') {
    handleSignOut();
  } else if (action === 'quick-entry') {
    openDialog('Catat transaksi', `<div class="quick-actions">
      <button class="quick-action-card" data-action="add-sale"><span class="quick-action-icon icon-orange">${Icons.truck('icon-svg', 20)}</span><strong>Penjualan (Nota)</strong><small>Catat pesanan multi-item ke pelanggan</small><span class="quick-action-arrow">→</span></button>
      <button class="quick-action-card" data-action="add-production"><span class="quick-action-icon">${Icons.factory('icon-svg', 20)}</span><strong>Hasil produksi</strong><small>Tambah stok barang jadi pabrik</small><span class="quick-action-arrow">→</span></button>
      <button class="quick-action-card" data-action="add-inventory"><span class="quick-action-icon icon-blue">${Icons.inventory('icon-svg', 20)}</span><strong>Pergerakan barang</strong><small>Beli dari supplier / kirim penjualan</small><span class="quick-action-arrow">→</span></button>
      <button class="quick-action-card" data-action="add-cash"><span class="quick-action-icon icon-green">${Icons.cash('icon-svg', 20)}</span><strong>Transaksi kas</strong><small>Catat uang masuk atau keluar</small><span class="quick-action-arrow">→</span></button>
    </div>`);
  } else if (action === 'add-user') {
    userForm(null, () => renderPage());
  } else if (action === 'edit-user') {
    userForm(state.systemUsers?.find((u) => u.id === id), () => renderPage());
  } else if (action === 'delete-user') {
    const targetUser = state.systemUsers?.find((u) => u.id === id);
    if (!targetUser || !window.confirm(`Hapus pengguna "${targetUser.username}" (${targetUser.full_name})?`)) return;
    const token = localStorage.getItem('jw_session_token') || '';
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      }).then((r) => r.json());
      if (res && res.error) {
        showError(res.error);
        return;
      }
      notify('Pengguna berhasil dihapus.');
      await refreshData();
      renderPage();
    } catch (err) {
      showError('Gagal menghapus pengguna: ' + err.message);
    }
  } else if (action === 'add-product') {
    openProductModal();
  } else if (action === 'edit-product') {
    openProductModal(state.products.find((p) => p.id === id));
  } else if (action === 'delete-product') {
    const product = state.products.find((item) => item.id === id);
    if (!product || !window.confirm(`Hapus produk "${product.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    const { error } = await db.from('products').delete().eq('id', id);
    if (error) {
      showError(error.message.includes('foreign key') || error.code === '23503'
        ? 'Produk tidak dapat dihapus karena sudah memiliki riwayat pergerakan barang.'
        : `Produk gagal dihapus: ${error.message}`);
      return;
    }
    await refreshData();
    renderShell();
    notify('Produk berhasil dihapus.');
  } else if (action === 'add-sale') {
    closeDialog();
    openMovementModal(null, 'out', 'Penjualan');
  } else if (action === 'add-production') {
    closeDialog();
    openMovementModal(null, 'in', 'Produksi');
  } else if (action === 'add-inventory') {
    closeDialog();
    openMovementModal(null, 'in', 'Pembelian');
  } else if (action === 'product-movement') {
    closeDialog();
    const product = state.products.find((p) => p.id === id);
    openMovementModal(product);
  } else if (action === 'delete-movement') {
    if (!window.confirm('Hapus catatan mutasi stok ini?')) return;
    const { error } = await db.from('inventory_movements').delete().eq('id', id);
    if (error) {
      showError(`Gagal menghapus pergerakan barang: ${error.message}`);
      return;
    }
    await refreshData();
    renderShell();
    notify('Catatan pergerakan barang dihapus.');
  } else if (action === 'add-cash') {
    closeDialog();
    openCashModal();
  } else if (action === 'delete-cash') {
    if (!window.confirm('Hapus transaksi kas ini?')) return;
    const { error } = await db.from('cash_transactions').delete().eq('id', id);
    if (error) {
      showError(`Gagal menghapus transaksi kas: ${error.message}`);
      return;
    }
    await refreshData();
    renderShell();
    notify('Transaksi kas dihapus.');
  } else if (action === 'add-employee') {
    employeeForm();
  } else if (action === 'edit-employee') {
    employeeForm(state.employees.find((emp) => emp.id === id));
  } else if (action === 'open-attendance-modal' || action === 'add-payroll') {
    attendanceForm(null, id || null, state.selectedPayrollDate);
  } else if (action === 'edit-attendance') {
    attendanceForm(state.payroll.find((p) => p.id === id));
  } else if (action === 'set-date-today') {
    state.selectedPayrollDate = localDate;
    renderPage();
  } else if (action === 'quick-attendance') {
    const employeeId = id;
    const status = button.dataset.status || 'present';
    const employee = state.employees.find((emp) => emp.id === employeeId);
    if (!employee) return;

    const targetDate = state.selectedPayrollDate || localDate;
    const rateMultiplier = ATTENDANCE_LABELS[status]?.rate ?? 0;
    const dailyWage = Math.round((employee.daily_salary || 0) * rateMultiplier);
    const totalAmount = dailyWage;

    const payload = {
      employee_id: employeeId,
      work_date: targetDate,
      period: targetDate,
      attendance_status: status,
      daily_wage: dailyWage,
      base_salary: dailyWage,
      overtime_hours: 0,
      overtime_rate: employee.overtime_rate || 0,
      overtime_pay: 0,
      production_quantity: 0,
      incentive_rate: employee.incentive_per_unit || 0,
      incentive_amount: 0,
      total_amount: totalAmount,
      notes: `Absen cepat ${ATTENDANCE_LABELS[status]?.label || status}`,
    };

    const { data: existing, error: findError } = await db.from('payroll_records')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('work_date', targetDate)
      .maybeSingle();

    if (findError) {
      showError(`Gagal memeriksa absensi: ${findError.message}`);
      return;
    }

    const { error: saveError } = existing
      ? await db.from('payroll_records').update(payload).eq('id', existing.id)
      : await db.from('payroll_records').insert(payload);

    if (saveError) {
      showError(`Gagal mencatat absensi: ${saveError.message}`);
      return;
    }

    await refreshData();
    renderShell();
    notify(`Absensi ${employee.full_name} (${ATTENDANCE_LABELS[status]?.label || status}) berhasil dicatat.`);
  } else if (action === 'delete-attendance') {
    const record = state.payroll.find((p) => p.id === id);
    if (!record || !window.confirm('Hapus catatan absensi ini?')) return;

    const { error } = await db.from('payroll_records').delete().eq('id', id);
    if (error) {
      showError(`Gagal menghapus absensi: ${error.message}`);
      return;
    }
    await refreshData();
    renderShell();
    notify('Catatan absensi berhasil dihapus.');
  } else if (action === 'pay-monthly-salary') {
    const month = button.dataset.month || (state.page === 'reports' ? state.selectedReportMonth : state.selectedPayrollMonth) || currentMonth;
    payMonthlySalaryModal(id, month);
  } else if (action === 'view-employee-attendance') {
    const month = button.dataset.month || (state.page === 'reports' ? state.selectedReportMonth : state.selectedPayrollMonth) || currentMonth;
    viewEmployeeAttendanceModal(id, month);
  } else if (action === 'confirm-pay-monthly') {
    const month = button.dataset.month || (state.page === 'reports' ? state.selectedReportMonth : state.selectedPayrollMonth) || currentMonth;
    const employee = state.employees.find((e) => e.id === id);
    if (!employee) return;
    const calc = calculateMonthlySalary(employee, month);

    const payoutPayload = {
      employee_id: employee.id,
      period: month,
      effective_days: calc.effectiveDays,
      present_days: calc.present,
      half_days: calc.halfDay,
      base_amount: calc.baseSalary,
      overtime_hours: calc.totalOvertimeHours,
      overtime_amount: calc.overtimeAmount,
      production_quantity: calc.totalProduction,
      incentive_amount: calc.incentiveAmount,
      total_amount: calc.totalSalary,
      status: 'paid',
      paid_at: new Date().toISOString(),
      notes: `Gaji bulan ${month}`,
    };

    const cashPayload = {
      direction: 'out',
      amount: calc.totalSalary,
      category: 'Gaji & Upah Karyawan',
      description: `Gaji bulan ${month}: ${employee.full_name} (${calc.effectiveDays} hari kerja, ${formatQuantity(calc.totalOvertimeHours)} jam lembur, ${formatQuantity(calc.totalProduction)} unit produksi)`,
      occurred_on: localDate,
    };

    const { error: payoutError } = await db.from('payroll_payouts').insert(payoutPayload);
    if (payoutError) {
      showError(`Gagal memproses pembayaran gaji: ${payoutError.message}`);
      return;
    }

    if (calc.totalSalary > 0) {
      const { error: cashError } = await db.from('cash_transactions').insert(cashPayload);
      if (cashError) {
        showError(`Gaji tersimpan, namun pencatatan kas gagal: ${cashError.message}`);
      }
    }

    closeDialog();
    await refreshData();
    renderShell();
    notify(`Gaji bulan ${month} untuk ${employee.full_name} berhasil dibayarkan dan dicatat ke kas.`);
  } else if (action === 'cancel-monthly-salary') {
    if (!window.confirm('Batalkan status pembayaran gaji ini?')) return;
    const { error } = await db.from('payroll_payouts').delete().eq('id', id);
    if (error) {
      showError(`Gagal membatalkan pembayaran: ${error.message}`);
      return;
    }
    await refreshData();
    renderShell();
    notify('Status pembayaran gaji berhasil dibatalkan.');
  } else if (action === 'download-report') {
    const month = button.dataset.month || document.querySelector('#report-month')?.value || state.selectedReportMonth || currentMonth;
    downloadReport(month);
  } else if (action === 'download-payroll-report') {
    const month = button.dataset.month || document.querySelector('#payroll-month-picker')?.value || document.querySelector('#report-month')?.value || state.selectedPayrollMonth || currentMonth;
    downloadPayrollReport(month);
  } else if (action === 'download-single-employee-attendance') {
    const month = button.dataset.month || state.selectedPayrollMonth || currentMonth;
    downloadSingleEmployeeAttendance(id, month);
  } else if (action === 'filter-report') {
    state.selectedReportFilter = button.dataset.filter || 'all';
    renderPage();
  } else if (action === 'switch-inventory-tab') {
    state.inventoryTab = button.dataset.tab || 'catalog';
    renderPage();
  } else if (action === 'filter-products') {
    state.inventoryTab = 'catalog';
    state.productsFilter = button.dataset.filter || 'all';
    renderPage();
  } else if (action === 'filter-cash') {
    state.cashFilter = button.dataset.filter || 'all';
    renderPage();
  } else if (action === 'scroll-to-box') {
    if (button.dataset.dismissDialog === 'true') {
      closeDialog();
    }
    const targetId = button.dataset.target;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.remove('box-highlight-pulse');
        void el.offsetWidth;
        el.classList.add('box-highlight-pulse');
        setTimeout(() => el.classList.remove('box-highlight-pulse'), 2500);
      }
    }
  } else if (action === 'open-active-employees-detail') {
    openActiveEmployeesDetailModal();
  } else if (action === 'open-salary-summary-detail') {
    const month = button.dataset.month || state.selectedPayrollMonth || currentMonth;
    openSalarySummaryModal(month);
  } else if (action === 'open-overtime-detail') {
    const month = button.dataset.month || state.selectedPayrollMonth || currentMonth;
    openOvertimeDetailModal(month);
  } else if (action === 'open-daily-attendance-detail') {
    const date = button.dataset.date || state.selectedPayrollDate || localDate;
    openDailyAttendanceDetailModal(date);
  } else if (action === 'filter-payroll-status') {
    state.payrollStatusFilter = button.dataset.status || 'all';
    renderPage();
  } else if (action === 'filter-attendance') {
    state.attendanceFilter = button.dataset.status || 'all';
    renderPage();
  } else if (action === 'view-report-detail') {
    openReportDetailModal(button.dataset.type, button.dataset.id, state.selectedReportMonth || currentMonth);
  } else if (action === 'print-thermal-receipt') {
    printThermalReceipt();
  } else if (action === 'copy-receipt-text') {
    copyReceiptText();
  } else if (action === 'open-stat-detail') {
    openStatDetailModal(button.dataset.stat);
  } else if (action === 'open-settlement-modal') {
    openSettlementModal(button.dataset.type, button.dataset.id);
  } else if (action === 'back-to-nota') {
    openReportDetailModal(button.dataset.type, button.dataset.id, state.selectedReportMonth || currentMonth);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const identifier = (form.get('userId') || '').trim();
  const password = form.get('password') || '';

  if (!identifier || !password) {
    renderLogin('Silakan masukkan ID Pengguna dan kata sandi.');
    return;
  }

  const button = event.currentTarget.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span>Memverifikasi akun…</span>';
  }

  const { data, error } = await db.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error || !data?.user) {
    renderLogin(error?.message || 'ID pengguna atau kata sandi tidak benar. Periksa kembali.');
    return;
  }

  await enterWorkspace(data.user);
}

async function enterWorkspace(user) {
  state.user = user;
  state.isAdmin = user.role === 'admin' || user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin';
  try {
    await refreshData();
  } catch (error) {
    console.warn('Kendala memuat data ruang kerja saat masuk:', error);
    showError(`Kendala memuat sebagian data: ${error.message || 'Koneksi lambat'}. Menampilkan data yang tersedia.`);
  }
  const savedPage = sessionStorage.getItem('jw_current_page');
  state.page = savedPage || 'dashboard';
  renderShell();
  subscribeToWorkspace();
  notify(`Selamat datang, ${userDisplayId(user)}!`);
}

function subscribeToWorkspace() {
  window.clearInterval(refreshTimer);
  refreshTimer = window.setInterval(async () => {
    try {
      await refreshData();
      renderPage();
    } catch (_) {}
  }, 10000);
}

async function handleSignOut() {
  window.clearInterval(refreshTimer);
  sessionStorage.removeItem('jw_current_page');
  await db.auth.signOut();
  state.user = null;
  state.isAdmin = false;
  state.page = 'dashboard';
  state.products = [];
  state.inventory = [];
  state.cash = [];
  state.employees = [];
  state.payroll = [];
  state.payouts = [];
  state.systemUsers = [];
  notify('Anda telah berhasil keluar dari sistem.');
  renderLogin();
}

window.addEventListener('app:rerender', () => {
  renderPage();
});

async function start() {
  setupGlobalEvents();
  await checkMysqlStatus();

  const { data, error } = await db.auth.getSession();
  if (!error && data?.session?.user) {
    await enterWorkspace(data.session.user);
    return;
  }

  renderLogin();
}

start();
