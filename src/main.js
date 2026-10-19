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
  products: [],
  inventory: [],
  cash: [],
  employees: [],
  payroll: [],
};
let workspaceChannel = null;
let refreshTimer = null;
const AUTH_DOMAIN = '@perusahaan.id';
const DEMO_STORAGE_KEY = 'atur_produksi_demo_v2';

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
      { id: e1, full_name: 'Budi Santoso', position: 'Operator Mesin Cetak & Potong', daily_salary: 130000, monthly_salary: 3250000, incentive_per_unit: 150, is_active: true },
      { id: e2, full_name: 'Siti Aminah', position: 'Finishing & Quality Control', daily_salary: 115000, monthly_salary: 2875000, incentive_per_unit: 120, is_active: true },
      { id: e3, full_name: 'Ahmad Fauzi', position: 'Logistik & Penataan Gudang', daily_salary: 105000, monthly_salary: 2625000, incentive_per_unit: 100, is_active: true },
    ],
    payroll: [
      {
        id: 'pay-1',
        employee_id: e1,
        work_date: localDate,
        period: localDate,
        attendance_status: 'present',
        daily_wage: 130000,
        production_quantity: 160,
        incentive_rate: 150,
        incentive_amount: 24000,
        total_amount: 154000,
        base_salary: 130000,
        status: 'paid',
        paid_at: `${localDate}T16:00:00.000Z`,
        notes: 'Hadir shift penuh, target tercapai',
      },
      {
        id: 'pay-2',
        employee_id: e2,
        work_date: localDate,
        period: localDate,
        attendance_status: 'present',
        daily_wage: 115000,
        production_quantity: 210,
        incentive_rate: 120,
        incentive_amount: 25200,
        total_amount: 140200,
        base_salary: 115000,
        status: 'pending',
        paid_at: null,
        notes: 'Finishing kemasan box',
      },
      {
        id: 'pay-3',
        employee_id: e3,
        work_date: localDate,
        period: localDate,
        attendance_status: 'half_day',
        daily_wage: 52500,
        production_quantity: 80,
        incentive_rate: 100,
        incentive_amount: 8000,
        total_amount: 60500,
        base_salary: 52500,
        status: 'pending',
        paid_at: null,
        notes: 'Setengah hari izin keperluan keluarga',
      },
    ],
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
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function monthStart(month) {
  return `${month}-01`;
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

function statCard(label, value, note, icon, tone = '') {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${tone}">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></article>`;
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

function renderPayroll() {
  const selectedDate = state.selectedPayrollDate || localDate;
  const employees = [...state.employees].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const activeEmployees = employees.filter((employee) => employee.is_active);

  const dateRecords = state.payroll.filter((r) => (r.work_date || r.period) === selectedDate);
  const totalDateWage = dateRecords.reduce((sum, record) => sum + Number(record.total_amount), 0);
  const presentCount = dateRecords.filter((record) => record.attendance_status === 'present').length;
  const pendingRecords = state.payroll.filter((record) => record.status === 'pending');
  const pendingAmount = pendingRecords.reduce((sum, record) => sum + Number(record.total_amount), 0);

  const attendanceRows = activeEmployees.length ? `<div class="table-wrap"><table><thead><tr>
    <th>NAMA PEKERJA</th>
    <th>STATUS KEHADIRAN</th>
    <th>UPAH POKOK</th>
    <th>HASIL PRODUKSI</th>
    <th>INSENTIF</th>
    <th>TOTAL HARI INI</th>
    <th>STATUS BAYAR</th>
    <th class="align-right">AKSI CEPAT / KONTROL</th>
  </tr></thead><tbody>
    ${activeEmployees.map((emp) => {
      const rec = dateRecords.find((r) => r.employee_id === emp.id);
      if (rec) {
        const attInfo = ATTENDANCE_LABELS[rec.attendance_status] || { label: rec.attendance_status, class: 'status-present' };
        const isPaid = rec.status === 'paid';
        return `<tr>
          <td class="detail-cell">
            ${escapeHtml(emp.full_name)}
            <span class="sub-meta">${escapeHtml(emp.position)}</span>
          </td>
          <td><span class="status-pill ${attInfo.class}">${attInfo.label}</span></td>
          <td>${formatMoney(rec.daily_wage || rec.base_salary)}</td>
          <td>${formatQuantity(rec.production_quantity)} unit</td>
          <td>${formatMoney(rec.incentive_amount)}</td>
          <td class="amount-cell">${formatMoney(rec.total_amount)}</td>
          <td><span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">${isPaid ? 'Dibayar' : 'Pending'}</span></td>
          <td class="align-right">
            ${!isPaid ? `<button class="button button-small button-outline" data-action="mark-daily-paid" data-id="${escapeHtml(rec.id)}" title="Bayar upah hari ini">Bayar</button>` : ''}
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
        <td><span class="sub-meta">Tarif ${formatMoney(emp.daily_salary || 0)}/hari</span></td>
        <td><span class="sub-meta">—</span></td>
        <td><span class="sub-meta">—</span></td>
        <td><span class="sub-meta">—</span></td>
        <td><span class="sub-meta">—</span></td>
        <td class="align-right">
          <div class="att-quick-bar">
            <button type="button" class="att-btn att-btn-present" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="present" title="Absen Hadir Penuh">✓ Hadir</button>
            <button type="button" class="att-btn att-btn-half" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="half_day" title="Absen Setengah Hari">½ Hari</button>
            <button type="button" class="att-btn att-btn-permit" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="permit" title="Absen Izin">Izin</button>
            <button type="button" class="att-btn att-btn-sick" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="sick" title="Absen Sakit">Sakit</button>
            <button type="button" class="att-btn att-btn-absent" data-action="quick-attendance" data-id="${escapeHtml(emp.id)}" data-status="absent" title="Absen Alpa">Alpa</button>
            <button type="button" class="icon-button" data-action="open-attendance-modal" data-id="${escapeHtml(emp.id)}" title="Input detail & kuantitas produksi">✎</button>
          </div>
        </td>
      </tr>`;
    }).join('')}
  </tbody></table></div>` : emptyState('Belum ada karyawan aktif', 'Tambahkan karyawan terlebih dahulu untuk mulai mengabsen.');

  const sortedPayroll = [...state.payroll].sort((a, b) => (b.work_date || b.period).localeCompare(a.work_date || a.period)).slice(0, 15);
  const historyRows = sortedPayroll.length ? `<div class="table-wrap"><table><thead><tr>
    <th>TANGGAL</th>
    <th>PEKERJA</th>
    <th>KEHADIRAN</th>
    <th>PRODUKSI</th>
    <th>UPAH POKOK</th>
    <th>INSENTIF</th>
    <th>TOTAL UPAH</th>
    <th>STATUS</th>
    <th>CATATAN</th>
    <th class="align-right">AKSI</th>
  </tr></thead><tbody>
    ${sortedPayroll.map((rec) => {
      const attInfo = ATTENDANCE_LABELS[rec.attendance_status] || { label: rec.attendance_status || 'Hadir', class: 'status-present' };
      const isPaid = rec.status === 'paid';
      return `<tr>
        <td class="date-cell">${formatDate(rec.work_date || rec.period)}</td>
        <td class="detail-cell">${escapeHtml(rec.employees?.full_name || 'Karyawan')}</td>
        <td><span class="status-pill ${attInfo.class}">${attInfo.label}</span></td>
        <td>${formatQuantity(rec.production_quantity)} unit</td>
        <td>${formatMoney(rec.daily_wage || rec.base_salary)}</td>
        <td>${formatMoney(rec.incentive_amount)}</td>
        <td class="amount-cell">${formatMoney(rec.total_amount)}</td>
        <td><span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">${isPaid ? 'Dibayar' : 'Pending'}</span></td>
        <td class="detail-cell" style="font-weight: normal; font-size: 9px; color: #88938d;">${escapeHtml(rec.notes || '—')}</td>
        <td class="align-right">
          ${!isPaid ? `<button class="button button-small button-outline" data-action="mark-daily-paid" data-id="${escapeHtml(rec.id)}">Bayar</button>` : '—'}
          <button class="icon-button" data-action="edit-attendance" data-id="${escapeHtml(rec.id)}" aria-label="Ubah data">✎</button>
          <button class="icon-button danger-icon" data-action="delete-attendance" data-id="${escapeHtml(rec.id)}" aria-label="Hapus data">×</button>
        </td>
      </tr>`;
    }).join('')}
  </tbody></table></div>` : emptyState('Belum ada riwayat absensi', 'Absensi dan upah harian yang dicatat akan muncul di sini.');

  const employeeRows = employees.length ? `<div class="table-wrap"><table><thead><tr>
    <th>NAMA KARYAWAN</th>
    <th>JABATAN</th>
    <th>UPAH POKOK / HARI</th>
    <th>INSENTIF / UNIT</th>
    <th>STATUS</th>
    <th class="align-right">AKSI</th>
  </tr></thead><tbody>
    ${employees.map((employee) => `<tr>
      <td class="detail-cell">${escapeHtml(employee.full_name)}</td>
      <td>${escapeHtml(employee.position)}</td>
      <td>${formatMoney(employee.daily_salary || 0)} / hari</td>
      <td>${formatMoney(employee.incentive_per_unit || 0)} / unit</td>
      <td><span class="status-pill ${employee.is_active ? 'status-active' : 'status-inactive'}">${employee.is_active ? 'Aktif' : 'Tidak aktif'}</span></td>
      <td class="align-right"><button class="icon-button" data-action="edit-employee" data-id="${escapeHtml(employee.id)}" aria-label="Ubah ${escapeHtml(employee.full_name)}">✎</button></td>
    </tr>`).join('')}
  </tbody></table></div>` : emptyState('Belum ada karyawan', 'Tambahkan karyawan untuk mulai mengatur upah dan insentif.');

  return `${heading('MANAJEMEN KARYAWAN', 'Absensi & gaji harian', 'Admin mencatat absensi realtime dan hasil produksi. Upah dihitung harian otomatis.', `
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="button button-outline" data-action="add-employee">＋ Karyawan baru</button>
      <button class="button button-primary" data-action="open-attendance-modal"><span>＋</span> Catat absensi</button>
    </div>`)}
    <section class="stats-grid compact-stats">
      ${statCard('Karyawan aktif', `${activeEmployees.length} orang`, `${employees.length} pekerja terdaftar`, '◎', 'icon-blue')}
      ${statCard(`Kehadiran (${formatDate(selectedDate)})`, `${presentCount} / ${activeEmployees.length} hadir`, `${dateRecords.length} dari ${activeEmployees.length} telah diabsen`, '↗', 'icon-green')}
      ${statCard(`Upah harian (${formatDate(selectedDate)})`, formatMoney(totalDateWage), `pokok & insentif tanggal ini`, '▦', 'icon-orange')}
      ${statCard('Total upah pending', formatMoney(pendingAmount), `${pendingRecords.length} catatan belum dibayar`, '◷', 'icon-purple')}
    </section>

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Absensi harian realtime <span class="count-badge">${dateRecords.length}/${activeEmployees.length}</span></h2>
          <p>Tanggal kerja: <strong>${formatDate(selectedDate)}</strong></p>
        </div>
        <div class="payroll-controls">
          <label class="month-label" for="attendance-date-picker">TANGGAL KERJA</label>
          <input class="month-input" id="attendance-date-picker" type="date" value="${escapeHtml(selectedDate)}" />
          <button class="button button-outline button-small" data-action="set-date-today">Hari ini</button>
        </div>
      </div>
      ${attendanceRows}
    </section>

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Riwayat absensi & upah terbaru</h2>
          <p>Catatan kehadiran dan hasil kerja harian</p>
        </div>
        <span class="count-badge">${state.payroll.length} total</span>
      </div>
      ${historyRows}
    </section>

    <section class="content-card">
      <div class="card-heading">
        <div>
          <h2>Master tarif upah karyawan <span class="count-badge">${employees.length}</span></h2>
          <p>Tarif upah pokok harian dan insentif per unit produksi</p>
        </div>
      </div>
      ${employeeRows}
    </section>`;
}

function renderReports(month = currentMonth) {
  const inventory = monthRecords(state.inventory, month);
  const cash = monthRecords(state.cash, month);
  const payroll = state.isAdmin ? monthRecords(state.payroll, month, 'work_date') : [];
  const totalIn = cash.filter((row) => row.direction === 'in').reduce((sum, row) => sum + Number(row.amount), 0);
  const totalOut = cash.filter((row) => row.direction === 'out').reduce((sum, row) => sum + Number(row.amount), 0);
  const totalPayroll = payroll.reduce((sum, row) => sum + Number(row.total_amount), 0);
  const headingHtml = heading('ANALISIS', 'Laporan bulanan', 'Pilih periode untuk meninjau dan mengunduh catatan operasional.', '');
  return `${headingHtml}<section class="content-card report-filter-card"><div><h2>Pilih periode laporan</h2><p>Data persediaan dan kas, serta absensi & penggajian harian untuk admin.</p></div>
      <div class="report-controls"><label class="month-label" for="report-month">BULAN</label><input class="month-input" id="report-month" type="month" value="${escapeHtml(month)}" /><button class="button button-primary" data-action="download-report">↓ Unduh CSV</button></div>
    </section>
    <section class="stats-grid compact-stats">${statCard('Barang masuk/keluar', quantityFormat.format(inventory.length), 'pergerakan barang periode ini', '▦', 'icon-blue')}${statCard('Pemasukan kas', formatMoney(totalIn), `${cash.filter((row) => row.direction === 'in').length} transaksi`, '↗', 'icon-green')}${statCard('Pengeluaran kas', formatMoney(totalOut), `${cash.filter((row) => row.direction === 'out').length} transaksi`, '↘', 'icon-orange')}${state.isAdmin ? statCard('Total upah harian', formatMoney(totalPayroll), `${payroll.length} catatan absensi & upah`, '◎', 'icon-purple') : ''}</section>
    <section class="content-card"><div class="card-heading"><div><h2>Pratinjau laporan</h2><p>Transaksi kas dan persediaan pada ${escapeHtml(month)}</p></div><span class="count-badge">${inventory.length + cash.length + payroll.length} catatan</span></div>
      ${movementTable([...inventory.map((row) => ({ ...row, type: 'inventory' })), ...cash].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)), 10)}
      ${payroll.length ? `<div class="report-payroll-preview"><strong>Rekap absensi & upah harian</strong><span>${payroll.length} catatan · ${formatMoney(totalPayroll)}</span></div>` : ''}</section>`;
}

function renderPage() {
  const pages = {
    dashboard: ['Ringkasan', renderDashboard],
    inventory: ['Persediaan', renderInventory],
    cash: ['Keuangan', renderCash],
    products: ['Produk', renderProducts],
    payroll: ['Absensi & gaji', renderPayroll],
    reports: ['Laporan', renderReports],
  };
  if (!pages[state.page] || (state.page === 'payroll' && !state.isAdmin)) state.page = 'dashboard';
  const [label, render] = pages[state.page];
  document.querySelector('#page-crumb').textContent = label;
  const content = document.querySelector('#page-content');
  content.innerHTML = render();
  content.onclick = handlePageAction;
  content.onchange = (event) => {
    if (event.target.id === 'report-month') {
      content.innerHTML = renderReports(event.target.value || currentMonth);
    } else if (event.target.id === 'attendance-date-picker') {
      state.selectedPayrollDate = event.target.value || localDate;
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
    } else {
      state.employees = [];
      state.payroll = [];
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
    );
  }
  const results = await Promise.all(requests);
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
  [state.products, state.inventory, state.cash] = results.slice(0, 3).map((result) => result.data || []);
  if (state.isAdmin) {
    state.employees = results[3].data || [];
    state.payroll = results[4].data || [];
  } else {
    state.employees = [];
    state.payroll = [];
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
      <label>Insentif per unit produksi (Rp)<input name="incentive_per_unit" type="number" min="0" step="1" value="${escapeHtml(employee?.incentive_per_unit ?? '0')}" placeholder="Contoh: 150" required /></label>
    </div>
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
  const initialNotes = record?.notes || '';

  const employeeOptions = activeEmployees.map((emp) => `
    <option value="${escapeHtml(emp.id)}" data-daily="${emp.daily_salary || 0}" data-incentive="${emp.incentive_per_unit || 0}" ${emp.id === selectedEmpId ? 'selected' : ''}>
      ${escapeHtml(emp.full_name)} · Upah ${formatMoney(emp.daily_salary || 0)}/hari · Insentif ${formatMoney(emp.incentive_per_unit || 0)}/unit
    </option>`).join('');

  openDialog(record ? 'Ubah absensi & upah harian' : 'Catat absensi & upah harian', `
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

      <div class="formula-note" id="att-calc-summary">
        Menghitung rincian upah...
      </div>

      <label>Catatan kehadiran / hasil kerja <span class="optional">(opsional)</span>
        <input name="notes" id="att-notes" maxlength="200" value="${escapeHtml(initialNotes)}" placeholder="Contoh: Lembur 1 jam, potong bahan 200 lembar" />
      </label>

      ${!record || record.status === 'pending' ? `
        <label class="checkbox-label" style="margin-top: 4px;">
          <input name="mark_paid" id="att-mark-paid" type="checkbox" />
          <span><strong>Langsung bayar & potong kas operasional</strong> (status otomatis Dibayar)</span>
        </label>
      ` : `
        <div class="formula-note" style="background: #edf7f0; color: #216f4c;">
          ✓ Catatan upah ini sudah dibayar pada ${formatDate(record.paid_at || targetDate)}.
        </div>
      `}

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
  const summaryBox = form.querySelector('#att-calc-summary');

  function calculateWage(autoFillWage = true) {
    const selectedOption = empSelect.selectedOptions[0];
    const dailySalary = Number(selectedOption?.dataset?.daily) || 0;
    const incentiveRate = Number(selectedOption?.dataset?.incentive) || 0;
    const status = statusSelect.value;
    const rateMultiplier = ATTENDANCE_LABELS[status]?.rate ?? 0;
    const standardDailyWage = Math.round(dailySalary * rateMultiplier);

    if (autoFillWage || wageInput.value === '') {
      wageInput.value = standardDailyWage;
    }

    const currentWage = Number(wageInput.value) || 0;
    const qty = Number(qtyInput.value) || 0;
    const incentiveAmount = Math.round(qty * incentiveRate);
    const totalWage = currentWage + incentiveAmount;

    summaryBox.innerHTML = `
      <strong>Rincian Perhitungan Upah:</strong><br />
      • Upah pokok: <strong>${formatMoney(currentWage)}</strong> (${ATTENDANCE_LABELS[status]?.label || status})<br />
      • Insentif produksi: ${formatQuantity(qty)} unit × ${formatMoney(incentiveRate)} = <strong>${formatMoney(incentiveAmount)}</strong><br />
      • <strong>Total upah hari ini: ${formatMoney(totalWage)}</strong>
    `;
  }

  empSelect.addEventListener('change', () => calculateWage(true));
  statusSelect.addEventListener('change', () => calculateWage(true));
  wageInput.addEventListener('input', () => calculateWage(false));
  qtyInput.addEventListener('input', () => calculateWage(false));

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
    const notes = (formData.get('notes') || '').trim();
    const shouldMarkPaid = formData.has('mark_paid');

    const emp = activeEmployees.find((e) => e.id === empId);
    if (!emp) {
      showError('Data karyawan tidak valid.');
      return;
    }

    const incentiveRate = emp.incentive_per_unit || 0;
    const incentiveAmount = Math.round(prodQty * incentiveRate);
    const totalAmount = dailyWage + incentiveAmount;
    const newStatus = (record?.status === 'paid') ? 'paid' : (shouldMarkPaid ? 'paid' : 'pending');
    const paidAt = newStatus === 'paid' ? (record?.paid_at || new Date().toISOString()) : null;

    const payload = {
      employee_id: empId,
      work_date: workDate,
      period: workDate,
      attendance_status: status,
      daily_wage: dailyWage,
      base_salary: dailyWage,
      production_quantity: prodQty,
      incentive_rate: incentiveRate,
      incentive_amount: incentiveAmount,
      total_amount: totalAmount,
      status: newStatus,
      paid_at: paidAt,
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

        if (shouldMarkPaid && totalAmount > 0 && record?.status !== 'paid') {
          demoStore.insert('cash', {
            direction: 'out',
            amount: totalAmount,
            category: 'Gaji & Upah Karyawan',
            description: `Upah harian ${emp.full_name} tanggal ${formatDate(workDate)} (${ATTENDANCE_LABELS[status]?.label || status})`,
            occurred_on: workDate,
          });
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

      if (shouldMarkPaid && totalAmount > 0 && record?.status !== 'paid') {
        const { error: cashError } = await supabase.from('cash_transactions').insert({
          direction: 'out',
          amount: totalAmount,
          category: 'Gaji & Upah Karyawan',
          description: `Upah harian ${emp.full_name} tanggal ${formatDate(workDate)} (${ATTENDANCE_LABELS[status]?.label || status})`,
          occurred_on: workDate,
        });
        if (cashError) return cashError;
      }
      return null;
    }, shouldMarkPaid && totalAmount > 0 ? 'Absensi dan pembayaran kas berhasil dicatat.' : 'Catatan absensi berhasil disimpan.');
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
  const rows = [['Tanggal', 'Jenis catatan', 'Nama/rincian', 'Arah', 'Jumlah/unit', 'Nilai (IDR)', 'Status', 'Catatan']];
  for (const item of monthRecords(state.inventory, month)) {
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
  for (const item of monthRecords(state.cash, month)) {
    rows.push([
      item.occurred_on,
      'Keuangan',
      item.category,
      item.direction === 'in' ? 'Masuk' : 'Keluar',
      '',
      item.amount,
      '',
      item.description,
    ]);
  }
  if (state.isAdmin) {
    for (const item of monthRecords(state.payroll, month, 'work_date')) {
      const attLabel = ATTENDANCE_LABELS[item.attendance_status]?.label || item.attendance_status || 'Hadir';
      rows.push([
        item.work_date || item.period,
        'Penggajian Harian',
        `${item.employees?.full_name || 'Karyawan'} (${attLabel})`,
        '',
        `${item.production_quantity || 0} unit`,
        item.total_amount,
        item.status === 'paid' ? 'Lunas' : 'Belum dibayar',
        `Pokok: ${formatMoney(item.daily_wage || item.base_salary)}; Insentif: ${formatMoney(item.incentive_amount)}; ${item.notes || ''}`.trim(),
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
      production_quantity: 0,
      incentive_rate: employee.incentive_per_unit || 0,
      incentive_amount: 0,
      total_amount: totalAmount,
      status: 'pending',
      paid_at: null,
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
    if (!record || !window.confirm('Hapus catatan absensi & upah ini?')) return;

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
  } else if (action === 'mark-daily-paid' || action === 'mark-paid') {
    const record = state.payroll.find((p) => p.id === id);
    if (!record) return;
    const empName = record.employees?.full_name || 'Karyawan';
    const amount = Number(record.total_amount) || 0;
    const targetDate = record.work_date || record.period || localDate;

    if (!window.confirm(`Tandai upah ${empName} sebesar ${formatMoney(amount)} sebagai sudah dibayar?\nSistem otomatis mencatat pengeluaran kas operasional.`)) return;

    if (state.isDemo) {
      demoStore.update('payroll', id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
      });
      if (amount > 0) {
        demoStore.insert('cash', {
          direction: 'out',
          amount,
          category: 'Gaji & Upah Karyawan',
          description: `Upah harian ${empName} tanggal ${formatDate(targetDate)} (${ATTENDANCE_LABELS[record.attendance_status]?.label || 'Hadir'})`,
          occurred_on: targetDate,
        });
      }
      await refreshData();
      renderShell();
      notify(`Upah ${empName} berhasil dibayar dan dicatat ke kas.`);
      return;
    }

    const { error: payError } = await supabase.from('payroll_records').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', id);

    if (payError) {
      showError(`Status pembayaran gagal diperbarui: ${payError.message}`);
      return;
    }

    if (amount > 0) {
      const { error: cashError } = await supabase.from('cash_transactions').insert({
        direction: 'out',
        amount,
        category: 'Gaji & Upah Karyawan',
        description: `Upah harian ${empName} tanggal ${formatDate(targetDate)} (${ATTENDANCE_LABELS[record.attendance_status]?.label || 'Hadir'})`,
        occurred_on: targetDate,
      });
      if (cashError) {
        showError(`Status upah terbayar, namun kas gagal dicatat: ${cashError.message}`);
      }
    }

    await refreshData();
    renderShell();
    notify(`Upah ${empName} berhasil dibayar dan dicatat ke kas.`);
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
