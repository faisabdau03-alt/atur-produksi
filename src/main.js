import { createClient } from '@supabase/supabase-js';
import './styles.css';

const app = document.querySelector('#app');
const config = {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY,
};
const supabase = config.url && config.key ? createClient(config.url, config.key) : null;
const today = new Date();
const localDate = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-');
const currentMonth = localDate.slice(0, 7);
const money = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const quantityFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const state = {
  user: null,
  isAdmin: false,
  isDemo: false,
  page: 'dashboard',
  selectedPayrollDate: localDate,
  selectedPayrollMonth: currentMonth,
  selectedReportMonth: currentMonth,
  selectedReportFilter: 'all',
  products: [],
  inventory: [],
  cash: [],
  employees: [],
  payroll: [],
  payouts: [],
};
let workspaceChannel = null;
let refreshTimer = null;
const AUTH_DOMAIN = '@perusahaan.id';
const DEMO_STORAGE_KEY = 'atur_produksi_demo_v4';

const ATTENDANCE_LABELS = {
  present: { label: 'Hadir', class: 'status-present', rate: 1 },
  half_day: { label: '½ Hari', class: 'status-half_day', rate: 0.5 },
  permit: { label: 'Izin', class: 'status-permit', rate: 0 },
  sick: { label: 'Sakit', class: 'status-sick', rate: 0 },
  absent: { label: 'Alpa', class: 'status-absent', rate: 0 },
};

function getInitialDemoData() {
  const p1 = 'p-01', p2 = 'p-02', p3 = 'p-03', p4 = 'p-04';
  const e1 = 'e-01', e2 = 'e-02', e3 = 'e-03';
  return {
    products: [
      { id: p1, name: 'Karton Box Ukuran M (Double Wall)', sku: 'KB-001', unit: 'pcs', purchase_price: 4500, selling_price: 7500 },
      { id: p2, name: 'Lakban Coklat 48mm x 100m', sku: 'LK-002', unit: 'roll', purchase_price: 14000, selling_price: 22000 },
      { id: p3, name: 'Bubble Wrap Tebal 50m', sku: 'BW-003', unit: 'roll', purchase_price: 110000, selling_price: 165000 },
      { id: p4, name: 'Plastik Stretch Film 500m', sku: 'SF-004', unit: 'roll', purchase_price: 65000, selling_price: 95000 },
    ],
    inventory: [
      { id: 'inv-1', product_id: p1, direction: 'in', quantity: 1500, occurred_on: `${currentMonth}-02`, notes: 'Stok awal produksi batch #101' },
      { id: 'inv-2', product_id: p1, direction: 'out', quantity: 450, occurred_on: `${currentMonth}-06`, notes: 'Pengiriman ke PT Sumber Berkat' },
      { id: 'inv-3', product_id: p1, direction: 'out', quantity: 300, occurred_on: `${currentMonth}-11`, notes: 'Pengiriman ke Toko Cahaya Baru' },
      { id: 'inv-4', product_id: p2, direction: 'in', quantity: 250, occurred_on: `${currentMonth}-03`, notes: 'Penerimaan stok dari supplier' },
      { id: 'inv-5', product_id: p2, direction: 'out', quantity: 85, occurred_on: `${currentMonth}-09`, notes: 'Digunakan divisi packing' },
      { id: 'inv-6', product_id: p3, direction: 'in', quantity: 60, occurred_on: `${currentMonth}-04`, notes: 'Penerimaan bahan kemas' },
      { id: 'inv-7', product_id: p3, direction: 'out', quantity: 18, occurred_on: `${currentMonth}-12`, notes: 'Pemakaian order kemas fragile' },
      { id: 'inv-8', product_id: p4, direction: 'in', quantity: 80, occurred_on: `${currentMonth}-05`, notes: 'Stok masuk gudang' },
      { id: 'inv-9', product_id: p4, direction: 'out', quantity: 25, occurred_on: `${currentMonth}-14`, notes: 'Pengiriman pallet' },
    ],
    cash: [
      { id: 'c-1', direction: 'in', amount: 14500000, category: 'Penjualan', description: 'Pelunasan faktur INV-2026-081', occurred_on: `${currentMonth}-05` },
      { id: 'c-2', direction: 'out', amount: 5200000, category: 'Bahan Baku', description: 'Pembelian lembaran corrugated board', occurred_on: `${currentMonth}-07` },
      { id: 'c-3', direction: 'in', amount: 9200000, category: 'Penjualan', description: 'Pesanan retail karton & bubble wrap', occurred_on: `${currentMonth}-10` },
      { id: 'c-4', direction: 'out', amount: 1650000, category: 'Operasional', description: 'Biaya listrik & utilitas mesin', occurred_on: `${currentMonth}-12` },
      { id: 'c-5', direction: 'out', amount: 450000, category: 'Perawatan', description: 'Maintenance mesin perekat dan pisau potong', occurred_on: `${currentMonth}-14` },
    ],
    employees: [
      { id: e1, full_name: 'Budi Santoso', position: 'Operator Mesin Cetak & Potong', daily_salary: 130000, monthly_salary: 3250000, overtime_rate: 20000, incentive_per_unit: 150, is_active: true },
      { id: e2, full_name: 'Siti Aminah', position: 'Finishing & Quality Control', daily_salary: 115000, monthly_salary: 2875000, overtime_rate: 18000, incentive_per_unit: 120, is_active: true },
      { id: e3, full_name: 'Ahmad Fauzi', position: 'Logistik & Penataan Gudang', daily_salary: 105000, monthly_salary: 2625000, overtime_rate: 16000, incentive_per_unit: 100, is_active: true },
    ],
    payroll: [
      // Riwayat beberapa hari kerja di bulan berjalan dengan jam lembur
      { id: 'att-101', employee_id: e1, work_date: `${currentMonth}-02`, period: `${currentMonth}-02`, attendance_status: 'present', daily_wage: 130000, overtime_hours: 0, overtime_rate: 20000, overtime_pay: 0, production_quantity: 180, incentive_rate: 150, incentive_amount: 27000, total_amount: 157000, notes: 'Cetak batch awal' },
      { id: 'att-102', employee_id: e2, work_date: `${currentMonth}-02`, period: `${currentMonth}-02`, attendance_status: 'present', daily_wage: 115000, overtime_hours: 1.5, overtime_rate: 18000, overtime_pay: 27000, production_quantity: 160, incentive_rate: 120, incentive_amount: 19200, total_amount: 161200, notes: 'Finishing box M + lembur 1.5 jam' },
      { id: 'att-103', employee_id: e3, work_date: `${currentMonth}-02`, period: `${currentMonth}-02`, attendance_status: 'present', daily_wage: 105000, overtime_hours: 0, overtime_rate: 16000, overtime_pay: 0, production_quantity: 90, incentive_rate: 100, incentive_amount: 9000, total_amount: 114000, notes: 'Bongkar muat bahan' },

      { id: 'att-104', employee_id: e1, work_date: `${currentMonth}-05`, period: `${currentMonth}-05`, attendance_status: 'present', daily_wage: 130000, overtime_hours: 2, overtime_rate: 20000, overtime_pay: 40000, production_quantity: 210, incentive_rate: 150, incentive_amount: 31500, total_amount: 201500, notes: 'Target lembur cetak 2 jam' },
      { id: 'att-105', employee_id: e2, work_date: `${currentMonth}-05`, period: `${currentMonth}-05`, attendance_status: 'present', daily_wage: 115000, overtime_hours: 0, overtime_rate: 18000, overtime_pay: 0, production_quantity: 190, incentive_rate: 120, incentive_amount: 22800, total_amount: 137800, notes: 'QC box batch 2' },
      { id: 'att-106', employee_id: e3, work_date: `${currentMonth}-05`, period: `${currentMonth}-05`, attendance_status: 'permit', daily_wage: 0, overtime_hours: 0, overtime_rate: 16000, overtime_pay: 0, production_quantity: 0, incentive_rate: 100, incentive_amount: 0, total_amount: 0, notes: 'Izin urusan dinas' },

      { id: 'att-107', employee_id: e1, work_date: `${currentMonth}-09`, period: `${currentMonth}-09`, attendance_status: 'present', daily_wage: 130000, overtime_hours: 1, overtime_rate: 20000, overtime_pay: 20000, production_quantity: 175, incentive_rate: 150, incentive_amount: 26250, total_amount: 176250, notes: 'Pemotongan corrugated + lembur 1 jam' },
      { id: 'att-108', employee_id: e2, work_date: `${currentMonth}-09`, period: `${currentMonth}-09`, attendance_status: 'half_day', daily_wage: 57500, overtime_hours: 0, overtime_rate: 18000, overtime_pay: 0, production_quantity: 80, incentive_rate: 120, incentive_amount: 9600, total_amount: 67100, notes: 'Setengah hari izin keperluan keluarga' },
      { id: 'att-109', employee_id: e3, work_date: `${currentMonth}-09`, period: `${currentMonth}-09`, attendance_status: 'present', daily_wage: 105000, overtime_hours: 1, overtime_rate: 16000, overtime_pay: 16000, production_quantity: 110, incentive_rate: 100, incentive_amount: 11000, total_amount: 132000, notes: 'Penataan rak gudang B + lembur 1 jam' },

      // Catatan hari ini
      { id: 'att-110', employee_id: e1, work_date: localDate, period: localDate, attendance_status: 'present', daily_wage: 130000, overtime_hours: 2, overtime_rate: 20000, overtime_pay: 40000, production_quantity: 160, incentive_rate: 150, incentive_amount: 24000, total_amount: 194000, notes: 'Hadir shift penuh + lembur 2 jam' },
      { id: 'att-111', employee_id: e2, work_date: localDate, period: localDate, attendance_status: 'present', daily_wage: 115000, overtime_hours: 0, overtime_rate: 18000, overtime_pay: 0, production_quantity: 210, incentive_rate: 120, incentive_amount: 25200, total_amount: 140200, notes: 'Finishing kemasan box' },
      { id: 'att-112', employee_id: e3, work_date: localDate, period: localDate, attendance_status: 'half_day', daily_wage: 52500, overtime_hours: 0, overtime_rate: 16000, overtime_pay: 0, production_quantity: 80, incentive_rate: 100, incentive_amount: 8000, total_amount: 60500, notes: 'Setengah hari shift pagi' },
    ],
    payouts: [],
  };
}


const demoStore = {
  load() {
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const initial = getInitialDemoData();
    this.save(initial);
    return initial;
  },
  save(data) {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  },
  reset() {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch (_) {}
    return this.load();
  },
  get(table) {
    return this.load()[table] || [];
  },
  insert(table, row) {
    const data = this.load();
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record = { id, created_at: new Date().toISOString(), ...row };
    data[table] = [record, ...(data[table] || [])];
    this.save(data);
    return record;
  },
  update(table, id, updates) {
    const data = this.load();
    data[table] = (data[table] || []).map((item) => (item.id === id ? { ...item, ...updates } : item));
    this.save(data);
  },
  delete(table, id) {
    const data = this.load();
    data[table] = (data[table] || []).filter((item) => item.id !== id);
    this.save(data);
  },
};

function formatAuthIdentifier(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed.includes('@') ? trimmed : `${trimmed.toLowerCase()}${AUTH_DOMAIN}`;
}

function userDisplayId(user = state.user) {
  if (!user) return '';
  const raw = user.user_metadata?.username || user.email || '';
  return raw.includes('@') ? raw.split('@')[0] : raw;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatMoney(value) {
  return money.format(Number(value) || 0);
}

function formatQuantity(value) {
  return quantityFormat.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  const str = String(value);
  if (str.includes('akhir')) {
    const parts = str.split('-');
    return `Akhir ${parts[0]}-${parts[1]}`;
  }
  try {
    const d = new Date(`${str.slice(0, 10)}T00:00:00`);
    if (isNaN(d.getTime())) return str;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch (_) {
    return str;
  }
}

function monthStart(month) {
  return `${month}-01`;
}

function monthEnd(month) {
  if (!month) return '';
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

function monthRecords(records, month, field = 'occurred_on') {
  return records.filter((record) => (record[field] || record.work_date || record.period)?.slice(0, 7) === month);
}


function stockFor(productId) {
  return state.inventory.reduce((balance, movement) => {
    if (movement.product_id !== productId) return balance;
    return balance + (movement.direction === 'in' ? 1 : -1) * Number(movement.quantity);
  }, 0);
}

function cashBalance(records = state.cash) {
  return records.reduce((balance, record) => (
    balance + (record.direction === 'in' ? 1 : -1) * Number(record.amount)
  ), 0);
}

function notify(message, type = 'success') {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${type} is-visible`;
  window.clearTimeout(notify.timeout);
  notify.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 4200);
}

function showError(message) {
  notify(message, 'error');
}

function configMessage() {
  return `
    <main class="auth-page">
      <section class="auth-card setup-card">
        <div class="brand-mark">AP</div>
        <p class="eyebrow">PERSIAPAN APLIKASI</p>
        <h1>Hubungkan ruang kerja Anda</h1>
        <p class="muted">Tambahkan URL dan anon/publishable key Supabase di file <code>.env</code> untuk menghubungkan database produksi.</p>

        <div style="background: #eef8f3; border: 1px solid #c8ead8; border-radius: 9px; padding: 18px 16px; margin: 20px 0; text-align: left;">
          <strong style="color: #176d51; font-size: 13px; display: block; margin-bottom: 4px;">⚡ Ingin langsung mencoba tanpa database?</strong>
          <p style="margin: 0 0 14px; font-size: 11px; color: #4e655b; line-height: 1.5;">Jelajahi seluruh fitur operasional, persediaan barang, arus keuangan, penggajian karyawan, dan laporan dengan data simulasi langsung di browser.</p>
          <button class="button button-primary button-full" id="btn-enter-demo">Masuk ke Mode Demo Interaktif <span aria-hidden="true">→</span></button>
        </div>

        <p class="eyebrow" style="margin-top: 18px;">ATAU HUBUNGKAN KE SUPABASE</p>
        <pre>VITE_SUPABASE_URL=https://&lt;project-ref&gt;.supabase.co
VITE_SUPABASE_ANON_KEY=&lt;anon-atau-publishable-key&gt;</pre>
        <a class="text-link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Buka Supabase Dashboard ↗</a>
      </section>
    </main>`;
}

function renderLogin(message = '') {
  app.innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <div class="brand-mark">AP</div>
        <p class="eyebrow">RUANG KERJA PRODUKSI</p>
        <h1>Semua operasional,<br /><span>dalam kendali.</span></h1>
        <p class="muted">Masuk untuk mengelola persediaan, keuangan, dan aktivitas produksi perusahaan.</p>
        ${message ? `<div class="inline-alert">${escapeHtml(message)}</div>` : ''}
        <form id="login-form" class="form-stack">
          <label>ID Pengguna<input name="userId" type="text" autocomplete="username" placeholder="Masukkan ID (contoh: admin)" required /></label>
          <label>Kata sandi<input name="password" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" required /></label>
          <button class="button button-primary button-full" type="submit">Masuk ke ruang kerja <span aria-hidden="true">→</span></button>
        </form>
        <div style="display: flex; align-items: center; gap: 10px; margin: 18px 0 14px; color: #a2aca8; font-size: 11px;">
          <span style="flex: 1; height: 1px; background: #e9eeec;"></span><span>ATAU</span><span style="flex: 1; height: 1px; background: #e9eeec;"></span>
        </div>
        <button type="button" class="button button-outline button-full" id="btn-enter-demo">⚡ Coba Mode Demo (Tanpa Database)</button>
        <p class="auth-footnote" style="margin-top: 16px;">Akses akun dikelola oleh administrator perusahaan.</p>
      </section>
      <aside class="auth-aside">
        <div class="aside-orb"></div>
        <p class="eyebrow">SATU TEMPAT UNTUK SEMUA</p>
        <h2>Produksi terpantau.<br />Bisnis lebih terarah.</h2>
        <p>Satukan catatan barang, arus kas, dan penggajian dalam laporan yang selalu mudah diakses.</p>
        <div class="aside-stats"><span>01&nbsp; Persediaan</span><span>02&nbsp; Keuangan</span><span>03&nbsp; Penggajian</span></div>
      </aside>
    </main>`;
  document.querySelector('#login-form').addEventListener('submit', handleLogin);
  document.querySelector('#btn-enter-demo')?.addEventListener('click', () => enterDemoWorkspace());
}

function navItem(page, icon, label) {
  return `<button class="nav-link ${state.page === page ? 'active' : ''}" data-page="${page}">
    <span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>
  </button>`;
}

function renderShell() {
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="#" data-page="dashboard"><span class="brand-mark">AP</span><span>atur<span class="brand-light">produksi</span></span></a>
        <div class="workspace-label">RUANG KERJA</div>
        <nav class="main-nav" aria-label="Navigasi utama">
          ${navItem('dashboard', '◫', 'Ringkasan')}
          <div class="nav-section-label">OPERASIONAL</div>
          ${navItem('inventory', '▦', 'Persediaan')}
          ${navItem('cash', '↗', 'Keuangan')}
          ${navItem('products', '◇', 'Produk')}
          ${state.isAdmin ? `<div class="nav-section-label">MANAJEMEN</div>${navItem('payroll', '◎', 'Absensi & gaji')}` : ''}
          ${navItem('reports', '▤', 'Laporan')}
        </nav>
        <div class="sidebar-bottom">
          ${state.isDemo ? `
            <div class="sidebar-note" style="background: #fff8ec; border-color: #f7dfaf; margin-bottom: 8px;">
              <span class="status-dot" style="background: #e69123; box-shadow: 0 0 0 3px #fceddb;"></span>
              <span><strong>Mode Demo</strong><br /><small style="color: #94713c;">Data tersimpan di browser</small></span>
            </div>
            <button type="button" class="button button-quiet button-small" data-action="reset-demo" style="width: 100%; margin-bottom: 10px; justify-content: center; font-size: 10px; color: #8e6c31;">↺ Reset data demo</button>
          ` : `
            <div class="sidebar-note"><span class="status-dot"></span><span>Data tersinkron<br /><small>Terhubung ke ruang kerja</small></span></div>
          `}
          <button class="profile-button" id="sign-out">
            <span class="avatar">${escapeHtml((userDisplayId() || 'A').slice(0, 1).toUpperCase())}</span>
            <span class="profile-copy"><strong>${escapeHtml(userDisplayId())}</strong><small>${state.isAdmin ? 'Administrator' : 'Anggota tim'}</small></span>
            <span class="signout-icon" aria-label="Keluar">↪</span>
          </button>
        </div>
      </aside>
      <div class="main-column">
        <header class="topbar">
          <button class="mobile-menu" id="menu-toggle" aria-label="Buka navigasi">☰</button>
          <div class="breadcrumb"><span>Ruang kerja</span><span class="breadcrumb-separator">/</span><strong id="page-crumb">Ringkasan</strong>${state.isDemo ? '<span class="status-pill" style="background: #fcf1e5; color: #ba732e; font-size: 10px; padding: 2px 8px; margin-left: 6px;">Demo</span>' : ''}</div>
          <div class="topbar-right"><span class="today-label">${formatDate(localDate)}</span><span class="topbar-divider"></span><span class="topbar-avatar">${escapeHtml((userDisplayId() || 'A').slice(0, 1).toUpperCase())}</span></div>
        </header>
        <main class="page-content" id="page-content"></main>
      </div>
    </div>
    <dialog id="app-dialog" class="app-dialog"><div id="dialog-content"></div></dialog>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>`;
  renderPage();
  app.querySelectorAll('#sidebar [data-page]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      state.page = button.dataset.page;
      document.querySelector('#sidebar').classList.remove('sidebar-open');
      renderShell();
    });
  });
  document.querySelector('#sign-out').addEventListener('click', handleSignOut);
  document.querySelector('#dialog-content').addEventListener('click', handlePageAction);
  document.querySelector('#menu-toggle').addEventListener('click', () => {
    document.querySelector('#sidebar').classList.toggle('sidebar-open');
  });
}

function heading(eyebrow, title, description, action = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="muted">${description}</p></div>${action}</div>`;
}

function statCard(label, value, note, icon, tone = '', options = {}) {
  const { clickable = false, filter = '', isActive = false, hint = '' } = options;
  const activeClass = isActive ? ' is-active' : '';
  const clickClass = clickable ? ' stat-card-clickable' : '';
  const clickAttrs = clickable ? ` data-action="filter-report" data-filter="${escapeHtml(filter)}" title="Klik untuk pratinjau kategori ini"` : '';
  return `<article class="stat-card${clickClass}${activeClass}"${clickAttrs}>
    <div class="stat-top"><span>${label}</span><span class="stat-icon ${tone}">${icon}</span></div>
    <div class="stat-value">${value}</div>
    <div class="stat-note">${note}</div>
    ${clickable ? `<div class="click-hint"><span>${hint || 'Klik untuk pratinjau'}</span> <span aria-hidden="true">→</span></div>` : ''}
  </article>`;
}

function emptyState(title, detail) {
  return `<div class="empty-state"><span class="empty-icon">◇</span><strong>${title}</strong><span>${detail}</span></div>`;
}

function movementTable(records, limit = records.length) {
  const rows = [...records].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)).slice(0, limit);
  if (!rows.length) return emptyState('Belum ada catatan', 'Transaksi yang dicatat akan muncul di sini.');
  return `<div class="table-wrap"><table><thead><tr><th>TANGGAL</th><th>JENIS</th><th>RINCIAN</th><th>ARAH</th><th class="align-right">JUMLAH</th></tr></thead><tbody>
    ${rows.map((row) => {
      const inventory = 'product_id' in row;
      const directionIn = row.direction === 'in';
      const detail = inventory
        ? `${row.products?.name || 'Produk'}${row.notes ? ` · ${row.notes}` : ''}`
        : `${row.category}${row.description ? ` · ${row.description}` : ''}`;
      return `<tr><td class="date-cell">${formatDate(row.occurred_on)}</td><td>${inventory ? 'Barang' : 'Kas'}</td>
        <td class="detail-cell">${escapeHtml(detail)}</td>
        <td><span class="direction-pill ${directionIn ? 'pill-in' : 'pill-out'}"><span></span>${directionIn ? 'Masuk' : 'Keluar'}</span></td>
        <td class="align-right amount-cell">${inventory ? `${directionIn ? '+' : '−'}${formatQuantity(row.quantity)} ${escapeHtml(row.products?.unit || '')}` : `${directionIn ? '+' : '−'}${formatMoney(row.amount)}`}</td></tr>`;
    }).join('')}
    </tbody></table></div>`;
}

function renderDashboard() {
  const monthCash = monthRecords(state.cash, currentMonth);
  const balance = cashBalance();
  const netMonthCash = cashBalance(monthCash);
  const latest = [
    ...state.inventory.map((row) => ({ ...row, type: 'inventory' })),
    ...state.cash.map((row) => ({ ...row, type: 'cash' })),
  ].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  const inStock = state.products.filter((product) => stockFor(product.id) > 0).length;
  return `${heading('PUSAT KENDALI', 'Selamat datang kembali', 'Pantau posisi stok, arus kas, dan aktivitas operasional Anda.', `
    <button class="button button-primary" data-action="quick-entry"><span>＋</span> Catat transaksi</button>`)}
    <section class="stats-grid">
      ${statCard('Nilai kas saat ini', formatMoney(balance), `${netMonthCash >= 0 ? '+' : '−'}${formatMoney(Math.abs(netMonthCash))} bersih bulan ini`, '↗', 'icon-green')}
      ${statCard('Jenis produk', quantityFormat.format(state.products.length), `${inStock} produk tersedia di stok`, '◇', 'icon-blue')}
      ${statCard('Pergerakan barang', quantityFormat.format(monthRecords(state.inventory, currentMonth).length), 'catatan barang bulan ini', '▦', 'icon-orange')}
      ${statCard('Transaksi kas', quantityFormat.format(monthCash.length), 'catatan keuangan bulan ini', '◎', 'icon-purple')}
    </section>
    <section class="content-card activity-card"><div class="card-heading"><div><h2>Aktivitas terbaru</h2><p>Ringkasan pergerakan barang dan kas</p></div><button class="button button-quiet" data-page="reports">Lihat laporan <span>→</span></button></div>
      ${movementTable(latest, 7)}</section>
    <div class="dashboard-footnote"><span class="status-dot"></span>Angka diperbarui sesuai data ruang kerja Anda.</div>`;
}

function renderProducts() {
  const action = '<button class="button button-primary" data-action="add-product"><span>＋</span> Tambah produk</button>';
  const rows = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  return `${heading('KATALOG', 'Daftar produk', 'Atur nama produk dan pantau ketersediaan barang.', action)}
    <section class="content-card">
      <div class="card-heading"><div><h2>Semua produk <span class="count-badge">${rows.length}</span></h2><p>Produk yang terdaftar di ruang kerja</p></div></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>NAMA PRODUK</th><th>SKU</th><th>HARGA BELI</th><th>HARGA JUAL</th><th>STOK TERSEDIA</th><th>UNIT</th><th></th></tr></thead><tbody>
        ${rows.map((product) => `<tr><td class="detail-cell">${escapeHtml(product.name)}</td><td>${escapeHtml(product.sku || '—')}</td>
          <td>${formatMoney(product.purchase_price || 0)}</td><td>${formatMoney(product.selling_price || 0)}</td>
          <td class="${stockFor(product.id) < 0 ? 'negative-stock' : ''}">${formatQuantity(stockFor(product.id))}</td><td>${escapeHtml(product.unit)}</td>
          <td class="align-right action-cell"><button class="icon-button" data-action="edit-product" data-id="${escapeHtml(product.id)}" aria-label="Ubah ${escapeHtml(product.name)}">✎</button><button class="icon-button danger-icon" data-action="delete-product" data-id="${escapeHtml(product.id)}" aria-label="Hapus ${escapeHtml(product.name)}">×</button></td></tr>`).join('')}
      </tbody></table></div>` : emptyState('Mulai dari produk pertama', 'Tambahkan nama produk untuk mulai mencatat stok.')}</section>`;
}

function renderInventory() {
  const products = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  return `${heading('OPERASIONAL', 'Persediaan barang', 'Catat setiap barang masuk dan keluar agar stok tetap terpantau.', '<button class="button button-primary" data-action="add-inventory"><span>＋</span> Catat pergerakan</button>')}
    <section class="stats-grid compact-stats">${statCard('Jenis produk tersedia', quantityFormat.format(products.filter((product) => stockFor(product.id) > 0).length), 'produk dengan stok di atas nol', '◇', 'icon-blue')}${statCard('Pergerakan bulan ini', quantityFormat.format(monthRecords(state.inventory, currentMonth).length), 'barang masuk dan keluar', '▦', 'icon-orange')}</section>
    <section class="content-card"><div class="card-heading"><div><h2>Riwayat pergerakan</h2><p>Catatan stok terbaru</p></div></div>
    ${state.inventory.length ? movementTable(state.inventory.filter((row) => row.product_id), state.inventory.length) : emptyState('Belum ada pergerakan', 'Catat barang masuk untuk mulai mengelola persediaan.')}</section>`;
}

function renderCash() {
  return `${heading('OPERASIONAL', 'Arus keuangan', 'Catat uang masuk dan keluar untuk memantau posisi kas.', '<button class="button button-primary" data-action="add-cash"><span>＋</span> Catat transaksi</button>')}
    <section class="stats-grid compact-stats">${statCard('Saldo kas tercatat', formatMoney(cashBalance()), 'akumulasi seluruh transaksi', '↗', 'icon-green')}${statCard('Transaksi bulan ini', quantityFormat.format(monthRecords(state.cash, currentMonth).length), 'catatan kas masuk dan keluar', '◎', 'icon-purple')}</section>
    <section class="content-card"><div class="card-heading"><div><h2>Riwayat transaksi</h2><p>Arus kas terbaru</p></div></div>
      ${state.cash.length ? movementTable(state.cash, state.cash.length) : emptyState('Belum ada transaksi kas', 'Catat pemasukan atau pengeluaran untuk mulai.')}</section>`;
}

function calculateMonthlySalary(employee, month) {
  const records = state.payroll.filter((r) => r.employee_id === employee.id && (r.work_date || r.period)?.slice(0, 7) === month);
  const present = records.filter((r) => r.attendance_status === 'present').length;
  const halfDay = records.filter((r) => r.attendance_status === 'half_day').length;
  const permit = records.filter((r) => r.attendance_status === 'permit').length;
  const sick = records.filter((r) => r.attendance_status === 'sick').length;
  const absent = records.filter((r) => r.attendance_status === 'absent').length;

  const effectiveDays = present + (halfDay * 0.5);
  const dailySalary = Number(employee.daily_salary) || 0;
  const baseSalary = Math.round(effectiveDays * dailySalary);

  const totalOvertimeHours = records.reduce((sum, r) => sum + (Number(r.overtime_hours) || 0), 0);
  const overtimeRate = Number(employee.overtime_rate) || 0;
  const overtimeAmount = records.reduce((sum, r) => {
    if (r.overtime_pay !== undefined && r.overtime_pay !== null && r.overtime_pay !== '') {
      return sum + (Number(r.overtime_pay) || 0);
    }
    return sum + Math.round((Number(r.overtime_hours) || 0) * overtimeRate);
  }, 0);

  const totalProduction = records.reduce((sum, r) => sum + (Number(r.production_quantity) || 0), 0);
  const incentiveRate = Number(employee.incentive_per_unit) || 0;
  const incentiveAmount = Math.round(totalProduction * incentiveRate);
  const totalSalary = baseSalary + overtimeAmount + incentiveAmount;

  const payout = (state.payouts || []).find((p) => p.employee_id === employee.id && p.period === month);

  return {
    employee,
    records,
    present,
    halfDay,
    permit,
    sick,
    absent,
    totalDaysMarked: records.length,
    effectiveDays,
    dailySalary,
    baseSalary,
    totalOvertimeHours,
    overtimeRate,
    overtimeAmount,
    totalProduction,
    incentiveRate,
    incentiveAmount,
    totalSalary,
    isPaid: Boolean(payout),
    payout,
  };
}

function payMonthlySalaryModal(employeeId, month) {
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
      <p class="muted" style="margin: 12px 0 16px; font-size: 11px;">
        💡 Mengonfirmasi pembayaran ini akan menandai status gaji pekerja menjadi <strong>Lunas</strong> dan otomatis mencatat transaksi <strong>Kas Keluar (Gaji & Upah Karyawan)</strong> sebesar <strong>${formatMoney(calc.totalSalary)}</strong>.
      </p>
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button type="button" class="button button-primary" data-action="confirm-pay-monthly" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}">
          Konfirmasi & Bayar Gaji (Potong Kas)
        </button>
      </div>
    ` : `
      <div class="dialog-actions" style="margin-top: 16px;">
        <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
        <button type="button" class="button button-outline" data-action="view-employee-attendance" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}">
          Lihat Rincian Absensi 📋
        </button>
      </div>
    `}
  `);
}

function viewEmployeeAttendanceModal(employeeId, month) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return;
  const calc = calculateMonthlySalary(employee, month);
  const rows = [...calc.records].sort((a, b) => (a.work_date || a.period).localeCompare(b.work_date || b.period));

  const tableHtml = rows.length ? `
    <div class="table-wrap" style="max-height: 280px; overflow-y: auto;">
      <table><thead><tr>
        <th>TANGGAL</th>
        <th>KEHADIRAN</th>
        <th>JAM LEMBUR</th>
        <th>PRODUKSI</th>
        <th>ESTIMASI UPAH</th>
        <th>CATATAN</th>
      </tr></thead><tbody>
        ${rows.map((r) => {
          const att = ATTENDANCE_LABELS[r.attendance_status] || { label: r.attendance_status, class: 'status-present' };
          const otHours = Number(r.overtime_hours) || 0;
          return `<tr>
            <td class="date-cell">${formatDate(r.work_date || r.period)}</td>
            <td><span class="status-pill ${att.class}">${att.label}</span></td>
            <td>${otHours > 0 ? `<span class="status-ot">⚡ ${formatQuantity(otHours)} jam</span>` : '<span class="sub-meta">—</span>'}</td>
            <td>${formatQuantity(r.production_quantity)} unit</td>
            <td>${formatMoney(r.total_amount)}</td>
            <td class="detail-cell" style="font-weight: normal; font-size: 9px; color: #88938d;">${escapeHtml(r.notes || '—')}</td>
          </tr>`;
        }).join('')}
      </tbody></table>
    </div>
  ` : emptyState('Belum ada catatan absensi', `Pekerja ini belum memiliki catatan kehadiran pada bulan ${month}.`);

  openDialog(`Rincian Kehadiran — ${escapeHtml(employee.full_name)} (${escapeHtml(month)})`, `
    <div style="margin-bottom: 14px;">
      <div class="att-summary-pills">
        <span class="att-pill-mini status-present">${calc.present}x Hadir</span>
        <span class="att-pill-mini status-half_day">${calc.halfDay}x ½ Hari</span>
        <span class="att-pill-mini status-permit">${calc.permit}x Izin</span>
        <span class="att-pill-mini status-sick">${calc.sick}x Sakit</span>
        <span class="att-pill-mini status-absent">${calc.absent}x Alpa</span>
        ${calc.totalOvertimeHours > 0 ? `<span class="att-pill-mini status-ot" style="background:#fdf3e7; color:#b86e1e;">⚡ ${formatQuantity(calc.totalOvertimeHours)} Jam Lembur</span>` : ''}
        <span style="font-size: 11px; margin-left: 6px; color: #37473f; font-weight: 600;">Total: ${calc.effectiveDays} hari kerja efektif</span>
      </div>
    </div>
    ${tableHtml}
    <div class="slip-box" style="margin-top: 14px;">
      <div class="slip-row"><span>Akumulasi Upah Pokok:</span><strong>${formatMoney(calc.baseSalary)}</strong></div>
      <div class="slip-row"><span>Akumulasi Upah Lembur (${formatQuantity(calc.totalOvertimeHours)} jam):</span><strong style="color: #b86e1e;">${formatMoney(calc.overtimeAmount)}</strong></div>
      <div class="slip-row"><span>Akumulasi Insentif (${formatQuantity(calc.totalProduction)} unit):</span><strong>${formatMoney(calc.incentiveAmount)}</strong></div>
      <div class="slip-row"><span>Total Gaji Periode Ini:</span><strong>${formatMoney(calc.totalSalary)}</strong></div>
    </div>
    <div class="dialog-actions">
      <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
      ${!calc.isPaid ? `
        <button type="button" class="button button-primary" data-action="pay-monthly-salary" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}">
          Bayar Gaji Akhir Bulan
        </button>
      ` : `
        <span class="status-pill status-paid" style="margin-left: auto;">Sudah Dibayar ✓</span>
      `}
    </div>
  `);
}

function openReportDetailModal(type, id, month = currentMonth) {
  if (type === 'cash') {
    const rec = state.cash.find((c) => c.id === id);
    if (!rec) return;
    const isIncome = rec.direction === 'in';
    const catLower = (rec.category || '').toLowerCase();
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

    openDialog(`Pratinjau Transaksi Kas — ${isIncome ? 'Pemasukan' : 'Pengeluaran'}`, `
      <div class="slip-box">
        <div class="slip-row">
          <span>Tipe Transaksi:</span>
          <strong><span class="direction-pill ${isIncome ? 'pill-in' : 'pill-out'}"><span></span>${isIncome ? 'Uang Masuk (Pemasukan)' : 'Uang Keluar (Pengeluaran)'}</span></strong>
        </div>
        <div class="slip-row">
          <span>Tanggal Transaksi:</span>
          <strong>${formatDate(rec.occurred_on)}</strong>
        </div>
        <div class="slip-row">
          <span>Pos / Kategori:</span>
          <strong>${escapeHtml(rec.category)}</strong>
        </div>
        <div class="slip-row">
          <span>Nominal Transaksi:</span>
          <strong style="font-size: 15px; color: ${isIncome ? '#29865c' : '#c93b2b'};">${isIncome ? '+' : '−'}${formatMoney(rec.amount)}</strong>
        </div>
        <div class="slip-row">
          <span>Untuk Apa Uang Tersebut:</span>
          <strong style="color: #37453e;">${escapeHtml(rec.description || '—')}</strong>
        </div>
        <div class="slip-row">
          <span>Klasifikasi Keuangan:</span>
          <strong style="color: #176d51; font-size: 11px;">${financialRole}</strong>
        </div>
        <div class="slip-row">
          <span>Dampak Laba Rugi:</span>
          <span style="font-size: 10px; color: #5a6e63;">${impactText}</span>
        </div>
      </div>
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
        <button type="button" class="button button-primary" data-page="cash" data-action="close-dialog">Buka Menu Keuangan →</button>
      </div>
    `);
  } else if (type === 'inventory') {
    const rec = state.inventory.find((i) => i.id === id);
    if (!rec) return;
    const prod = state.products.find((p) => p.id === rec.product_id) || rec.products;
    const isIn = rec.direction === 'in';
    const purchasePrice = Number(prod?.purchase_price) || 0;
    const sellingPrice = Number(prod?.selling_price) || 0;
    const qty = Number(rec.quantity) || 0;
    const totalCost = Math.round(qty * purchasePrice);
    const totalSale = Math.round(qty * sellingPrice);

    openDialog(`Pratinjau Pergerakan Barang — ${isIn ? 'Barang Masuk' : 'Barang Keluar'}`, `
      <div class="slip-box">
        <div class="slip-row">
          <span>Arah Pergerakan:</span>
          <strong><span class="direction-pill ${isIn ? 'pill-in' : 'pill-out'}"><span></span>${isIn ? 'Barang Masuk (Penerimaan Stok)' : 'Barang Keluar (Pengiriman / Pemakaian)'}</span></strong>
        </div>
        <div class="slip-row">
          <span>Tanggal:</span>
          <strong>${formatDate(rec.occurred_on)}</strong>
        </div>
        <div class="slip-row">
          <span>Nama Produk:</span>
          <strong>${escapeHtml(prod?.name || 'Produk')}</strong>
        </div>
        <div class="slip-row">
          <span>Kode SKU / Satuan:</span>
          <strong>${escapeHtml(prod?.sku || '—')} · ${escapeHtml(prod?.unit || 'unit')}</strong>
        </div>
        <div class="slip-row">
          <span>Jumlah Kuantitas:</span>
          <strong style="font-size: 14px;">${formatQuantity(qty)} ${escapeHtml(prod?.unit || '')}</strong>
        </div>
        <div class="slip-row">
          <span>Harga Beli Modal (HPP):</span>
          <span>${formatMoney(purchasePrice)} / ${escapeHtml(prod?.unit || 'unit')} (Total: ${formatMoney(totalCost)})</span>
        </div>
        <div class="slip-row">
          <span>Harga Jual Produk:</span>
          <span>${formatMoney(sellingPrice)} / ${escapeHtml(prod?.unit || 'unit')} (Total: ${formatMoney(totalSale)})</span>
        </div>
        <div class="slip-row">
          <span>Catatan Kerja / Muatan:</span>
          <strong style="color: #37453e;">${escapeHtml(rec.notes || '—')}</strong>
        </div>
        <div class="slip-row">
          <span>Klasifikasi Operasional:</span>
          <strong style="color: #176d51; font-size: 11px;">${isIn ? 'Penerimaan Stok Gudang (Menambah Persediaan)' : 'Barang Keluar Gudang (Pengiriman Pesanan / Terjual)'}</strong>
        </div>
      </div>
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Tutup</button>
        <button type="button" class="button button-primary" data-page="inventory" data-action="close-dialog">Buka Menu Persediaan →</button>
      </div>
    `);
  } else if (type === 'payroll' || type === 'employee') {
    const emp = state.employees.find((e) => e.id === id);
    if (!emp) return;
    payMonthlySalaryModal(emp.id, month);
  }
}

function renderPayroll() {
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
        const otPay = Number(rec.overtime_pay) || Math.round(otHours * (emp.overtime_rate || 0));
        return `<tr>
          <td class="detail-cell">
            ${escapeHtml(emp.full_name)}
            <span class="sub-meta">${escapeHtml(emp.position)}</span>
          </td>
          <td><span class="status-pill ${attInfo.class}">${attInfo.label}</span></td>
          <td>${otHours > 0 ? `<span class="status-ot">⚡ ${formatQuantity(otHours)} jam</span>` : '<span class="sub-meta">—</span>'}</td>
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
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
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
        <div class="payroll-controls">
          <label class="month-label" for="payroll-month-picker">PERIODE BULAN</label>
          <input class="month-input" id="payroll-month-picker" type="month" value="${escapeHtml(selectedMonth)}" />
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

function renderReports(month = currentMonth) {
  const selectedMonth = (typeof month === 'string' && month) ? month : (state.selectedReportMonth || currentMonth);
  state.selectedReportMonth = selectedMonth;
  const currentFilter = state.selectedReportFilter || 'all';

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

  const incomeRecords = cash.filter((row) => row.direction === 'in');
  const totalIn = incomeRecords.reduce((sum, row) => sum + Number(row.amount), 0);

  const expenseRecords = cash.filter((row) => row.direction === 'out');
  const totalOut = expenseRecords.reduce((sum, row) => sum + Number(row.amount), 0);

  // HPP / Beban Pokok Bahan Baku & Material
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

  // Laba Kotor (Gross Profit)
  const grossProfit = totalIn - totalCogs;
  const grossMargin = totalIn > 0 ? ((grossProfit / totalIn) * 100).toFixed(1) : '0';

  // Beban Operasional Lain (Non-Bahan Baku & Non-Gaji)
  const operationalCashRecords = expenseRecords.filter((row) => {
    const cat = (row.category || '').toLowerCase();
    return !cat.includes('bahan') && !cat.includes('material') && !cat.includes('belanja') && !cat.includes('gaji') && !cat.includes('upah');
  });
  const operationalCash = operationalCashRecords.reduce((sum, row) => sum + Number(row.amount), 0);
  const totalOperatingExpense = operationalCash + totalPayroll;

  // Laba Bersih (Net Profit)
  const netProfit = grossProfit - totalOperatingExpense;
  const netMargin = totalIn > 0 ? ((netProfit / totalIn) * 100).toFixed(1) : '0';

  // Item untuk Pratinjau berdasarkan Filter Aktif
  let filteredItems = [];
  if (currentFilter === 'income') {
    filteredItems = incomeRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: 'Pendapatan (Omzet)' }));
  } else if (currentFilter === 'expense') {
    filteredItems = expenseRecords.map((r) => ({ ...r, itemType: 'cash', financialCategory: 'Pengeluaran Kas' }));
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
    // 'all'
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

  const filterTabs = [
    { key: 'all', label: 'Semua Catatan', count: inventory.length + cash.length + (state.isAdmin ? monthlyCalcs.length : 0) },
    { key: 'gross_profit', label: 'Laba Kotor', count: incomeRecords.length + cogsRecords.length },
    { key: 'net_profit', label: 'Laba Bersih', count: cash.length + (state.isAdmin ? monthlyCalcs.length : 0) },
    { key: 'income', label: 'Pemasukan (Omzet)', count: incomeRecords.length },
    { key: 'expense', label: 'Pengeluaran Kas', count: expenseRecords.length },
    { key: 'cogs', label: 'HPP / Bahan Baku', count: cogsRecords.length },
    { key: 'operational', label: 'Beban Operasional', count: operationalCashRecords.length },
    ...(state.isAdmin ? [{ key: 'payroll', label: 'Gaji & Lembur', count: monthlyCalcs.length }] : []),
    { key: 'inventory', label: 'Persediaan Barang', count: inventory.length },
  ];

  const headingHtml = heading('ANALISIS', 'Laporan bulanan', 'Pilih periode untuk meninjau laba kotor, laba bersih, beban operasional, dan pratinjau catatan.', '');

  const tableRows = filteredItems.length ? `
    <div class="table-wrap"><table><thead><tr>
      <th>TANGGAL</th>
      <th>POS / KATEGORI</th>
      <th>RINCIAN TRANSAKSI</th>
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
          return `<tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="inventory" title="Klik untuk melihat detail pergerakan barang">
            <td class="date-cell">${formatDate(item.occurred_on)}</td>
            <td><strong>Persediaan</strong></td>
            <td class="detail-cell">${escapeHtml(prod?.name || 'Produk')}${item.notes ? `<span class="sub-meta">${escapeHtml(item.notes)}</span>` : ''}</td>
            <td><span class="status-pill status-present" style="font-size: 8px;">Stok ${isIn ? 'Masuk' : 'Keluar'}</span></td>
            <td><span class="direction-pill ${isIn ? 'pill-in' : 'pill-out'}"><span></span>${isIn ? 'Masuk' : 'Keluar'}</span></td>
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
          <td class="detail-cell">${escapeHtml(item.description || item.category)}</td>
          <td><span class="status-pill ${isIncome ? 'status-paid' : 'status-pending'}" style="font-size: 8px;">${escapeHtml(item.financialCategory || 'Kas')}</span></td>
          <td><span class="direction-pill ${isIncome ? 'pill-in' : 'pill-out'}"><span></span>${isIncome ? 'Masuk' : 'Keluar'}</span></td>
          <td class="align-right amount-cell" style="font-weight: 700; color: ${isIncome ? '#29865c' : '#a94438'};">${isIncome ? '+' : '−'}${formatMoney(item.amount)}</td>
          <td class="align-right">
            <button type="button" class="icon-button" data-action="view-report-detail" data-id="${escapeHtml(item.id)}" data-type="cash" title="Pratinjau transaksi kas">🔍</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody></table></div>
  ` : emptyState('Tidak ada catatan untuk kategori ini', 'Pilih tab filter lain untuk melihat catatan operasional periode ini.');

  return `${headingHtml}
    <section class="content-card report-filter-card">
      <div>
        <h2>Pilih periode laporan</h2>
        <p>Analisis laba kotor, laba bersih, persediaan, kas, serta absensi & penggajian akhir bulan.</p>
      </div>
      <div class="report-controls">
        <label class="month-label" for="report-month">BULAN</label>
        <input class="month-input" id="report-month" type="month" value="${escapeHtml(selectedMonth)}" />
        <button class="button button-primary" data-action="download-report">↓ Unduh CSV</button>
      </div>
    </section>

    <!-- KARTU INDIKATOR KEUANGAN UTAMA (INTERAKTIF & DAPAT DIKLIK) -->
    <section class="stats-grid compact-stats">
      ${statCard('Laba Bersih (Net Profit)', formatMoney(netProfit), `Net Margin: ${netMargin}% (Setelah beban & gaji)`, netProfit >= 0 ? '↗' : '↘', netProfit >= 0 ? 'icon-green' : 'icon-orange', { clickable: true, filter: 'net_profit', isActive: currentFilter === 'net_profit' })}
      ${statCard('Laba Kotor (Gross Profit)', formatMoney(grossProfit), `Gross Margin: ${grossMargin}% (Omzet − HPP)`, '◎', 'icon-blue', { clickable: true, filter: 'gross_profit', isActive: currentFilter === 'gross_profit' })}
      ${statCard('Pemasukan (Omzet)', formatMoney(totalIn), `${incomeRecords.length} transaksi penjualan`, '↗', 'icon-green', { clickable: true, filter: 'income', isActive: currentFilter === 'income' })}
      ${statCard('HPP / Belanja Bahan', formatMoney(totalCogs), `${cogsRecords.length} transaksi belanja modal`, '↘', 'icon-orange', { clickable: true, filter: 'cogs', isActive: currentFilter === 'cogs' })}
      ${statCard('Total Pengeluaran Kas', formatMoney(totalOut), `${expenseRecords.length} transaksi kas keluar`, '↘', 'icon-orange', { clickable: true, filter: 'expense', isActive: currentFilter === 'expense' })}
      ${state.isAdmin ? statCard('Beban Gaji & Lembur', formatMoney(totalPayroll), `${activeEmployees.length} pekerja (${formatQuantity(totalOvertimeHours)} jam lembur)`, '◎', 'icon-purple', { clickable: true, filter: 'payroll', isActive: currentFilter === 'payroll' }) : ''}
      ${statCard('Beban Operasional Lain', formatMoney(operationalCash), 'Listrik, mesin, pemeliharaan', '◷', 'icon-orange', { clickable: true, filter: 'operational', isActive: currentFilter === 'operational' })}
      ${statCard('Barang Masuk/Keluar', quantityFormat.format(inventory.length), 'catatan pergerakan stok gudang', '▦', 'icon-blue', { clickable: true, filter: 'inventory', isActive: currentFilter === 'inventory' })}
    </section>

    <!-- LAPORAN LABA RUGI KOMPREHENSIF (INCOME STATEMENT) -->
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
        <!-- BOX 1: LABA KOTOR (GROSS PROFIT) -->
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

        <!-- BOX 2: LABA BERSIH (NET PROFIT) -->
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

    <!-- PRATINJAU INTERAKTIF CATATAN LAPORAN -->
    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Pratinjau rincian catatan <span class="count-badge">${filteredItems.length} ditampilkan</span></h2>
          <p>Klik kolom atau baris pada tabel untuk membuka pratinjau detail transaksi secara lengkap</p>
        </div>
      </div>

      <!-- TAB FILTER CEPAT -->
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

function renderPage() {
  const pages = {
    dashboard: ['Ringkasan', renderDashboard],
    inventory: ['Persediaan', renderInventory],
    cash: ['Keuangan', renderCash],
    products: ['Produk', renderProducts],
    payroll: ['Absensi & gaji', renderPayroll],
    reports: ['Laporan', () => renderReports(state.selectedReportMonth || currentMonth)],
  };
  if (!pages[state.page] || (state.page === 'payroll' && !state.isAdmin)) state.page = 'dashboard';
  const [label, render] = pages[state.page];
  document.querySelector('#page-crumb').textContent = label;
  const content = document.querySelector('#page-content');
  content.innerHTML = render();
  content.onclick = handlePageAction;
  content.onchange = (event) => {
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
  };
}



async function refreshData() {
  if (state.isDemo) {
    state.products = demoStore.get('products');
    state.inventory = demoStore.get('inventory').map((inv) => ({
      ...inv,
      products: state.products.find((p) => p.id === inv.product_id) || null,
    }));
    state.cash = demoStore.get('cash');
    if (state.isAdmin) {
      state.employees = demoStore.get('employees');
      state.payroll = demoStore.get('payroll').map((pay) => ({
        ...pay,
        employees: state.employees.find((e) => e.id === pay.employee_id) || null,
      }));
      state.payouts = demoStore.get('payouts') || [];
    } else {
      state.employees = [];
      state.payroll = [];
      state.payouts = [];
    }
    return;
  }
  const requests = [
    supabase.from('products').select('*').order('name'),
    supabase.from('inventory_movements').select('*, products(name, unit)').order('occurred_on', { ascending: false }),
    supabase.from('cash_transactions').select('*').order('occurred_on', { ascending: false }),
  ];
  if (state.isAdmin) {
    requests.push(
      supabase.from('employees').select('*').order('full_name'),
      supabase.from('payroll_records').select('*, employees(full_name, daily_salary, incentive_per_unit)').order('work_date', { ascending: false }),
      supabase.from('payroll_payouts').select('*').order('paid_at', { ascending: false }),
    );
  }
  const results = await Promise.all(requests);
  const failed = results.slice(0, 5).find((result) => result.error);
  if (failed) throw failed.error;
  [state.products, state.inventory, state.cash] = results.slice(0, 3).map((result) => result.data || []);
  if (state.isAdmin) {
    state.employees = results[3].data || [];
    state.payroll = results[4].data || [];
    state.payouts = (results[5] && !results[5].error ? results[5].data : []) || [];
  } else {
    state.employees = [];
    state.payroll = [];
    state.payouts = [];
  }
}


function openDialog(title, body) {
  const dialog = document.querySelector('#app-dialog');
  document.querySelector('#dialog-content').innerHTML = `
    <div class="dialog-heading"><div><p class="eyebrow">RUANG KERJA</p><h2>${title}</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Tutup">×</button></div>${body}`;
  dialog.showModal();
}

function productForm(product = null) {
  openDialog(product ? 'Ubah produk' : 'Tambah produk', `
    <form id="product-form" class="form-stack">
      <label>Nama produk<input name="name" maxlength="120" value="${escapeHtml(product?.name || '')}" placeholder="Contoh: Kemasan ukuran sedang" required /></label>
      <div class="form-row"><label>SKU <span class="optional">(opsional)</span><input name="sku" maxlength="60" value="${escapeHtml(product?.sku || '')}" placeholder="Contoh: KMS-001" /></label>
      <label>Satuan<input name="unit" maxlength="24" value="${escapeHtml(product?.unit || 'pcs')}" placeholder="pcs, kg, box" required /></label></div>
      <div class="form-row">
        <label>Harga beli per unit (Rp) <span class="optional">(saat belanja)</span>
          <input name="purchase_price" type="number" min="0" step="1" value="${escapeHtml(product?.purchase_price ?? '')}" placeholder="0" />
        </label>
        <label>Harga jual per unit (Rp) <span class="optional">(saat keluar)</span>
          <input name="selling_price" type="number" min="0" step="1" value="${escapeHtml(product?.selling_price ?? '')}" placeholder="0" />
        </label>
      </div>
      <div class="dialog-actions"><button type="button" class="button button-quiet" data-action="close-dialog">Batal</button><button class="button button-primary" type="submit">${product ? 'Simpan perubahan' : 'Simpan produk'}</button></div>
    </form>`);
  document.querySelector('#product-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('name').trim(),
      sku: form.get('sku').trim() || null,
      unit: form.get('unit').trim(),
      purchase_price: Number(form.get('purchase_price')) || 0,
      selling_price: Number(form.get('selling_price')) || 0,
    };
    await runMutation(async () => {
      if (state.isDemo) {
        if (product) {
          demoStore.update('products', product.id, payload);
        } else {
          demoStore.insert('products', payload);
        }
        return null;
      }
      const result = product
        ? await supabase.from('products').update(payload).eq('id', product.id)
        : await supabase.from('products').insert(payload);
      return result.error;
    }, product ? 'Perubahan produk disimpan.' : 'Produk berhasil ditambahkan.');
  });
}

function inventoryForm() {
  if (!state.products.length) {
    notify('Tambahkan produk terlebih dahulu sebelum mencatat persediaan.', 'error');
    state.page = 'products';
    renderShell();
    return;
  }
  const options = state.products.map((product) => `
    <option value="${escapeHtml(product.id)}" data-purchase="${product.purchase_price || 0}" data-selling="${product.selling_price || 0}" data-unit="${escapeHtml(product.unit)}">
      ${escapeHtml(product.name)} · stok ${formatQuantity(stockFor(product.id))} ${escapeHtml(product.unit)}
    </option>`).join('');

  openDialog('Catat pergerakan barang', `
    <form id="inventory-form" class="form-stack">
      <label>Produk<select name="product_id" id="inv-product" required>${options}</select></label>
      <div class="form-row">
        <label>Jenis pergerakan
          <select name="direction" id="inv-direction" required>
            <option value="in">Barang Masuk (Belanja / Beli)</option>
            <option value="out">Barang Keluar (Penjualan)</option>
          </select>
        </label>
        <label>Jumlah<input name="quantity" id="inv-qty" type="number" min="0.01" step="0.01" placeholder="0" required /></label>
      </div>

      <div class="formula-note" id="inv-cash-box" style="margin: 3px 0 4px; padding: 12px 14px; border-radius: 8px;">
        <label class="checkbox-label" style="font-weight: 700; color: #187554; display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" name="sync_cash" id="inv-sync-cash" checked />
          <span>Sinkronkan ke Keuangan Otomatis</span>
        </label>
        <div id="inv-cash-fields">
          <div class="form-row">
            <label id="inv-unit-price-label">Harga Beli Satuan (Rp)
              <input name="unit_price" id="inv-unit-price" type="number" min="0" step="1" placeholder="0" />
            </label>
            <label>Total Nominal Kas (Rp)
              <input name="total_amount" id="inv-total-amount" type="number" min="0" step="1" placeholder="0" />
            </label>
          </div>
          <div id="inv-cash-desc" style="font-size: 10px; color: #3a6850; margin-top: 6px; line-height: 1.5;">
            💡 Dicatat sebagai <strong>Kas Keluar (Belanja Barang)</strong>.
          </div>
        </div>
      </div>

      <label>Tanggal<input name="occurred_on" type="date" value="${localDate}" required /></label>
      <label>Catatan / Keterangan <span class="optional">(opsional)</span><input name="notes" maxlength="240" placeholder="Keterangan transaksi atau nama supplier/pembeli" /></label>
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button class="button button-primary" type="submit">Simpan catatan</button>
      </div>
    </form>`);

  const form = document.querySelector('#inventory-form');
  const productSelect = form.querySelector('#inv-product');
  const dirSelect = form.querySelector('#inv-direction');
  const qtyInput = form.querySelector('#inv-qty');
  const syncCash = form.querySelector('#inv-sync-cash');
  const cashFields = form.querySelector('#inv-cash-fields');
  const priceLabel = form.querySelector('#inv-unit-price-label');
  const unitPriceInput = form.querySelector('#inv-unit-price');
  const totalAmountInput = form.querySelector('#inv-total-amount');
  const cashDesc = form.querySelector('#inv-cash-desc');

  function updatePricing(autoFill = true) {
    const selectedOption = productSelect.selectedOptions[0];
    const isIncoming = dirSelect.value === 'in';
    const defaultPrice = Number(isIncoming ? selectedOption?.dataset.purchase : selectedOption?.dataset.selling) || 0;

    if (autoFill) {
      unitPriceInput.value = defaultPrice || '';
    }

    priceLabel.childNodes[0].nodeValue = isIncoming ? 'Harga Beli Satuan (Rp) ' : 'Harga Jual Satuan (Rp) ';

    const qty = Number(qtyInput.value) || 0;
    const unitPrice = Number(unitPriceInput.value) || 0;
    const calcTotal = Math.round(qty * unitPrice);

    if (autoFill || !totalAmountInput.value) {
      totalAmountInput.value = calcTotal || '';
    }

    const currentTotal = Number(totalAmountInput.value) || calcTotal;
    if (isIncoming) {
      cashDesc.innerHTML = `💡 Otomatis dicatat sebagai <strong>Kas Keluar (Belanja Barang)</strong> sebesar <strong>${formatMoney(currentTotal)}</strong>.`;
    } else {
      cashDesc.innerHTML = `💡 Otomatis dicatat sebagai <strong>Kas Masuk (Penjualan Produk)</strong> sebesar <strong>${formatMoney(currentTotal)}</strong>.`;
    }
  }

  productSelect.addEventListener('change', () => updatePricing(true));
  dirSelect.addEventListener('change', () => updatePricing(true));
  qtyInput.addEventListener('input', () => {
    const qty = Number(qtyInput.value) || 0;
    const unitPrice = Number(unitPriceInput.value) || 0;
    totalAmountInput.value = Math.round(qty * unitPrice) || '';
    updatePricing(false);
  });
  unitPriceInput.addEventListener('input', () => {
    const qty = Number(qtyInput.value) || 0;
    const unitPrice = Number(unitPriceInput.value) || 0;
    totalAmountInput.value = Math.round(qty * unitPrice) || '';
    updatePricing(false);
  });
  totalAmountInput.addEventListener('input', () => updatePricing(false));
  syncCash.addEventListener('change', () => {
    cashFields.style.display = syncCash.checked ? 'block' : 'none';
  });

  updatePricing(true);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const pId = formData.get('product_id');
    const dir = formData.get('direction');
    const qty = Number(formData.get('quantity'));
    const occ = formData.get('occurred_on');
    const notes = formData.get('notes').trim();
    const shouldSyncCash = formData.has('sync_cash');
    const totalAmount = Number(formData.get('total_amount')) || 0;

    const product = state.products.find((item) => item.id === pId);
    const prodName = product?.name || 'Produk';
    const prodUnit = product?.unit || 'unit';

    await runMutation(async () => {
      if (state.isDemo) {
        if (dir === 'out' && qty > stockFor(pId)) {
          return { message: `Stok tidak mencukupi. Stok tersedia: ${formatQuantity(stockFor(pId))}` };
        }
        demoStore.insert('inventory', {
          product_id: pId,
          direction: dir,
          quantity: qty,
          occurred_on: occ,
          notes,
        });

        if (shouldSyncCash && totalAmount > 0) {
          demoStore.insert('cash', {
            direction: dir === 'in' ? 'out' : 'in',
            amount: totalAmount,
            category: dir === 'in' ? 'Belanja Bahan Baku / Barang' : 'Penjualan Produk',
            description: dir === 'in'
              ? `Belanja ${formatQuantity(qty)} ${prodUnit} ${prodName}${notes ? ` · ${notes}` : ''}`
              : `Penjualan ${formatQuantity(qty)} ${prodUnit} ${prodName}${notes ? ` · ${notes}` : ''}`,
            occurred_on: occ,
          });
        }
        return null;
      }

      const { error: invError } = await supabase.from('inventory_movements').insert({
        product_id: pId,
        direction: dir,
        quantity: qty,
        occurred_on: occ,
        notes,
      });
      if (invError) return invError;

      if (shouldSyncCash && totalAmount > 0) {
        const { error: cashError } = await supabase.from('cash_transactions').insert({
          direction: dir === 'in' ? 'out' : 'in',
          amount: totalAmount,
          category: dir === 'in' ? 'Belanja Bahan Baku / Barang' : 'Penjualan Produk',
          description: dir === 'in'
            ? `Belanja ${formatQuantity(qty)} ${prodUnit} ${prodName}${notes ? ` · ${notes}` : ''}`
            : `Penjualan ${formatQuantity(qty)} ${prodUnit} ${prodName}${notes ? ` · ${notes}` : ''}`,
          occurred_on: occ,
        });
        if (cashError) return cashError;
      }
      return null;
    }, shouldSyncCash && totalAmount > 0
      ? 'Pergerakan barang dan transaksi kas berhasil dicatat.'
      : 'Pergerakan barang berhasil dicatat.');
  });
}

function cashForm() {
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

  dirSelect.addEventListener('change', () => {
    if (dirSelect.value === 'out') {
      descLabel.childNodes[0].nodeValue = 'Catatan / Untuk Apa Uang Tersebut ';
      descInput.placeholder = 'Wajib diisi: contoh operasional alat, listrik pabrik, dll.';
    } else {
      descLabel.childNodes[0].nodeValue = 'Catatan Sumber Uang Masuk ';
      descInput.placeholder = 'Wajib diisi: contoh penjualan barang, pelunasan nota, dll.';
    }
  });

  document.querySelector('#cash-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runMutation(async () => {
      const payload = {
        direction: form.get('direction'),
        amount: Number(form.get('amount')),
        category: form.get('category').trim(),
        description: form.get('description').trim(),
        occurred_on: form.get('occurred_on'),
      };
      if (state.isDemo) {
        demoStore.insert('cash', payload);
        return null;
      }
      const { error } = await supabase.from('cash_transactions').insert(payload);
      return error;
    }, 'Transaksi kas berhasil dicatat.');
  });
}

function employeeForm(employee = null) {
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
      if (state.isDemo) {
        if (employee) {
          demoStore.update('employees', employee.id, payload);
        } else {
          demoStore.insert('employees', { ...payload, is_active: true });
        }
        return null;
      }
      const result = employee
        ? await supabase.from('employees').update(payload).eq('id', employee.id)
        : await supabase.from('employees').insert(payload);
      return result.error;
    }, employee ? 'Data karyawan diperbarui.' : 'Karyawan berhasil ditambahkan.');
  });
}

function attendanceForm(record = null, defaultEmpId = null, defaultDate = null) {
  const activeEmployees = state.employees.filter((employee) => employee.is_active);
  if (!activeEmployees.length) {
    notify('Tambahkan karyawan aktif terlebih dahulu.', 'error');
    return;
  }
  const selectedEmpId = record?.employee_id || defaultEmpId || activeEmployees[0].id;
  const targetDate = record?.work_date || record?.period || defaultDate || state.selectedPayrollDate || localDate;
  const initialStatus = record?.attendance_status || 'present';
  const initialQty = record?.production_quantity ?? 0;
  const initialOtHours = record?.overtime_hours ?? 0;
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

      <div class="form-row">
        <label>Jam lembur hari ini (jam)
          <input name="overtime_hours" id="att-ot-hours" type="number" min="0" max="24" step="0.5" value="${escapeHtml(initialOtHours)}" placeholder="0" />
        </label>
        <label>Tarif lembur pekerja (Rp/jam)
          <input id="att-ot-rate" type="text" readonly style="background:#f9fbf9; color:#526b5c;" />
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

  function calculateWage(autoFillWage = true) {
    const selectedOption = empSelect.selectedOptions[0];
    const dailySalary = Number(selectedOption?.dataset?.daily) || 0;
    const overtimeRate = Number(selectedOption?.dataset?.overtime) || 0;
    const incentiveRate = Number(selectedOption?.dataset?.incentive) || 0;
    const status = statusSelect.value;
    const rateMultiplier = ATTENDANCE_LABELS[status]?.rate ?? 0;
    const standardDailyWage = Math.round(dailySalary * rateMultiplier);

    if (autoFillWage || wageInput.value === '') {
      wageInput.value = standardDailyWage;
    }
    if (otRateInput) {
      otRateInput.value = `${formatMoney(overtimeRate)} / jam`;
    }

    const currentWage = Number(wageInput.value) || 0;
    const otHours = Number(otHoursInput.value) || 0;
    const otPay = Math.round(otHours * overtimeRate);
    const qty = Number(qtyInput.value) || 0;
    const incentiveAmount = Math.round(qty * incentiveRate);
    const totalWage = currentWage + otPay + incentiveAmount;

    summaryBox.innerHTML = `
      <strong>Estimasi Nilai Kerja Hari Ini:</strong><br />
      • Upah pokok: <strong>${formatMoney(currentWage)}</strong> (${ATTENDANCE_LABELS[status]?.label || status})<br />
      • Upah lembur: ${formatQuantity(otHours)} jam × ${formatMoney(overtimeRate)} = <strong style="color: #b86e1e;">${formatMoney(otPay)}</strong><br />
      • Insentif produksi: ${formatQuantity(qty)} unit × ${formatMoney(incentiveRate)} = <strong>${formatMoney(incentiveAmount)}</strong><br />
      • <strong>Total estimasi hari ini: ${formatMoney(totalWage)}</strong> (diakumulasi untuk gaji akhir bulan)
    `;
  }

  empSelect.addEventListener('change', () => calculateWage(true));
  statusSelect.addEventListener('change', () => calculateWage(true));
  wageInput.addEventListener('input', () => calculateWage(false));
  qtyInput.addEventListener('input', () => calculateWage(false));
  otHoursInput.addEventListener('input', () => calculateWage(false));

  if (record) {
    wageInput.value = record.daily_wage || record.base_salary;
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
    const notes = (formData.get('notes') || '').trim();

    const emp = activeEmployees.find((e) => e.id === empId);
    if (!emp) {
      showError('Data karyawan tidak valid.');
      return;
    }

    const otRate = Number(emp.overtime_rate) || 0;
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
      if (state.isDemo) {
        if (record) {
          demoStore.update('payroll', record.id, payload);
        } else {
          const existing = state.payroll.find((p) => p.employee_id === empId && (p.work_date || p.period) === workDate);
          if (existing) {
            demoStore.update('payroll', existing.id, payload);
          } else {
            demoStore.insert('payroll', payload);
          }
        }
        return null;
      }

      if (record) {
        const { error } = await supabase.from('payroll_records').update(payload).eq('id', record.id);
        if (error) return error;
      } else {
        const { data: existing } = await supabase.from('payroll_records')
          .select('id')
          .eq('employee_id', empId)
          .eq('work_date', workDate)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase.from('payroll_records').update(payload).eq('id', existing.id);
          if (error) return error;
        } else {
          const { error } = await supabase.from('payroll_records').insert(payload);
          if (error) return error;
        }
      }
      return null;
    }, 'Catatan absensi berhasil disimpan.');
  });
}


function payrollForm() {
  attendanceForm();
}


async function runMutation(operation, successMessage) {
  const submit = document.querySelector('#dialog-content form button[type="submit"]');
  if (submit) {
    submit.disabled = true;
    submit.textContent = 'Menyimpan…';
  }
  try {
    const error = await operation();
    if (error) {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Coba lagi';
      }
      showError(error.message || 'Data gagal disimpan. Silakan coba lagi.');
      return;
    }
    document.querySelector('#app-dialog').close();
    try {
      await refreshData();
      renderShell();
      notify(successMessage);
    } catch (refreshError) {
      showError(`Data tersimpan, tetapi tampilan gagal diperbarui: ${refreshError.message}`);
    }
  } catch (error) {
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'Coba lagi';
    }
    showError(`Data gagal disimpan: ${error.message || 'Periksa koneksi, lalu coba lagi.'}`);
  }
}

function csvCell(value) {
  let cell = String(value ?? '');
  if (/^\s*[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}

function downloadReport(month) {
  const inventory = monthRecords(state.inventory, month);
  const cash = monthRecords(state.cash, month);
  const activeEmployees = state.employees.filter((emp) => emp.is_active);
  const monthlyCalcs = activeEmployees.map((emp) => calculateMonthlySalary(emp, month));

  const totalIn = cash.filter((r) => r.direction === 'in').reduce((sum, r) => sum + Number(r.amount), 0);
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

  const rows = [
    ['RINGKASAN LAPORAN KEUANGAN & OPERASIONAL BULANAN'],
    ['Periode Bulan', month],
    ['Total Pendapatan Penjualan (Omzet)', totalIn],
    ['Beban Pokok Penjualan (HPP / Bahan Baku)', totalCogs],
    ['Laba Kotor (Gross Profit)', grossProfit],
    ['Margin Laba Kotor', `${grossMargin}%`],
    ['Total Beban Gaji & Upah Karyawan', totalPayroll],
    ['Beban Operasional Lainnya', operationalCash],
    ['Total Beban Operasional', totalOperatingExpense],
    ['Laba Bersih Operasional (Net Profit)', netProfit],
    ['Margin Laba Bersih', `${netMargin}%`],
    [],
    ['Tanggal', 'Jenis catatan', 'Nama/rincian', 'Arah', 'Jumlah/unit', 'Nilai (IDR)', 'Status', 'Catatan']
  ];

  for (const item of inventory) {
    rows.push([
      item.occurred_on,
      'Persediaan',
      item.products?.name || 'Produk',
      item.direction === 'in' ? 'Masuk' : 'Keluar',
      `${item.quantity} ${item.products?.unit || ''}`.trim(),
      '',
      '',
      item.notes,
    ]);
  }
  for (const item of cash) {
    const isIncome = item.direction === 'in';
    const catLower = (item.category || '').toLowerCase();
    const role = isIncome ? 'Pendapatan (Omzet)' : (catLower.includes('bahan') ? 'HPP / Bahan Baku' : 'Beban Operasional');
    rows.push([
      item.occurred_on,
      'Keuangan',
      item.category,
      isIncome ? 'Masuk' : 'Keluar',
      '',
      item.amount,
      role,
      item.description,
    ]);
  }
  if (state.isAdmin) {
    for (const emp of activeEmployees) {
      const calc = calculateMonthlySalary(emp, month);
      rows.push([
        monthEnd(month),
        'Gaji Bulanan',
        `${emp.full_name} (${calc.effectiveDays} hari kerja, ${calc.totalOvertimeHours} jam lembur)`,
        'Keluar',
        `${formatQuantity(calc.totalProduction)} unit`,
        calc.totalSalary,
        calc.isPaid ? 'Lunas' : 'Belum dibayar',
        `Pokok: ${formatMoney(calc.baseSalary)}; Lembur: ${formatMoney(calc.overtimeAmount)}; Insentif: ${formatMoney(calc.incentiveAmount)}`.trim(),
      ]);
    }

    for (const item of monthRecords(state.payroll, month, 'work_date')) {
      const attLabel = ATTENDANCE_LABELS[item.attendance_status]?.label || item.attendance_status || 'Hadir';
      rows.push([
        item.work_date || item.period,
        'Detail Absensi Harian',
        `${item.employees?.full_name || 'Karyawan'} (${attLabel})`,
        '',
        `${item.production_quantity || 0} unit`,
        item.total_amount,
        item.overtime_hours > 0 ? `Lembur ${item.overtime_hours} jam` : '',
        `Upah: ${formatMoney(item.daily_wage || item.base_salary)}; Lembur: ${formatMoney(item.overtime_pay || 0)}; Insentif: ${formatMoney(item.incentive_amount || 0)}; ${item.notes || ''}`.trim(),
      ]);
    }
  }
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `laporan-operasional-${month}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function handlePageAction(event) {
  const navigation = event.target.closest('[data-page]');
  if (navigation) {
    event.preventDefault();
    state.page = navigation.dataset.page;
    renderShell();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'close-dialog') {
    document.querySelector('#app-dialog').close();
  } else if (action === 'quick-entry') {
    openDialog('Catat transaksi', `<div class="quick-actions"><button class="quick-action-card" data-action="add-inventory"><span class="quick-action-icon icon-blue">▦</span><strong>Pergerakan barang</strong><small>Catat stok masuk atau keluar</small><span class="quick-action-arrow">→</span></button><button class="quick-action-card" data-action="add-cash"><span class="quick-action-icon icon-green">↗</span><strong>Transaksi kas</strong><small>Catat uang masuk atau keluar</small><span class="quick-action-arrow">→</span></button></div>`);
  } else if (action === 'add-product') {
    productForm();
  } else if (action === 'edit-product') {
    productForm(state.products.find((product) => product.id === id));
  } else if (action === 'delete-product') {
    const product = state.products.find((item) => item.id === id);
    if (!product || !window.confirm(`Hapus produk "${product.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    if (state.isDemo) {
      const hasHistory = state.inventory.some((item) => item.product_id === id);
      if (hasHistory) {
        showError('Produk tidak dapat dihapus karena sudah memiliki riwayat pergerakan barang.');
        return;
      }
      demoStore.delete('products', id);
      await refreshData();
      renderShell();
      notify('Produk berhasil dihapus.');
      return;
    }
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      showError(error.message.includes('foreign key') || error.code === '23503'
        ? 'Produk tidak dapat dihapus karena sudah memiliki riwayat pergerakan barang.'
        : `Produk gagal dihapus: ${error.message}`);
      return;
    }
    try {
      await refreshData();
      renderShell();
      notify('Produk berhasil dihapus.');
    } catch (error) {
      showError(`Produk terhapus, tetapi tampilan gagal diperbarui: ${error.message}`);
    }
  } else if (action === 'add-inventory') {
    document.querySelector('#app-dialog').close();
    inventoryForm();
  } else if (action === 'add-cash') {
    document.querySelector('#app-dialog').close();
    cashForm();
  } else if (action === 'add-employee') {
    employeeForm();
  } else if (action === 'edit-employee') {
    employeeForm(state.employees.find((employee) => employee.id === id));
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

    if (state.isDemo) {
      const existing = state.payroll.find((p) => p.employee_id === employeeId && (p.work_date || p.period) === targetDate);
      if (existing) {
        demoStore.update('payroll', existing.id, payload);
      } else {
        demoStore.insert('payroll', payload);
      }
      await refreshData();
      renderShell();
      notify(`Absensi ${employee.full_name} (${ATTENDANCE_LABELS[status]?.label || status}) berhasil dicatat.`);
      return;
    }

    const { data: existing, error: findError } = await supabase.from('payroll_records')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('work_date', targetDate)
      .maybeSingle();

    if (findError) {
      showError(`Gagal memeriksa absensi: ${findError.message}`);
      return;
    }

    const { error: saveError } = existing
      ? await supabase.from('payroll_records').update(payload).eq('id', existing.id)
      : await supabase.from('payroll_records').insert(payload);

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

    if (state.isDemo) {
      demoStore.delete('payroll', id);
      await refreshData();
      renderShell();
      notify('Catatan absensi berhasil dihapus.');
      return;
    }

    const { error } = await supabase.from('payroll_records').delete().eq('id', id);
    if (error) {
      showError(`Gagal menghapus absensi: ${error.message}`);
      return;
    }
    await refreshData();
    renderShell();
    notify('Catatan absensi berhasil dihapus.');
  } else if (action === 'pay-monthly-salary') {
    const month = button.dataset.month || state.selectedPayrollMonth || currentMonth;
    payMonthlySalaryModal(id, month);
  } else if (action === 'view-employee-attendance') {
    const month = button.dataset.month || state.selectedPayrollMonth || currentMonth;
    viewEmployeeAttendanceModal(id, month);
  } else if (action === 'confirm-pay-monthly') {
    const month = button.dataset.month || state.selectedPayrollMonth || currentMonth;
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

    if (state.isDemo) {
      demoStore.insert('payouts', payoutPayload);
      if (calc.totalSalary > 0) {
        demoStore.insert('cash', cashPayload);
      }
      document.querySelector('#app-dialog').close();
      await refreshData();
      renderShell();
      notify(`Gaji bulan ${month} untuk ${employee.full_name} berhasil dibayarkan dan dicatat ke kas.`);
      return;
    }

    // Supabase
    const { error: payoutError } = await supabase.from('payroll_payouts').insert(payoutPayload);
    if (payoutError) {
      showError(`Gagal memproses pembayaran gaji: ${payoutError.message}`);
      return;
    }

    if (calc.totalSalary > 0) {
      const { error: cashError } = await supabase.from('cash_transactions').insert(cashPayload);
      if (cashError) {
        showError(`Gaji tersimpan, namun pencatatan kas gagal: ${cashError.message}`);
      }
    }

    document.querySelector('#app-dialog').close();
    await refreshData();
    renderShell();
    notify(`Gaji bulan ${month} untuk ${employee.full_name} berhasil dibayarkan dan dicatat ke kas.`);
  } else if (action === 'cancel-monthly-salary') {
    if (!window.confirm('Batalkan status pembayaran gaji ini?')) return;

    if (state.isDemo) {
      demoStore.delete('payouts', id);
      await refreshData();
      renderShell();
      notify('Status pembayaran gaji berhasil dibatalkan.');
      return;
    }

    const { error } = await supabase.from('payroll_payouts').delete().eq('id', id);
    if (error) {
      showError(`Gagal membatalkan pembayaran: ${error.message}`);
      return;
    }
    await refreshData();
    renderShell();
    notify('Status pembayaran gaji berhasil dibatalkan.');
  } else if (action === 'reset-demo') {
    if (!window.confirm('Reset data demo ke kondisi awal? Seluruh perubahan lokal akan dikembalikan.')) return;
    demoStore.reset();
    await refreshData();
    renderShell();
    notify('Data demo telah direset ke kondisi awal.');
  } else if (action === 'download-report') {
    const month = document.querySelector('#report-month')?.value;
    if (!month) {
      showError('Pilih bulan laporan terlebih dahulu.');
      return;
    }
    downloadReport(month);
  } else if (action === 'filter-report') {
    state.selectedReportFilter = button.dataset.filter || 'all';
    renderPage();
  } else if (action === 'view-report-detail') {
    openReportDetailModal(button.dataset.type, button.dataset.id, state.selectedReportMonth || currentMonth);
  }
}

async function enterDemoWorkspace(role = 'admin') {
  state.isDemo = true;
  state.user = {
    id: 'demo-user-id',
    email: 'admin@perusahaan.id',
    user_metadata: { username: 'admin' },
    app_metadata: { role },
  };
  state.isAdmin = role === 'admin';
  demoStore.load();
  await refreshData();
  state.page = 'dashboard';
  renderShell();
  notify('Mode Demo aktif! Anda dapat mencoba seluruh fitur dengan data simulasi.');
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const identifier = (form.get('userId') || '').trim();

  if (identifier.toLowerCase() === 'demo' || !supabase) {
    await enterDemoWorkspace();
    return;
  }

  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Memeriksa akses…';
  const email = formatAuthIdentifier(identifier);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: form.get('password'),
  });
  if (error) {
    renderLogin('ID pengguna atau kata sandi tidak benar. Periksa kembali, lalu coba lagi.');
    return;
  }
  await enterWorkspace(data.user);
}

async function enterWorkspace(user) {
  state.user = user;
  state.isAdmin = user.app_metadata?.role === 'admin';
  try {
    await refreshData();
    state.page = 'dashboard';
    renderShell();
    subscribeToWorkspace();
  } catch (error) {
    renderLogin(`Gagal memuat data ruang kerja: ${error.message}. Pastikan skema database dan kebijakan akses sudah dijalankan.`);
    await supabase.auth.signOut();
  }
}

function subscribeToWorkspace() {
  if (state.isDemo || !supabase) return;
  if (workspaceChannel) supabase.removeChannel(workspaceChannel);
  workspaceChannel = supabase.channel(`workspace:${state.user.id}`);
  for (const table of ['products', 'inventory_movements', 'cash_transactions', 'employees', 'payroll_records']) {
    workspaceChannel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
    }, () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        try {
          await refreshData();
          renderShell();
        } catch (error) {
          showError(`Pembaruan data gagal: ${error.message}`);
        }
      }, 250);
    });
  }
  workspaceChannel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      showError('Pembaruan langsung terputus. Muat ulang halaman untuk mengambil data terbaru.');
    }
  });
}

async function handleSignOut() {
  if (state.isDemo) {
    state.isDemo = false;
    state.user = null;
    state.isAdmin = false;
    state.page = 'dashboard';
    state.products = [];
    state.inventory = [];
    state.cash = [];
    state.employees = [];
    state.payroll = [];
    start();
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    showError(`Gagal keluar: ${error.message}`);
    return;
  }
  if (workspaceChannel) {
    supabase.removeChannel(workspaceChannel);
    workspaceChannel = null;
  }
  window.clearTimeout(refreshTimer);
  state.user = null;
  state.isAdmin = false;
  state.page = 'dashboard';
  state.products = [];
  state.inventory = [];
  state.cash = [];
  state.employees = [];
  state.payroll = [];
  renderLogin();
}

async function start() {
  if (!supabase) {
    app.innerHTML = configMessage();
    document.querySelector('#btn-enter-demo')?.addEventListener('click', () => enterDemoWorkspace());
    return;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    renderLogin(`Gagal memeriksa sesi masuk: ${error.message}`);
    return;
  }
  if (data.session?.user) {
    await enterWorkspace(data.session.user);
  } else {
    renderLogin();
  }
}

start();
