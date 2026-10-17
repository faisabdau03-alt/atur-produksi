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
  products: [],
  inventory: [],
  cash: [],
  employees: [],
  payroll: [],
};
let workspaceChannel = null;
let refreshTimer = null;
const AUTH_DOMAIN = '@perusahaan.id';
const DEMO_STORAGE_KEY = 'atur_produksi_demo_v1';

function getInitialDemoData() {
  const p1 = 'p-01', p2 = 'p-02', p3 = 'p-03', p4 = 'p-04';
  const e1 = 'e-01', e2 = 'e-02', e3 = 'e-03';
  return {
    products: [
      { id: p1, name: 'Karton Box Ukuran M (Double Wall)', sku: 'KB-001', unit: 'pcs' },
      { id: p2, name: 'Lakban Coklat 48mm x 100m', sku: 'LK-002', unit: 'roll' },
      { id: p3, name: 'Bubble Wrap Tebal 50m', sku: 'BW-003', unit: 'roll' },
      { id: p4, name: 'Plastik Stretch Film 500m', sku: 'SF-004', unit: 'roll' },
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
      { id: e1, full_name: 'Budi Santoso', position: 'Operator Mesin Cetak & Potong', monthly_salary: 3200000, incentive_per_unit: 150, is_active: true },
      { id: e2, full_name: 'Siti Aminah', position: 'Finishing & Quality Control', monthly_salary: 3000000, incentive_per_unit: 120, is_active: true },
      { id: e3, full_name: 'Ahmad Fauzi', position: 'Logistik & Penataan Gudang', monthly_salary: 2850000, incentive_per_unit: 100, is_active: true },
    ],
    payroll: [
      {
        id: 'pay-1',
        employee_id: e1,
        period: `${currentMonth}-01`,
        production_quantity: 3600,
        base_salary: 3200000,
        incentive_rate: 150,
        incentive_amount: 540000,
        total_amount: 3740000,
        status: 'paid',
        paid_at: `${currentMonth}-15T09:30:00.000Z`,
      },
      {
        id: 'pay-2',
        employee_id: e2,
        period: `${currentMonth}-01`,
        production_quantity: 4100,
        base_salary: 3000000,
        incentive_rate: 120,
        incentive_amount: 492000,
        total_amount: 3492000,
        status: 'pending',
        paid_at: null,
      },
      {
        id: 'pay-3',
        employee_id: e3,
        period: `${currentMonth}-01`,
        production_quantity: 3250,
        base_salary: 2850000,
        incentive_rate: 100,
        incentive_amount: 325000,
        total_amount: 3175000,
        status: 'pending',
        paid_at: null,
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
  return records.filter((record) => record[field]?.slice(0, 7) === month);
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
          ${state.isAdmin ? `<div class="nav-section-label">MANAJEMEN</div>${navItem('payroll', '◎', 'Karyawan & gaji')}` : ''}
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
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>NAMA PRODUK</th><th>SKU</th><th>STOK TERSEDIA</th><th>UNIT</th><th></th></tr></thead><tbody>
        ${rows.map((product) => `<tr><td class="detail-cell">${escapeHtml(product.name)}</td><td>${escapeHtml(product.sku || '—')}</td>
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
  const period = document.querySelector('#payroll-month')?.value || currentMonth;
  const records = monthRecords(state.payroll, period, 'period');
  const total = records.reduce((sum, record) => sum + Number(record.total_amount), 0);
  const employees = [...state.employees].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const employeeRows = employees.length ? `<div class="table-wrap"><table><thead><tr><th>NAMA KARYAWAN</th><th>JABATAN</th><th>GAJI POKOK</th><th>INSENTIF / UNIT</th><th>STATUS</th><th></th></tr></thead><tbody>
    ${employees.map((employee) => `<tr><td class="detail-cell">${escapeHtml(employee.full_name)}</td><td>${escapeHtml(employee.position)}</td><td>${formatMoney(employee.monthly_salary)}</td><td>${formatMoney(employee.incentive_per_unit)}</td><td><span class="status-pill ${employee.is_active ? 'status-active' : 'status-inactive'}">${employee.is_active ? 'Aktif' : 'Tidak aktif'}</span></td><td class="align-right"><button class="icon-button" data-action="edit-employee" data-id="${escapeHtml(employee.id)}" aria-label="Ubah ${escapeHtml(employee.full_name)}">✎</button></td></tr>`).join('')}
  </tbody></table></div>` : emptyState('Belum ada karyawan', 'Tambahkan karyawan untuk mulai mengatur gaji dan insentif.');
  const payrollRows = records.length ? `<div class="table-wrap"><table><thead><tr><th>KARYAWAN</th><th>PRODUKSI</th><th>GAJI POKOK</th><th>INSENTIF</th><th>TOTAL GAJI</th><th>STATUS</th><th></th></tr></thead><tbody>
    ${records.map((record) => `<tr><td class="detail-cell">${escapeHtml(record.employees?.full_name || 'Karyawan')}</td><td>${formatQuantity(record.production_quantity)} unit</td><td>${formatMoney(record.base_salary)}</td><td>${formatMoney(record.incentive_amount)}</td><td class="amount-cell">${formatMoney(record.total_amount)}</td><td><span class="status-pill ${record.status === 'paid' ? 'status-paid' : 'status-pending'}">${record.status === 'paid' ? 'Dibayar' : 'Belum dibayar'}</span></td><td class="align-right">${record.status === 'pending' ? `<button class="button button-small button-outline" data-action="mark-paid" data-id="${escapeHtml(record.id)}">Tandai dibayar</button>` : '—'}</td></tr>`).join('')}
  </tbody></table></div>` : emptyState('Penggajian belum dibuat', 'Catat hasil produksi bulanan untuk menghitung gaji.') ;
  return `${heading('MANAJEMEN', 'Karyawan & penggajian', 'Kelola gaji pokok dan insentif berdasarkan hasil produksi.', '<button class="button button-primary" data-action="add-employee"><span>＋</span> Tambah karyawan</button>')}
    <section class="stats-grid compact-stats">${statCard('Karyawan aktif', quantityFormat.format(employees.filter((employee) => employee.is_active).length), `${employees.length} terdaftar`, '◎', 'icon-blue')}${statCard('Total penggajian', formatMoney(total), `periode ${escapeHtml(period)}`, '↗', 'icon-green')}${statCard('Belum dibayar', quantityFormat.format(records.filter((record) => record.status === 'pending').length), 'catatan penggajian bulan ini', '◷', 'icon-orange')}</section>
    <section class="content-card"><div class="card-heading"><div><h2>Perhitungan penggajian</h2><p>Gaji pokok + (jumlah produksi × insentif per unit)</p></div><div class="payroll-controls"><input aria-label="Periode penggajian" class="month-input" id="payroll-month" type="month" value="${escapeHtml(period)}" /><button class="button button-outline" data-action="add-payroll">＋ Catat produksi</button></div></div>
      ${payrollRows}</section>
    <section class="content-card"><div class="card-heading"><div><h2>Daftar karyawan <span class="count-badge">${employees.length}</span></h2><p>Tarif gaji dan insentif saat ini</p></div></div>${employeeRows}</section>`;
}

function renderReports(month = currentMonth) {
  const inventory = monthRecords(state.inventory, month);
  const cash = monthRecords(state.cash, month);
  const payroll = state.isAdmin ? monthRecords(state.payroll, month, 'period') : [];
  const totalIn = cash.filter((row) => row.direction === 'in').reduce((sum, row) => sum + Number(row.amount), 0);
  const totalOut = cash.filter((row) => row.direction === 'out').reduce((sum, row) => sum + Number(row.amount), 0);
  const headingHtml = heading('ANALISIS', 'Laporan bulanan', 'Pilih periode untuk meninjau dan mengunduh catatan operasional.', '');
  return `${headingHtml}<section class="content-card report-filter-card"><div><h2>Pilih periode laporan</h2><p>Data persediaan dan kas, serta penggajian untuk admin.</p></div>
      <div class="report-controls"><label class="month-label" for="report-month">BULAN</label><input class="month-input" id="report-month" type="month" value="${escapeHtml(month)}" /><button class="button button-primary" data-action="download-report">↓ Unduh CSV</button></div>
    </section>
    <section class="stats-grid compact-stats">${statCard('Barang masuk/keluar', quantityFormat.format(inventory.length), 'pergerakan barang periode ini', '▦', 'icon-blue')}${statCard('Pemasukan kas', formatMoney(totalIn), `${cash.filter((row) => row.direction === 'in').length} transaksi`, '↗', 'icon-green')}${statCard('Pengeluaran kas', formatMoney(totalOut), `${cash.filter((row) => row.direction === 'out').length} transaksi`, '↘', 'icon-orange')}${state.isAdmin ? statCard('Total penggajian', formatMoney(payroll.reduce((sum, row) => sum + Number(row.total_amount), 0)), `${payroll.length} catatan gaji`, '◎', 'icon-purple') : ''}</section>
    <section class="content-card"><div class="card-heading"><div><h2>Pratinjau laporan</h2><p>Transaksi kas dan persediaan pada ${escapeHtml(month)}</p></div><span class="count-badge">${inventory.length + cash.length + payroll.length} catatan</span></div>
      ${movementTable([...inventory.map((row) => ({ ...row, type: 'inventory' })), ...cash].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)), 10)}
      ${payroll.length ? `<div class="report-payroll-preview"><strong>Catatan penggajian</strong><span>${payroll.length} karyawan · ${formatMoney(payroll.reduce((sum, row) => sum + Number(row.total_amount), 0))}</span></div>` : ''}</section>`;
}

function renderPage() {
  const pages = {
    dashboard: ['Ringkasan', renderDashboard],
    inventory: ['Persediaan', renderInventory],
    cash: ['Keuangan', renderCash],
    products: ['Produk', renderProducts],
    payroll: ['Karyawan & gaji', renderPayroll],
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
    } else if (event.target.id === 'payroll-month') {
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
      supabase.from('payroll_records').select('*, employees(full_name)').order('period', { ascending: false }),
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
      <div class="dialog-actions"><button type="button" class="button button-quiet" data-action="close-dialog">Batal</button><button class="button button-primary" type="submit">${product ? 'Simpan perubahan' : 'Simpan produk'}</button></div>
    </form>`);
  document.querySelector('#product-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { name: form.get('name').trim(), sku: form.get('sku').trim() || null, unit: form.get('unit').trim() };
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
  const options = state.products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)} · stok ${formatQuantity(stockFor(product.id))} ${escapeHtml(product.unit)}</option>`).join('');
  openDialog('Catat pergerakan barang', `<form id="inventory-form" class="form-stack">
    <label>Produk<select name="product_id" required>${options}</select></label>
    <div class="form-row"><label>Jenis pergerakan<select name="direction"><option value="in">Barang masuk</option><option value="out">Barang keluar</option></select></label><label>Jumlah<input name="quantity" type="number" min="0.01" step="0.01" placeholder="0" required /></label></div>
    <label>Tanggal<input name="occurred_on" type="date" value="${localDate}" required /></label>
    <label>Catatan <span class="optional">(opsional)</span><input name="notes" maxlength="240" placeholder="Keterangan pergerakan barang" /></label>
    <div class="dialog-actions"><button type="button" class="button button-quiet" data-action="close-dialog">Batal</button><button class="button button-primary" type="submit">Simpan catatan</button></div>
  </form>`);
  document.querySelector('#inventory-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runMutation(async () => {
      const pId = form.get('product_id');
      const dir = form.get('direction');
      const qty = Number(form.get('quantity'));
      const occ = form.get('occurred_on');
      const notes = form.get('notes').trim();

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
        return null;
      }
      const { error } = await supabase.from('inventory_movements').insert({
        product_id: pId,
        direction: dir,
        quantity: qty,
        occurred_on: occ,
        notes,
      });
      return error;
    }, 'Pergerakan barang berhasil dicatat.');
  });
}

function cashForm() {
  openDialog('Catat transaksi kas', `<form id="cash-form" class="form-stack">
    <label>Jenis transaksi<select name="direction"><option value="in">Uang masuk</option><option value="out">Uang keluar</option></select></label>
    <label>Jumlah (Rp)<input name="amount" type="number" min="1" step="1" placeholder="0" required /></label>
    <div class="form-row"><label>Kategori<input name="category" maxlength="80" placeholder="Penjualan, bahan baku, dll." required /></label><label>Tanggal<input name="occurred_on" type="date" value="${localDate}" required /></label></div>
    <label>Keterangan <span class="optional">(opsional)</span><input name="description" maxlength="240" placeholder="Catatan transaksi" /></label>
    <div class="dialog-actions"><button type="button" class="button button-quiet" data-action="close-dialog">Batal</button><button class="button button-primary" type="submit">Simpan transaksi</button></div>
  </form>`);
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
  openDialog(employee ? 'Ubah data karyawan' : 'Tambah karyawan', `<form id="employee-form" class="form-stack">
    <label>Nama lengkap<input name="full_name" maxlength="120" value="${escapeHtml(employee?.full_name || '')}" placeholder="Nama karyawan" required /></label>
    <label>Jabatan<input name="position" maxlength="80" value="${escapeHtml(employee?.position || 'Produksi')}" placeholder="Produksi" required /></label>
    <div class="form-row"><label>Gaji pokok per bulan (Rp)<input name="monthly_salary" type="number" min="0" step="1" value="${escapeHtml(employee?.monthly_salary ?? '')}" placeholder="0" required /></label>
    <label>Insentif per unit (Rp)<input name="incentive_per_unit" type="number" min="0" step="1" value="${escapeHtml(employee?.incentive_per_unit ?? '0')}" placeholder="0" required /></label></div>
    ${employee ? `<label class="checkbox-label"><input name="is_active" type="checkbox" ${employee.is_active ? 'checked' : ''} /> Karyawan aktif</label>` : ''}
    <div class="dialog-actions"><button type="button" class="button button-quiet" data-action="close-dialog">Batal</button><button class="button button-primary" type="submit">${employee ? 'Simpan perubahan' : 'Simpan karyawan'}</button></div>
  </form>`);
  document.querySelector('#employee-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      full_name: form.get('full_name').trim(),
      position: form.get('position').trim(),
      monthly_salary: Number(form.get('monthly_salary')),
      incentive_per_unit: Number(form.get('incentive_per_unit')),
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

function payrollForm() {
  const activeEmployees = state.employees.filter((employee) => employee.is_active);
  if (!activeEmployees.length) {
    notify('Tambahkan karyawan aktif terlebih dahulu.', 'error');
    return;
  }
  const options = activeEmployees.map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.full_name)} · pokok ${formatMoney(employee.monthly_salary)} · insentif ${formatMoney(employee.incentive_per_unit)}/unit</option>`).join('');
  openDialog('Catat produksi bulanan', `<form id="payroll-form" class="form-stack">
    <label>Karyawan<select name="employee_id" required>${options}</select></label>
    <div class="form-row"><label>Periode<input name="period" type="month" value="${currentMonth}" required /></label><label>Jumlah produksi (unit)<input name="production_quantity" type="number" min="0" step="0.01" placeholder="0" required /></label></div>
    <div class="formula-note">Total gaji dihitung dari gaji pokok + (jumlah produksi × tarif insentif).</div>
    <div class="dialog-actions"><button type="button" class="button button-quiet" data-action="close-dialog">Batal</button><button class="button button-primary" type="submit">Hitung penggajian</button></div>
  </form>`);
  document.querySelector('#payroll-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employee = activeEmployees.find((item) => item.id === form.get('employee_id'));
    if (!employee) {
      showError('Pilih karyawan yang masih aktif.');
      return;
    }
    const period = monthStart(form.get('period'));
    const prodQty = Number(form.get('production_quantity'));

    if (state.isDemo) {
      const existing = state.payroll.find((p) => p.employee_id === employee.id && p.period === period);
      if (existing?.status === 'paid') {
        showError('Penggajian periode ini sudah dibayar dan tidak dapat dihitung ulang.');
        return;
      }
      const incentiveAmount = prodQty * employee.incentive_per_unit;
      const totalAmount = employee.monthly_salary + incentiveAmount;
      const payload = {
        employee_id: employee.id,
        period,
        production_quantity: prodQty,
        base_salary: employee.monthly_salary,
        incentive_rate: employee.incentive_per_unit,
        incentive_amount: incentiveAmount,
        total_amount: totalAmount,
        status: 'pending',
        paid_at: null,
      };
      if (existing) {
        demoStore.update('payroll', existing.id, payload);
      } else {
        demoStore.insert('payroll', payload);
      }
      document.querySelector('#app-dialog').close();
      await refreshData();
      renderShell();
      notify('Perhitungan penggajian berhasil disimpan.');
      return;
    }

    const { data: existing, error: lookupError } = await supabase.from('payroll_records')
      .select('id, status')
      .eq('employee_id', employee.id)
      .eq('period', period)
      .maybeSingle();
    if (lookupError) {
      showError(`Gagal memeriksa penggajian: ${lookupError.message}`);
      return;
    }
    if (existing?.status === 'paid') {
      showError('Penggajian periode ini sudah dibayar dan tidak dapat dihitung ulang.');
      return;
    }
    const payload = {
      employee_id: employee.id,
      period,
      production_quantity: prodQty,
      base_salary: employee.monthly_salary,
      incentive_rate: employee.incentive_per_unit,
      status: 'pending',
      paid_at: null,
    };
    await runMutation(async () => {
      const result = existing
        ? await supabase.from('payroll_records').update(payload).eq('id', existing.id)
        : await supabase.from('payroll_records').insert(payload);
      return result.error;
    }, 'Perhitungan penggajian berhasil disimpan.');
  });
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
    for (const item of monthRecords(state.payroll, month, 'period')) {
      rows.push([
        item.period,
        'Penggajian',
        item.employees?.full_name || 'Karyawan',
        '',
        `${item.production_quantity} unit`,
        item.total_amount,
        item.status === 'paid' ? 'Lunas' : 'Belum dibayar',
        `Gaji pokok: ${item.base_salary}; insentif: ${item.incentive_amount}`,
      ]);
    }
  }
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `laporan-produksi-${month}.csv`;
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
  } else if (action === 'add-payroll') {
    payrollForm();
  } else if (action === 'mark-paid') {
    if (!window.confirm('Tandai penggajian ini sebagai sudah dibayar?')) return;
    if (state.isDemo) {
      demoStore.update('payroll', id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
      });
      await refreshData();
      renderShell();
      notify('Penggajian ditandai sudah dibayar.');
      return;
    }
    const { data, error } = await supabase.from('payroll_records').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', id).eq('status', 'pending').select('id').maybeSingle();
    if (error) {
      showError(`Status pembayaran gagal diperbarui: ${error.message}`);
      return;
    }
    if (!data) {
      showError('Catatan penggajian sudah berubah. Muat ulang halaman untuk melihat status terbaru.');
      return;
    }
    try {
      await refreshData();
      renderShell();
      notify('Penggajian ditandai sudah dibayar.');
    } catch (refreshError) {
      showError(`Status tersimpan, tetapi tampilan gagal diperbarui: ${refreshError.message}`);
    }
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
