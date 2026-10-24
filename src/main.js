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

function renderAuthBrandHero() {
  return `
    <aside class="auth-hero-wood">
      <!-- Top Brand Row -->
      <div class="auth-hero-brand">
        <div class="auth-brand-logo-frame">
          <img src="/images/logo-jaya-wijaya.png" alt="Logo Jaya Wijaya Wooden Cleaning Tools" class="auth-brand-thumb-logo" />
        </div>
        <div class="auth-brand-info">
          <div class="auth-brand-name">JAYA WIJAYA</div>
          <div class="auth-brand-tagline">Wooden Cleaning Tools — Manufaktur Sapu &amp; Alat Kayu</div>
        </div>
        <div class="auth-brand-badge">Official Seal</div>
      </div>

      <!-- Hero Visual: Official Logo Badge Showcase -->
      <div class="auth-hero-logo-showcase">
        <div class="auth-logo-badge-container">
          <img src="/images/logo-jaya-wijaya.png" alt="Logo Jaya Wijaya Wooden Cleaning Tools" class="auth-official-logo" />
        </div>
      </div>

      <!-- Hero Copy -->
      <div class="auth-hero-copy">
        <div class="auth-eyebrow-pill">
          <span class="pill-dot"></span> SISTEM INFORMASI MANUFAKTUR
        </div>
        <h1 class="auth-hero-title">
          Presisi Manufaktur Kayu,<br />
          <span class="text-gold">Efisiensi Produksi Digital.</span>
        </h1>
        <p class="auth-hero-desc">
          Platform terpadu untuk industri sapu dan perkakas kebersihan berbahan kayu: integrasi mutasi persediaan, pencatatan transaksi kas &amp; pelunasan piutang, hingga perhitungan upah karyawan dalam satu sistem.
        </p>
      </div>

      <!-- Production Pipeline Highlights -->
      <div class="auth-pipeline-grid">
        <div class="pipeline-item">
          <span class="pipeline-num">01</span>
          <div class="pipeline-text">
            <strong>Seleksi Bahan Baku</strong>
            <small>Kayu keras &amp; serat alami</small>
          </div>
        </div>
        <div class="pipeline-item">
          <span class="pipeline-num">02</span>
          <div class="pipeline-text">
            <strong>Pembubutan Presisi</strong>
            <small>Gagang simetris &amp; halus</small>
          </div>
        </div>
        <div class="pipeline-item">
          <span class="pipeline-num">03</span>
          <div class="pipeline-text">
            <strong>Perakitan &amp; QC Mutu</strong>
            <small>Ikatan kuat &amp; uji ketahanan</small>
          </div>
        </div>
        <div class="pipeline-item">
          <span class="pipeline-num">04</span>
          <div class="pipeline-text">
            <strong>Digitalisasi Pabrik</strong>
            <small>Stok, kas &amp; payroll otomatis</small>
          </div>
        </div>
      </div>

      <!-- Hero Trust Footer -->
      <div class="auth-hero-footer">
        <span>🛡️ Standar Mutu Manufaktur Terpercaya</span>
        <span>•</span>
        <span>Jaya Wijaya</span>
      </div>
    </aside>`;
}

function renderSetupPanel() {
  return `
    <section class="auth-panel-wood">
      <div class="auth-panel-card">
        
        <!-- Header -->
        <header class="auth-panel-header">
          <span class="auth-panel-eyebrow">PORTAL PERSIAPAN APLIKASI</span>
          <h2 class="auth-panel-title">Ruang Kerja Jaya Wijaya</h2>
          <p class="auth-panel-subtitle">
            Pilih metode akses di bawah ini untuk memulai operasional atau hubungkan database produksi perusahaan.
          </p>
        </header>

        <!-- Honest Connection Status -->
        <div class="auth-status-banner is-unconfigured">
          <div class="status-banner-icon">
            <span class="status-pulse-dot dot-amber"></span>
          </div>
          <div class="status-banner-body">
            <strong>Database Cloud: Belum Dikonfigurasi</strong>
            <p>Kredensial database Supabase belum terpasang di file <code>.env</code>. Anda dapat langsung menjalankan seluruh fitur secara penuh melalui <strong>Mode Demo Interaktif</strong> di bawah.</p>
          </div>
        </div>

        <!-- Featured CTA Card: Mode Demo Interaktif -->
        <div class="demo-cta-card">
          <div class="demo-cta-badge-row">
            <span class="demo-badge-pill">★ REKOMENDASI · LANGSUNG PAKAI</span>
          </div>
          <div class="demo-cta-header">
            <div class="demo-cta-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div>
              <h3 class="demo-cta-title">Mode Demo Interaktif</h3>
              <p class="demo-cta-lead">Jelajahi seluruh modul operasional dengan data simulasi langsung di browser tanpa database eksternal.</p>
            </div>
          </div>

          <div class="demo-feature-list">
            <div class="demo-feature-item">
              <span class="feature-icon">📦</span>
              <span><strong>Inventaris &amp; Stok:</strong> Bahan kayu mentah, tutup uk 19, sapu siap kirim</span>
            </div>
            <div class="demo-feature-item">
              <span class="feature-icon">💰</span>
              <span><strong>Keuangan &amp; Kas:</strong> Penjualan tunai, uang muka (DP), dan pelunasan piutang</span>
            </div>
            <div class="demo-feature-item">
              <span class="feature-icon">🧾</span>
              <span><strong>Nota &amp; Struk:</strong> Desain nota modern &amp; cetak thermal Bluetooth (58/80mm)</span>
            </div>
            <div class="demo-feature-item">
              <span class="feature-icon">👥</span>
              <span><strong>Gaji &amp; Absensi:</strong> Hitung hari kerja, lembur, dan insentif per unit produksi</span>
            </div>
            <div class="demo-feature-item">
              <span class="feature-icon">📊</span>
              <span><strong>Laporan Bulanan:</strong> Rekap laba kotor/bersih, omzet, dan unduh CSV</span>
            </div>
          </div>

          <button type="button" class="btn-forest-cta" id="btn-enter-demo">
            <span>Masuk ke Mode Demo Interaktif</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          </button>

          <p class="demo-storage-note">
            🔒 Data simulasi tersimpan aman di browser Anda (Local Storage) dan dapat direset kapan saja tanpa mempengaruhi database utama.
          </p>
        </div>

        <!-- Divider -->
        <div class="auth-section-divider">
          <span>ATAU HUBUNGKAN KE SUPABASE</span>
        </div>

        <!-- Supabase Setup Card -->
        <div class="supabase-setup-card">
          <div class="supabase-card-header">
            <div class="supabase-logo-pill">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#3ECF8E"><path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L.242 13.916a.396.396 0 0 0 .307.638H12v8.958a.396.396 0 0 0 .716.233l11.042-13.753a.396.396 0 0 0-.396-.638z"/></svg>
              <strong>Konfigurasi Lingkungan (.env)</strong>
            </div>
            <a class="supabase-link-ext" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
              Dashboard Supabase ↗
            </a>
          </div>
          <p class="supabase-setup-desc">
            Untuk menghubungkan database PostgreSQL Supabase bersama, tambahkan konfigurasi ini pada file <code>.env</code> lokal atau menu <em>Environment Variables</em> hosting Vercel:
          </p>

          <div class="env-code-box">
            <pre>VITE_SUPABASE_URL=https://&lt;project-ref&gt;.supabase.co
VITE_SUPABASE_ANON_KEY=&lt;anon-atau-publishable-key&gt;</pre>
            <button type="button" class="btn-copy-env" id="btn-copy-config" title="Salin variabel lingkungan ke clipboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Salin Format .env</span>
            </button>
          </div>

          <div class="supabase-schema-footer">
            <span>📄 Skema database siap impor tersedia di berkas <code>supabase/schema.sql</code></span>
          </div>
        </div>

      </div>
    </section>`;
}

function renderLoginPanel(message = '') {
  return `
    <section class="auth-panel-wood">
      <div class="auth-panel-card">
        
        <!-- Header -->
        <header class="auth-panel-header">
          <span class="auth-panel-eyebrow">PORTAL AKSES APLIKASI</span>
          <h2 class="auth-panel-title">Masuk ke Ruang Kerja</h2>
          <p class="auth-panel-subtitle">
            Kelola lini produksi, inventaris kayu &amp; sapu, kas keuangan, dan tim kerja Jaya Wijaya.
          </p>
        </header>

        <!-- Honest Connection Status -->
        <div class="auth-status-banner is-connected">
          <div class="status-banner-icon">
            <span class="status-pulse-dot dot-green"></span>
          </div>
          <div class="status-banner-body">
            <strong>Database Cloud: Terhubung &amp; Siap</strong>
            <p>Koneksi Supabase aktif. Masuk menggunakan akun terdaftar perusahaan.</p>
          </div>
        </div>

        <!-- Error Alert if any -->
        ${message ? `
        <div class="auth-error-alert" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>${escapeHtml(message)}</span>
        </div>` : ''}

        <!-- Login Form -->
        <form id="login-form" class="auth-form-wood">
          <div class="form-group-wood">
            <label for="input-userId">ID Pengguna / Email</label>
            <div class="input-with-icon">
              <span class="input-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <input id="input-userId" name="userId" type="text" autocomplete="username" placeholder="Masukkan ID (contoh: admin)" required />
            </div>
          </div>

          <div class="form-group-wood">
            <label for="input-password">Kata Sandi</label>
            <div class="input-with-icon">
              <span class="input-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </span>
              <input id="input-password" name="password" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" required />
              <button type="button" class="btn-toggle-pw" id="btn-toggle-password" aria-label="Tampilkan kata sandi">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="3" r="3"></circle></svg>
              </button>
            </div>
          </div>

          <button class="btn-forest-cta" type="submit">
            <span>Masuk ke Ruang Kerja</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="auth-section-divider">
          <span>ATAU COBA MODE DEMO INTERAKTIF</span>
        </div>

        <!-- Secondary Demo CTA -->
        <div class="demo-alt-box">
          <button type="button" class="btn-outline-demo" id="btn-enter-demo">
            <span class="bolt-icon">⚡</span>
            <span>Coba Mode Demo (Tanpa Database)</span>
          </button>
          <p class="auth-footnote">Akses akun dikelola oleh administrator Jaya Wijaya.</p>
        </div>

      </div>
    </section>`;
}

function renderAuthLayout({ mode = 'setup', message = '' }) {
  return `
    <main class="auth-page">
      ${renderAuthBrandHero()}
      ${mode === 'login' ? renderLoginPanel(message) : renderSetupPanel()}
    </main>`;
}

function bindAuthEvents() {
  document.querySelectorAll('#btn-enter-demo').forEach((btn) => {
    btn.onclick = () => enterDemoWorkspace();
  });

  const loginForm = document.querySelector('#login-form');
  if (loginForm) {
    loginForm.onsubmit = handleLogin;
  }

  const togglePwBtn = document.querySelector('#btn-toggle-password');
  if (togglePwBtn) {
    togglePwBtn.onclick = (e) => {
      e.preventDefault();
      const pwInput = document.querySelector('#input-password');
      if (!pwInput) return;
      const isPw = pwInput.type === 'password';
      pwInput.type = isPw ? 'text' : 'password';
      togglePwBtn.setAttribute('aria-label', isPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      togglePwBtn.innerHTML = isPw
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="3" r="3"></circle></svg>`;
    };
  }

  const copyBtn = document.querySelector('#btn-copy-config');
  if (copyBtn) {
    copyBtn.onclick = async (e) => {
      e.preventDefault();
      const snippet = `VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon-atau-publishable-key>`;
      try {
        await navigator.clipboard.writeText(snippet);
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `<span>✓</span> Format .env Tersalin!`;
        copyBtn.classList.add('is-copied');
        notify('Format konfigurasi .env berhasil disalin ke clipboard.');
        setTimeout(() => {
          copyBtn.innerHTML = originalHtml;
          copyBtn.classList.remove('is-copied');
        }, 2500);
      } catch {
        notify('Gagal menyalin otomatis. Silakan salin teks secara manual.', 'error');
      }
    };
  }
}

function configMessage() {
  const html = renderAuthLayout({ mode: 'setup' });
  app.innerHTML = html;
  bindAuthEvents();
  return html;
}

function renderLogin(message = '') {
  const html = renderAuthLayout({ mode: 'login', message });
  app.innerHTML = html;
  bindAuthEvents();
  return html;
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
        <a class="brand brand-jaya-wijaya" href="#" data-page="dashboard" title="Jaya Wijaya — Sistem Manufaktur & Operasional">
          <img src="/images/logo-jaya-wijaya.png" alt="Logo Jaya Wijaya Wooden Cleaning Tools" class="sidebar-logo-img" />
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-title">JAYA WIJAYA</span>
            <span class="sidebar-brand-sub">WOODEN CLEANING TOOLS</span>
          </div>
        </a>
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
  const { clickable = false, action = '', statType = '', filter = '', isActive = false, hint = '' } = options;
  const isInteractive = clickable || Boolean(action);
  const activeClass = isActive ? ' is-active' : '';
  const clickClass = isInteractive ? ' stat-card-clickable' : '';

  let clickAttrs = '';
  if (action) {
    clickAttrs = ` data-action="${escapeHtml(action)}" data-stat="${escapeHtml(statType)}" title="Klik untuk melihat rincian ${escapeHtml(label)}"`;
  } else if (clickable && filter) {
    clickAttrs = ` data-action="filter-report" data-filter="${escapeHtml(filter)}" title="Klik untuk pratinjau kategori ini"`;
  }

  return `<article class="stat-card${clickClass}${activeClass}"${clickAttrs}>
    <div class="stat-top">
      <span>${label}</span>
      <span class="stat-icon ${tone}"${action ? ` data-action="${escapeHtml(action)}" data-stat="${escapeHtml(statType)}" style="cursor: pointer;" title="Klik icon untuk melihat rincian ${escapeHtml(label)}"` : ''}>${icon}</span>
    </div>
    <div class="stat-value">${value}</div>
    <div class="stat-note">${note}</div>
    ${isInteractive ? `<div class="click-hint"><span>${hint || 'Klik untuk lihat rincian'}</span> <span aria-hidden="true">→</span></div>` : ''}
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
      const notes = row.notes || '';
      const isProduction = inventory && (notes.includes('Hasil Produksi') || notes.toLowerCase().includes('produksi'));
      const isUsage = inventory && !directionIn && (notes.includes('Pemakaian') || notes.toLowerCase().includes('internal') || notes.toLowerCase().includes('reject'));

      const detail = inventory
        ? `${row.products?.name || 'Produk'}${row.notes ? ` · ${row.notes}` : ''}`
        : `${row.category}${row.description ? ` · ${row.description}` : ''}`;

      let pillLabel = directionIn ? 'Masuk' : 'Keluar';
      let pillClass = directionIn ? 'pill-in' : 'pill-out';
      let pillStyle = '';

      if (isProduction) {
        pillLabel = '🏭 Produksi';
        pillStyle = 'background: #edf7f0; color: #187554; border: 1px solid #b7e2c9; font-weight: 700;';
      } else if (isUsage) {
        pillLabel = '📦 Pemakaian';
        pillStyle = 'background: #fff8e1; color: #855900; border: 1px solid #ffe082; font-weight: 600;';
      } else if (inventory) {
        if (!directionIn && notes.includes('DP')) {
          pillLabel = '🚚 Jual (DP)';
          pillStyle = 'background: #fff8e1; color: #9c6500; border: 1px solid #ffe082; font-weight: 600;';
        } else if (!directionIn && (notes.includes('Tempo') || notes.includes('Piutang'))) {
          pillLabel = '🚚 Jual (Tempo)';
          pillStyle = 'background: #fdf2e9; color: #b05a18; border: 1px solid #fcd6b5; font-weight: 600;';
        } else if (directionIn && notes.includes('DP')) {
          pillLabel = '🛒 Beli (DP)';
          pillStyle = 'background: #fff8e1; color: #9c6500; border: 1px solid #ffe082; font-weight: 600;';
        } else if (directionIn && (notes.includes('Tempo') || notes.includes('Utang'))) {
          pillLabel = '🛒 Beli (Tempo)';
          pillStyle = 'background: #fdf2e9; color: #b05a18; border: 1px solid #fcd6b5; font-weight: 600;';
        } else {
          pillLabel = directionIn ? '🛒 Beli' : '🚚 Jual';
        }
      }

      return `<tr class="clickable-row" data-action="view-report-detail" data-id="${escapeHtml(row.id)}" data-type="${inventory ? 'inventory' : 'cash'}" title="Klik untuk melihat & cetak nota transaksi">
        <td class="date-cell">${formatDate(row.occurred_on)}</td><td>${inventory ? 'Barang' : 'Kas'}</td>
        <td class="detail-cell">${escapeHtml(detail)}</td>
        <td><span class="direction-pill ${pillClass}" style="${pillStyle}"><span></span>${pillLabel}</span></td>
        <td class="align-right amount-cell">${inventory ? `${directionIn ? '+' : '−'}${formatQuantity(row.quantity)} ${escapeHtml(row.products?.unit || '')}` : `${directionIn ? '+' : '−'}${formatMoney(row.amount)}`}</td></tr>`;
    }).join('')}
    </tbody></table></div>`;
}

function getPreviousMonth(monthStr) {
  const [year, month] = (monthStr || currentMonth).split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
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
    <div style="display:inline-flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <button class="button button-outline" data-action="download-report" data-month="${currentMonth}" title="Unduh laporan operasional dan keuangan bulan ini kapan saja"><span>↓</span> Unduh Laporan</button>
      <button class="button button-primary" data-action="quick-entry"><span>＋</span> Catat transaksi</button>
    </div>`)}
    <section class="stats-grid">
      ${statCard('Nilai kas saat ini', formatMoney(balance), `${netMonthCash >= 0 ? '+' : '−'}${formatMoney(Math.abs(netMonthCash))} bersih bulan ini`, '↗', 'icon-green', { action: 'open-stat-detail', statType: 'cash-balance', hint: 'Klik untuk rincian kas' })}
      ${statCard('Jenis produk', quantityFormat.format(state.products.length), `${inStock} produk tersedia di stok`, '◇', 'icon-blue', { action: 'open-stat-detail', statType: 'products', hint: 'Klik untuk rincian produk' })}
      ${statCard('Pergerakan barang', quantityFormat.format(monthRecords(state.inventory, currentMonth).length), 'catatan barang bulan ini', '▦', 'icon-orange', { action: 'open-stat-detail', statType: 'inventory-movements', hint: 'Klik untuk riwayat stok' })}
      ${statCard('Transaksi kas', quantityFormat.format(monthCash.length), 'catatan keuangan bulan ini', '◎', 'icon-purple', { action: 'open-stat-detail', statType: 'cash-transactions', hint: 'Klik untuk riwayat kas' })}
    </section>
    <section class="content-card activity-card"><div class="card-heading"><div><h2>Aktivitas terbaru</h2><p>Ringkasan pergerakan barang dan kas</p></div><button class="button button-quiet" data-page="reports">Lihat laporan <span>→</span></button></div>
      ${movementTable(latest, 7)}</section>
    <div class="dashboard-footnote"><span class="status-dot"></span>Angka diperbarui sesuai data ruang kerja Anda.</div>`;
}

function renderProducts() {
  const action = `
    <div style="display:inline-flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <button class="button button-primary" data-action="add-inventory"><span>＋</span> Catat pergerakan</button>
      <button class="button button-outline" data-action="add-production" style="color:#187554;"><span>🏭</span> Hasil produksi</button>
      <button class="button button-outline" data-action="add-product"><span>＋</span> Tambah produk</button>
    </div>
  `;
  const rows = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  const inStockCount = rows.filter((p) => stockFor(p.id) > 0).length;
  const outOfStockCount = rows.filter((p) => stockFor(p.id) <= 0).length;

  return `${heading('KATALOG', 'Daftar produk', 'Atur nama produk, catat pergerakan barang, dan pantau ketersediaan stok.', action)}
    <section class="stats-grid compact-stats">
      ${statCard('Total jenis produk', quantityFormat.format(rows.length), 'produk terdaftar di sistem', '◇', 'icon-blue')}
      ${statCard('Stok tersedia', quantityFormat.format(inStockCount), 'produk dengan stok di atas nol', '▦', 'icon-green')}
      ${statCard('Stok kosong / habis', quantityFormat.format(outOfStockCount), 'perlu restock / produksi', '⚠', 'icon-orange')}
      ${statCard('Pergerakan bulan ini', quantityFormat.format(monthRecords(state.inventory, currentMonth).length), 'transaksi masuk & keluar', '↗', 'icon-purple')}
    </section>
    <section class="content-card">
      <div class="card-heading"><div><h2>Semua produk <span class="count-badge">${rows.length}</span></h2><p>Data produk dan stok persediaan yang saling tersinkronisasi secara realtime</p></div></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>NAMA PRODUK</th><th>SKU</th><th>HARGA BELI</th><th>HARGA JUAL</th><th>STOK TERSEDIA</th><th>UNIT</th><th class="align-right">AKSI</th></tr></thead><tbody>
        ${rows.map((product) => `<tr>
          <td class="detail-cell">
            <strong>${escapeHtml(product.name)}</strong>
          </td>
          <td>${escapeHtml(product.sku || '—')}</td>
          <td>${formatMoney(product.purchase_price || 0)}</td>
          <td>${formatMoney(product.selling_price || 0)}</td>
          <td class="${stockFor(product.id) < 0 ? 'negative-stock' : ''}">
            <strong style="font-size: 13px;">${formatQuantity(stockFor(product.id))}</strong>
          </td>
          <td>${escapeHtml(product.unit)}</td>
          <td class="align-right action-cell">
            <div style="display:inline-flex; align-items:center; justify-content:flex-end; gap:4px;">
              <button class="button button-small button-outline" data-action="product-movement" data-id="${escapeHtml(product.id)}" title="Catat pergerakan stok untuk ${escapeHtml(product.name)}" style="font-size:11px; padding:3px 8px;">
                <span>±</span> Pergerakan
              </button>
              <button class="icon-button" data-action="edit-product" data-id="${escapeHtml(product.id)}" aria-label="Ubah ${escapeHtml(product.name)}" title="Ubah produk">✎</button>
              <button class="icon-button danger-icon" data-action="delete-product" data-id="${escapeHtml(product.id)}" aria-label="Hapus ${escapeHtml(product.name)}" title="Hapus produk">×</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody></table></div>` : emptyState('Mulai dari produk pertama', 'Tambahkan nama produk untuk mulai mencatat stok.')}</section>`;
}

function renderInventory() {
  const products = [...state.products].sort((a, b) => a.name.localeCompare(b.name));
  return `${heading('OPERASIONAL', 'Persediaan barang', 'Catat setiap barang masuk dan keluar agar stok tetap terpantau.', `
    <div style="display:inline-flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <button class="button button-primary" data-action="add-production" style="background:#187554;"><span>🏭</span> Tambah hasil produksi</button>
      <button class="button button-outline" data-action="add-inventory"><span>＋</span> Catat pergerakan</button>
    </div>`)}
    <section class="stats-grid compact-stats">${statCard('Jenis produk tersedia', quantityFormat.format(products.filter((product) => stockFor(product.id) > 0).length), 'produk dengan stok di atas nol', '◇', 'icon-blue')}${statCard('Pergerakan bulan ini', quantityFormat.format(monthRecords(state.inventory, currentMonth).length), 'barang masuk dan keluar', '▦', 'icon-orange')}</section>
    <section class="content-card"><div class="card-heading"><div><h2>Riwayat pergerakan</h2><p>Catatan stok terbaru</p></div></div>
    ${state.inventory.length ? movementTable(state.inventory.filter((row) => row.product_id), state.inventory.length) : emptyState('Belum ada pergerakan', 'Catat barang masuk untuk mulai mengelola persediaan.')}</section>`;
}

function renderCash() {
  return `${heading('OPERASIONAL', 'Arus keuangan', 'Catat uang masuk dan keluar untuk memantau posisi kas.', `
    <div style="display:inline-flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <button class="button button-outline" data-action="download-report" data-month="${currentMonth}" title="Unduh laporan operasional dan keuangan bulan ini kapan saja"><span>↓</span> Unduh Laporan</button>
      <button class="button button-primary" data-action="add-cash"><span>＋</span> Catat transaksi</button>
    </div>`)}
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
    const recordRate = (r.overtime_rate !== undefined && r.overtime_rate !== null && r.overtime_rate !== '')
      ? Number(r.overtime_rate)
      : overtimeRate;
    return sum + Math.round((Number(r.overtime_hours) || 0) * recordRate);
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
          const recOtRate = (r.overtime_rate !== undefined && r.overtime_rate !== null && r.overtime_rate !== '') ? Number(r.overtime_rate) : (employee.overtime_rate || 0);
          return `<tr>
            <td class="date-cell">${formatDate(r.work_date || r.period)}</td>
            <td><span class="status-pill ${att.class}">${att.label}</span></td>
            <td>${otHours > 0 ? `<span class="status-ot">⚡ ${formatQuantity(otHours)} jam</span> <span class="sub-meta">@ ${formatMoney(recOtRate)}</span>` : '<span class="sub-meta">—</span>'}</td>
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
      <button type="button" class="button button-outline" data-action="download-single-employee-attendance" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}" style="margin-right: auto; display: inline-flex; align-items: center; gap: 6px;">
        <span>📥</span> Unduh Absensi Pekerja Ini
      </button>
      ${!calc.isPaid ? `
        <button type="button" class="button button-primary" data-action="pay-monthly-salary" data-id="${escapeHtml(employee.id)}" data-month="${escapeHtml(month)}">
          Bayar Gaji Akhir Bulan
        </button>
      ` : `
        <span class="status-pill status-paid">Sudah Dibayar ✓</span>
      `}
    </div>
  `);
}

function buildReceiptRawText({
  shopName = 'JAYA WIJAYA',
  shopSub = 'PRODUKSI & TRADING',
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

function printThermalReceipt() {
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
    @page {
      size: 58mm auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: 58mm;
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 58mm;
      max-width: 58mm;
      margin: 0 auto;
      padding: 2mm 1mm 8mm 1mm;
      font-family: 'Consolas', 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.25;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-header {
      text-align: center;
      margin-bottom: 6px;
    }
    .receipt-shop-name {
      font-size: 13.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .receipt-shop-sub {
      font-size: 8.5px;
      margin-top: 1px;
    }
    .receipt-title {
      font-size: 10px;
      font-weight: 700;
      margin-top: 3px;
    }
    .receipt-divider-double {
      border-top: 2px solid #000;
      margin: 5px 0;
    }
    .receipt-divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .receipt-divider-dash {
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      margin: 2px 0;
    }
    .receipt-party-box {
      border: 1px dashed #000;
      padding: 4px 6px;
      margin: 5px 0;
      text-align: left;
    }
    .receipt-party-label {
      font-size: 8px;
      font-weight: 700;
    }
    .receipt-party-name {
      font-size: 12.5px;
      font-weight: 900;
      margin-top: 1px;
    }
    .receipt-party-badge {
      display: inline-block;
      font-size: 8px;
      font-weight: 700;
      border: 1px solid #000;
      padding: 1px 4px;
      margin-top: 2px;
    }
    .receipt-items {
      margin: 5px 0;
    }
    .receipt-item-header {
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      font-weight: 700;
    }
    .receipt-item-line {
      margin: 3px 0;
    }
    .receipt-item-name {
      font-weight: 700;
      font-size: 10.5px;
    }
    .receipt-item-sub {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      margin-top: 1px;
    }
    .receipt-summary {
      margin: 5px 0;
    }
    .receipt-row-total {
      font-size: 11px;
      font-weight: 900;
      margin-top: 4px;
      padding-top: 3px;
      border-top: 1px solid #000;
    }
    .receipt-grand-total {
      font-size: 12px;
      font-weight: 900;
    }
    .receipt-footer {
      text-align: center;
      margin-top: 8px;
      font-size: 8.5px;
    }
    .receipt-thankyou {
      font-weight: 700;
      font-size: 9.5px;
    }
    .receipt-extra-notes {
      font-size: 8.5px;
      font-style: italic;
      margin-top: 4px;
    }
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

function copyReceiptText() {
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

function openReportDetailModal(type, id, month = currentMonth) {
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

    const paidAmount = Number(rec.amount) || 0;
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
      shopSub: 'PRODUKSI & TRADING',
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

    // Accounting Roles
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
            <div class="receipt-shop-sub">OPERASIONAL & INDUSTRI PRODUKSI</div>
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

          <!-- NAMA PEMBELI DI ATAS -->
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
                <button type="button" class="button button-small button-primary" data-action="open-settlement-modal" data-type="${type}" data-id="${escapeHtml(rec.id)}" style="background:#0284c7; font-size:10px; padding:2px 8px; height:24px; min-height:24px;">
                  💳 Lunasi
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
          <summary>📊 Rincian Akuntansi & Pembukuan Kas</summary>
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
          <span>💰</span> Lunasi ${isIncome ? 'Piutang' : 'Utang'} (${formatMoney(remainingAmount)})
        </button>` : ''}
        <button type="button" class="button button-outline" data-action="copy-receipt-text" style="display:inline-flex; align-items:center; gap:5px;" title="Salin format teks monospaced untuk dicetak lewat aplikasi Bluetooth atau dikirim ke WhatsApp">
          <span>📋</span> Salin Teks Struk
        </button>
        <button type="button" class="button button-primary" data-action="print-thermal-receipt" style="display:inline-flex; align-items:center; gap:6px; background:#187554;" title="Cetak nota langsung ke printer Bluetooth (58mm / 80mm)">
          <span>🖨️</span> Cetak Nota (Bluetooth)
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

    // Extra notes
    const parts = notes.split('·').map((p) => p.trim());
    const extraParts = parts.filter((p) =>
      !p.match(/^\[.*\]/i) &&
      !p.match(/^(Pembeli|Supplier|Produksi|Keperluan):/i)
    );
    const extraNotes = extraParts.join(' · ');

    const rawText = buildReceiptRawText({
      shopName: 'JAYA WIJAYA',
      shopSub: 'PRODUKSI & TRADING',
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
            <div class="receipt-shop-sub">OPERASIONAL & INDUSTRI PRODUKSI</div>
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

          <!-- NAMA PEMBELI DI ATAS -->
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
                <button type="button" class="button button-small button-primary" data-action="open-settlement-modal" data-type="${type}" data-id="${escapeHtml(rec.id)}" style="background:#0284c7; font-size:10px; padding:2px 8px; height:24px; min-height:24px;">
                  💳 Lunasi
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
          <summary>📦 Rincian Operasional & Mutasi Stok</summary>
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
          <span>💰</span> Lunasi ${isIn ? 'Utang' : 'Piutang'} (${formatMoney(remainingAmount)})
        </button>` : ''}
        <button type="button" class="button button-outline" data-action="copy-receipt-text" style="display:inline-flex; align-items:center; gap:5px;" title="Salin format teks monospaced untuk dicetak lewat aplikasi Bluetooth atau dikirim ke WhatsApp">
          <span>📋</span> Salin Teks Struk
        </button>
        <button type="button" class="button button-primary" data-action="print-thermal-receipt" style="display:inline-flex; align-items:center; gap:6px; background:#187554;" title="Cetak nota langsung ke printer Bluetooth (58mm / 80mm)">
          <span>🖨️</span> Cetak Nota (Bluetooth)
        </button>
      </div>
    `);
  } else if (type === 'payroll' || type === 'employee') {
    const emp = state.employees.find((e) => e.id === id);
    if (!emp) return;
    payMonthlySalaryModal(emp.id, month);
  }
}


function openSettlementModal(targetType, targetId) {
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
        if (state.isDemo) {
          demoStore.update('inventory', targetId, { notes: updatedNote });
        } else {
          const { error: invErr } = await supabase.from('inventory_movements').update({ notes: updatedNote }).eq('id', targetId);
          if (invErr) return invErr;
        }
      } else if (targetType === 'cash') {
        const updatedCashDesc = isFullSettlement
          ? `${rec.category} (Lunas - Dilunasi ${formatDate(settleDate)}) · ${partyName ? `${isSale ? 'Pembeli' : 'Supplier'}: ${partyName}` : ''}${settleNotes ? ' · ' + settleNotes : ''}`
          : `${rec.category} (DP Diterima ${formatMoney(newPaidAmount)} · Sisa Tagihan: ${formatMoney(newRemaining)}) · ${partyName ? `${isSale ? 'Pembeli' : 'Supplier'}: ${partyName}` : ''}`;

        if (state.isDemo) {
          demoStore.update('cash', targetId, { description: updatedCashDesc });
        } else {
          const { error: cashErr } = await supabase.from('cash_transactions').update({ description: updatedCashDesc }).eq('id', targetId);
          if (cashErr) return cashErr;
        }

        const origInv = state.inventory.find((i) =>
          i.occurred_on === rec.occurred_on &&
          i.notes &&
          i.notes.includes(partyName || '')
        );
        if (origInv) {
          if (state.isDemo) {
            demoStore.update('inventory', origInv.id, { notes: updatedNote });
          } else {
            await supabase.from('inventory_movements').update({ notes: updatedNote }).eq('id', origInv.id);
          }
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

        if (state.isDemo) {
          demoStore.insert('cash', cashPayload);
        } else {
          const { error: newCashErr } = await supabase.from('cash_transactions').insert(cashPayload);
          if (newCashErr) return newCashErr;
        }
      }

      return null;
    }, isFullSettlement
      ? `Pelunasan berhasil! Tagihan ${partyName ? `atas nama ${partyName}` : ''} sebesar ${formatMoney(settleAmount)} telah LUNAS.`
      : `Pembayaran cicilan sebesar ${formatMoney(settleAmount)} berhasil dicatat (Sisa tagihan: ${formatMoney(newRemaining)}).`);

    await refreshData();
    renderPage();
    openReportDetailModal(targetType, targetId, state.selectedReportMonth || currentMonth);
  });
}


function openStatDetailModal(statType) {
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
          <button type="button" class="button button-outline" data-action="add-production" style="color:#187554;"><span>🏭</span> Hasil Produksi</button>
          <button type="button" class="button button-outline" data-action="add-inventory"><span>＋</span> Catat Pergerakan</button>
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

function categorizeExpense(record) {
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

function renderReports(month = currentMonth) {
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

  // Kuantitas Persediaan Masuk vs Keluar
  const totalQtyIn = inventory.filter((inv) => inv.direction === 'in').reduce((sum, inv) => sum + Number(inv.quantity), 0);
  const totalQtyOut = inventory.filter((inv) => inv.direction === 'out').reduce((sum, inv) => sum + Number(inv.quantity), 0);

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

  // PENGELOMPOKAN PENGELUARAN KAS: UNTUK APA SAJA
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

  // Jika gaji bulanan belum dicatat di kas dan user admin, masukkan estimasi beban gaji ke visualisasi
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

  // TAB NAVIGASI KELOMPOK LAPORAN UTAMA
  const reportViewTabs = [
    { key: 'all', icon: '📊', label: 'Ringkasan Semua', badge: `${cash.length + inventory.length + (state.isAdmin ? monthlyCalcs.length : 0)} catatan` },
    { key: 'gross_profit', icon: '📈', label: 'Laba Kotor', badge: formatMoney(grossProfit) },
    { key: 'net_profit', icon: '💰', label: 'Laba Bersih', badge: formatMoney(netProfit) },
    { key: 'expenses', icon: '📋', label: 'Pengeluaran Kas (Untuk Apa Saja)', badge: formatMoney(totalCombinedExpenses) },
    { key: 'income', icon: '↗', label: 'Pemasukan (Omzet)', badge: formatMoney(totalIn) },
    ...(state.isAdmin ? [{ key: 'payroll', icon: '👥', label: 'Gaji & Lembur', badge: formatMoney(totalPayroll) }] : []),
    { key: 'inventory', icon: '📦', label: 'Persediaan Barang', badge: `${inventory.length} mutasi` },
  ];

  // TAB FILTER CEPAT UNTUK TABEL
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

  // Item untuk Pratinjau berdasarkan Filter Aktif
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

  // RENDER SEKSI KHUSUS SESUAI KELOMPOK
  let specificGroupHtml = '';

  if (currentFilter === 'gross_profit') {
    // 1. KELOMPOK LABA KOTOR (GROSS PROFIT)
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
    // 2. KELOMPOK LABA BERSIH (NET PROFIT)
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
    // 3. KELOMPOK PENGELUARAN KAS (UNTUK APA SAJA)
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
    // 4. KELOMPOK PEMASUKAN (OMZET)
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
    // 5. KELOMPOK GAJI & LEMBUR KARYAWAN
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
    // 6. KELOMPOK PERSEDIAAN BARANG
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
    // 7. KELOMPOK SEMUA (RINGKASAN EKSEKUTIF / INCOME STATEMENT LENGKAP)
    specificGroupHtml = `
      <!-- KARTU INDIKATOR KEUANGAN UTAMA (INTERAKTIF & DAPAT DIKLIK) -->
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

    <!-- MENU TAB NAVIGASI KELOMPOK LAPORAN UTAMA -->
    <nav class="report-view-nav" aria-label="Kelompok laporan">
      ${reportViewTabs.map((tab) => `
        <button type="button" class="report-view-btn ${currentFilter === tab.key ? 'is-active' : ''}" data-action="filter-report" data-filter="${escapeHtml(tab.key)}">
          <span>${tab.icon}</span> <span>${escapeHtml(tab.label)}</span> <span class="report-view-badge">${escapeHtml(tab.badge)}</span>
        </button>
      `).join('')}
    </nav>

    ${specificGroupHtml}

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

function inventoryForm(initialType = 'in_production', initialProductId = null) {
  if (!state.products.length) {
    notify('Tambahkan produk terlebih dahulu sebelum mencatat persediaan.', 'error');
    state.page = 'products';
    renderShell();
    return;
  }
  const defaultPid = initialProductId || state.products[0]?.id;
  const options = state.products.map((product) => `
    <option value="${escapeHtml(product.id)}" data-purchase="${product.purchase_price || 0}" data-selling="${product.selling_price || 0}" data-unit="${escapeHtml(product.unit)}" ${product.id === defaultPid ? 'selected' : ''}>
      ${escapeHtml(product.name)} · stok ${formatQuantity(stockFor(product.id))} ${escapeHtml(product.unit)}
    </option>`).join('');

  const dialogTitle = initialType === 'in_production' ? 'Tambah Stok Hasil Produksi Pabrik' : 'Catat pergerakan barang';

  openDialog(dialogTitle, `
    <form id="inventory-form" class="form-stack">
      <label>Jenis pergerakan
        <select name="movement_type" id="inv-movement-type" required>
          <option value="in_production" ${initialType === 'in_production' ? 'selected' : ''}>🏭 Barang Masuk: Hasil Produksi Sendiri (Barang Jadi)</option>
          <option value="in_purchase" ${initialType === 'in_purchase' ? 'selected' : ''}>🛒 Barang Masuk: Belanja / Beli dari Supplier (Bahan Baku / Kulakan)</option>
          <option value="out_sale" ${initialType === 'out_sale' ? 'selected' : ''}>🚚 Barang Keluar: Penjualan ke Pelanggan (Pesanan Kirim)</option>
          <option value="out_usage" ${initialType === 'out_usage' ? 'selected' : ''}>📦 Barang Keluar: Pemakaian Internal / Reject (Rusak)</option>
        </select>
      </label>

      <label>Produk yang dicatat<select name="product_id" id="inv-product" required>${options}</select></label>
      
      <div class="form-row">
        <label>Jumlah unit
          <input name="quantity" id="inv-qty" type="number" min="0.01" step="0.01" placeholder="0" required />
        </label>
        <label>Tanggal pergerakan
          <input name="occurred_on" type="date" value="${localDate}" required />
        </label>
      </div>

      <!-- Info Box Khusus Hasil Produksi -->
      <div class="formula-note" id="inv-prod-info" style="margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px; background: #edf7f0; border-left: 4px solid #187554; color: #187554;">
        <div style="font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">
          <span>🏭</span> Produksi Pabrik Sendiri
        </div>
        <div style="font-size: 11px; line-height: 1.5; color: #205c3d;">
          Stok fisik barang jadi akan <strong>bertambah</strong> tanpa memotong kas belanja perusahaan. Biaya bahan baku dan gaji pekerja pabrik telah dicatat terpisah pada buku kas dan absensi harian.
        </div>
      </div>

      <!-- Info Box Pemakaian Internal / Reject -->
      <div class="formula-note" id="inv-usage-info" style="display: none; margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px; background: #fff8e1; border-left: 4px solid #fbc02d; color: #7f6000;">
        <div style="font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">
          <span>📦</span> Pemakaian Internal / Reject (Rusak)
        </div>
        <div style="font-size: 11px; line-height: 1.5; color: #6d4c00;">
          Stok fisik akan <strong>berkurang</strong> karena digunakan untuk keperluan internal pabrik, sampel, atau afkir (rusak). Transaksi keuangan tidak terpengaruh.
        </div>
      </div>

      <!-- Cash Box untuk Pembelian Supplier atau Penjualan Pelanggan -->
      <div class="formula-note" id="inv-cash-box" style="display: none; margin: 3px 0 6px; padding: 12px 14px; border-radius: 8px;">
        <label class="checkbox-label" style="font-weight: 700; color: #187554; display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" name="sync_cash" id="inv-sync-cash" checked />
          <span>Sinkronkan ke Keuangan Otomatis</span>
        </label>
        <div id="inv-cash-fields">
          <div class="form-row">
            <label id="inv-unit-price-label">Harga Satuan (Rp)
              <input name="unit_price" id="inv-unit-price" type="number" min="0" step="1" placeholder="0" />
            </label>
            <label id="inv-total-label">Total Nilai Tagihan (Rp)
              <input name="total_amount" id="inv-total-amount" type="number" min="0" step="1" placeholder="0" />
            </label>
          </div>

          <!-- OPSI METODE / STATUS PEMBAYARAN -->
          <div id="inv-payment-box" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbe2d5;">
            <div class="form-row">
              <label>Status / Metode Pembayaran
                <select name="payment_status" id="inv-payment-status">
                  <option value="paid">✓ Lunas Langsung (Dibayar 100%)</option>
                  <option value="dp">⏳ Bayar Uang Muka / DP Dulu</option>
                  <option value="unpaid">📋 Belum Dibayar (Tempo / Piutang Penuh)</option>
                </select>
              </label>
              <label id="inv-paid-amount-wrap" style="display: none;">
                <span id="inv-paid-amount-title">Nominal DP Diterima (Rp)</span>
                <input name="paid_amount" id="inv-paid-amount" type="number" min="0" step="1" placeholder="0" />
              </label>
            </div>
            <div id="inv-payment-summary" style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; font-size: 11px; line-height: 1.5; background: #edf7f0; color: #187554;">
            </div>
          </div>

          <div id="inv-cash-desc" style="font-size: 10px; color: #3a6850; margin-top: 6px; line-height: 1.5;">
            💡 Dicatat otomatis ke buku kas.
          </div>
        </div>
      </div>

      <!-- Input Khusus Pihak Terkait (Nama Pembeli / Nama Supplier / Tim) -->
      <label id="inv-party-wrap">
        <span id="inv-party-label">Nama Pembeli / Pelanggan <span class="optional">(opsional)</span></span>
        <input name="party_name" id="inv-party-name" maxlength="120" placeholder="Contoh: Toko Berkah, CV Mandiri, Pak Hendra" />
      </label>

      <label>Catatan Tambahan <span class="optional">(opsional)</span>
        <input name="notes" id="inv-notes" maxlength="240" placeholder="Keterangan pergerakan atau nomor nota/invoice" />
      </label>
      
      <div class="dialog-actions">
        <button type="button" class="button button-quiet" data-action="close-dialog">Batal</button>
        <button class="button button-primary" type="submit">Simpan catatan</button>
      </div>
    </form>`);

  const form = document.querySelector('#inventory-form');
  const productSelect = form.querySelector('#inv-product');
  const moveTypeSelect = form.querySelector('#inv-movement-type');
  const qtyInput = form.querySelector('#inv-qty');
  const syncCash = form.querySelector('#inv-sync-cash');
  const cashBox = form.querySelector('#inv-cash-box');
  const cashFields = form.querySelector('#inv-cash-fields');
  const prodInfo = form.querySelector('#inv-prod-info');
  const usageInfo = form.querySelector('#inv-usage-info');
  const priceLabel = form.querySelector('#inv-unit-price-label');
  const unitPriceInput = form.querySelector('#inv-unit-price');
  const totalAmountInput = form.querySelector('#inv-total-amount');
  const cashDesc = form.querySelector('#inv-cash-desc');
  const partyWrap = form.querySelector('#inv-party-wrap');
  const partyLabel = form.querySelector('#inv-party-label');
  const partyInput = form.querySelector('#inv-party-name');
  const notesInput = form.querySelector('#inv-notes');
  const paymentStatusSelect = form.querySelector('#inv-payment-status');
  const paidAmountWrap = form.querySelector('#inv-paid-amount-wrap');
  const paidAmountTitle = form.querySelector('#inv-paid-amount-title');
  const paidAmountInput = form.querySelector('#inv-paid-amount');
  const paymentSummary = form.querySelector('#inv-payment-summary');

  function updatePaymentCalc() {
    const isSale = moveTypeSelect.value === 'out_sale';
    const isPurchase = moveTypeSelect.value === 'in_purchase';
    if (!isSale && !isPurchase) return;

    const total = Number(totalAmountInput.value) || 0;
    const status = paymentStatusSelect.value;

    paidAmountTitle.textContent = isSale ? 'Nominal DP Diterima di Kas (Rp)' : 'Nominal DP Dibayar dari Kas (Rp)';

    if (status === 'paid') {
      paidAmountWrap.style.display = 'none';
      paidAmountInput.value = total || '';
      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#edf7f0';
      paymentSummary.style.color = '#187554';
      paymentSummary.style.border = '1px solid #c2e7cc';
      paymentSummary.innerHTML = `✓ <strong>Lunas Langsung (100%)</strong>: Uang kas ${isSale ? 'masuk' : 'keluar'} penuh sebesar <strong>${formatMoney(total)}</strong>.`;
      cashDesc.innerHTML = `💡 Otomatis dicatat sebagai <strong>${isSale ? 'Kas Masuk (Penjualan Produk)' : 'Kas Keluar (Belanja Barang)'}</strong> sebesar <strong>${formatMoney(total)}</strong>.`;
    } else if (status === 'dp') {
      paidAmountWrap.style.display = 'block';
      if (!paidAmountInput.value && total > 0) {
        paidAmountInput.value = Math.round(total / 2);
      }
      const paid = Number(paidAmountInput.value) || 0;
      const remaining = Math.max(0, total - paid);

      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#fff8e1';
      paymentSummary.style.color = '#855900';
      paymentSummary.style.border = '1px solid #ffe082';
      paymentSummary.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 3px;">⏳ Pembayaran Uang Muka (DP)</div>
        • ${isSale ? 'Uang DP Diterima di Kas' : 'Uang DP Dibayar dari Kas'}: <strong>${formatMoney(paid)}</strong><br />
        • Sisa ${isSale ? 'Tagihan (Piutang Pelanggan)' : 'Utang Supplier'}: <strong style="color: #c93b2b;">${formatMoney(remaining)}</strong> (${remaining <= 0 ? 'Lunas' : 'Belum Dilunasi'})
      `;
      cashDesc.innerHTML = `💡 Hanya uang DP sebesar <strong>${formatMoney(paid)}</strong> yang dibukukan ke kas. Sisa ${formatMoney(remaining)} dicatat sebagai catatan ${isSale ? 'piutang' : 'utang'}.`;
    } else if (status === 'unpaid') {
      paidAmountWrap.style.display = 'none';
      paidAmountInput.value = '0';
      paymentSummary.style.display = 'block';
      paymentSummary.style.background = '#fdf2e9';
      paymentSummary.style.color = '#9c4d00';
      paymentSummary.style.border = '1px solid #fcd6b5';
      paymentSummary.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 3px;">📋 ${isSale ? 'Penjualan Tempo / Piutang 100%' : 'Beli Tempo / Utang 100%'}</div>
        Barang fisik ${isSale ? 'keluar dikirim ke pembeli' : 'masuk diterima dari supplier'}. <strong>Tidak ada uang kas yang ${isSale ? 'masuk' : 'keluar'} saat ini (Rp 0)</strong>.<br />
        Total ${isSale ? 'piutang yang akan ditagih' : 'utang yang harus dibayar'}: <strong>${formatMoney(total)}</strong>.
      `;
      cashDesc.innerHTML = `💡 Saldo kas saat ini <strong>TIDAK terpengaruh (Rp 0)</strong> karena transaksi tempo/kredit.`;
    }
  }

  function updateTypeState(autoFill = true) {
    const type = moveTypeSelect.value;
    const selectedOption = productSelect.selectedOptions[0];

    if (type === 'in_production') {
      prodInfo.style.display = 'block';
      usageInfo.style.display = 'none';
      cashBox.style.display = 'none';
      syncCash.checked = false;
      partyWrap.style.display = 'block';
      partyLabel.innerHTML = 'Tim / Shift / Mesin Produksi <span class="optional">(opsional)</span>';
      partyInput.placeholder = 'Contoh: Shift Pagi, Mesin Cetak A, Batch #12';
      notesInput.placeholder = 'Contoh: Selesai rakit 500 box, SPK-089';
    } else if (type === 'out_usage') {
      prodInfo.style.display = 'none';
      usageInfo.style.display = 'block';
      cashBox.style.display = 'none';
      syncCash.checked = false;
      partyWrap.style.display = 'block';
      partyLabel.innerHTML = 'Keperluan Pemakaian / Keterangan Reject <span class="optional">(opsional)</span>';
      partyInput.placeholder = 'Contoh: Sampel display, Rusak saat proses cetak';
      notesInput.placeholder = 'Contoh: Divisi marketing, QC afkir';
    } else {
      prodInfo.style.display = 'none';
      usageInfo.style.display = 'none';
      cashBox.style.display = 'block';
      syncCash.checked = true;
      cashFields.style.display = 'block';

      const isPurchase = type === 'in_purchase';
      const defaultPrice = Number(isPurchase ? selectedOption?.dataset.purchase : selectedOption?.dataset.selling) || 0;
      if (autoFill) {
        unitPriceInput.value = defaultPrice || '';
      }
      priceLabel.childNodes[0].nodeValue = isPurchase ? 'Harga Beli Satuan (Rp) ' : 'Harga Jual Satuan (Rp) ';
      
      partyWrap.style.display = 'block';
      if (isPurchase) {
        partyLabel.innerHTML = 'Nama Supplier / Tempat Beli <span class="optional">(opsional)</span>';
        partyInput.placeholder = 'Contoh: PT Kertas Nusantara, Toko Bahan Abadi';
        notesInput.placeholder = 'Contoh: Nomor Nota #123, kontak supplier';
      } else {
        partyLabel.innerHTML = 'Nama Pembeli / Pelanggan <span class="optional">(opsional)</span>';
        partyInput.placeholder = 'Contoh: Toko Berkah, CV Mandiri, Pak Hendra';
        notesInput.placeholder = 'Contoh: No. Faktur / Invoice #456, alamat kirim';
      }

      const qty = Number(qtyInput.value) || 0;
      const unitPrice = Number(unitPriceInput.value) || 0;
      const calcTotal = Math.round(qty * unitPrice);

      if (autoFill || !totalAmountInput.value) {
        totalAmountInput.value = calcTotal || '';
      }

      updatePaymentCalc();
    }
  }

  productSelect.addEventListener('change', () => updateTypeState(true));
  moveTypeSelect.addEventListener('change', () => updateTypeState(true));
  qtyInput.addEventListener('input', () => {
    const qty = Number(qtyInput.value) || 0;
    const unitPrice = Number(unitPriceInput.value) || 0;
    totalAmountInput.value = Math.round(qty * unitPrice) || '';
    updateTypeState(false);
  });
  unitPriceInput.addEventListener('input', () => {
    const qty = Number(qtyInput.value) || 0;
    const unitPrice = Number(unitPriceInput.value) || 0;
    totalAmountInput.value = Math.round(qty * unitPrice) || '';
    updateTypeState(false);
  });
  totalAmountInput.addEventListener('input', () => {
    updatePaymentCalc();
  });
  paymentStatusSelect.addEventListener('change', () => {
    updatePaymentCalc();
  });
  paidAmountInput.addEventListener('input', () => {
    updatePaymentCalc();
  });
  syncCash.addEventListener('change', () => {
    cashFields.style.display = syncCash.checked ? 'block' : 'none';
  });

  updateTypeState(true);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const pId = formData.get('product_id');
    const moveType = formData.get('movement_type');
    const dir = (moveType === 'in_production' || moveType === 'in_purchase') ? 'in' : 'out';
    const qty = Number(formData.get('quantity'));
    const occ = formData.get('occurred_on');
    const rawNotes = formData.get('notes').trim();
    const shouldSyncCash = (moveType === 'in_purchase' || moveType === 'out_sale') && formData.has('sync_cash');
    const totalAmount = Number(formData.get('total_amount')) || 0;
    const payStatus = formData.get('payment_status') || 'paid';

    let actualPaidAmount = totalAmount;
    if (payStatus === 'dp') {
      actualPaidAmount = Number(formData.get('paid_amount')) || 0;
    } else if (payStatus === 'unpaid') {
      actualPaidAmount = 0;
    }
    const remainingAmount = Math.max(0, totalAmount - actualPaidAmount);

    const partyName = (formData.get('party_name') || '').trim();
    const product = state.products.find((item) => item.id === pId);
    const prodName = product?.name || 'Produk';
    const prodUnit = product?.unit || 'unit';

    let detailsText = '';
    if (moveType === 'out_sale') {
      if (partyName) detailsText += `Pembeli: ${partyName}`;
    } else if (moveType === 'in_purchase') {
      if (partyName) detailsText += `Supplier: ${partyName}`;
    } else if (moveType === 'in_production') {
      if (partyName) detailsText += `Produksi: ${partyName}`;
    } else if (moveType === 'out_usage') {
      if (partyName) detailsText += `Keperluan: ${partyName}`;
    }

    if (rawNotes) {
      detailsText = detailsText ? `${detailsText} · ${rawNotes}` : rawNotes;
    }

    let formattedNotes = detailsText;
    if (moveType === 'in_production') {
      formattedNotes = detailsText ? `[Hasil Produksi] ${detailsText}` : '[Hasil Produksi] Selesai produksi pabrik';
    } else if (moveType === 'out_usage') {
      formattedNotes = detailsText ? `[Pemakaian Internal] ${detailsText}` : '[Pemakaian Internal] Operasional / Reject';
    } else if (moveType === 'in_purchase') {
      let payPrefix = '[Beli Lunas]';
      if (payStatus === 'dp') payPrefix = `[Beli DP ${formatMoney(actualPaidAmount)} · Sisa Utang ${formatMoney(remainingAmount)}]`;
      else if (payStatus === 'unpaid') payPrefix = `[Beli Tempo/Utang ${formatMoney(totalAmount)}]`;
      formattedNotes = detailsText ? `${payPrefix} ${detailsText}` : payPrefix;
    } else if (moveType === 'out_sale') {
      let payPrefix = '[Penjualan Lunas]';
      if (payStatus === 'dp') payPrefix = `[Penjualan DP ${formatMoney(actualPaidAmount)} · Sisa Piutang ${formatMoney(remainingAmount)}]`;
      else if (payStatus === 'unpaid') payPrefix = `[Penjualan Tempo/Piutang ${formatMoney(totalAmount)}]`;
      formattedNotes = detailsText ? `${payPrefix} ${detailsText}` : payPrefix;
    }

    await runMutation(async () => {
      if (state.isDemo) {
        if (dir === 'out' && qty > stockFor(pId)) {
          return { message: `Stok tidak mencukupi. Stok saat ini: ${formatQuantity(stockFor(pId))} ${prodUnit}` };
        }
        demoStore.insert('inventory', {
          product_id: pId,
          direction: dir,
          quantity: qty,
          occurred_on: occ,
          notes: formattedNotes,
        });

        if (shouldSyncCash && actualPaidAmount > 0) {
          const isSale = dir === 'out';
          const category = isSale
            ? (payStatus === 'dp' ? 'Penjualan Produk (DP)' : 'Penjualan Produk')
            : (payStatus === 'dp' ? 'Belanja Bahan Baku / Barang (DP)' : 'Belanja Bahan Baku / Barang');
          const description = isSale
            ? (payStatus === 'dp'
                ? `DP Penjualan ${formatQuantity(qty)} ${prodUnit} ${prodName} · Diterima: ${formatMoney(actualPaidAmount)} (Sisa Tagihan: ${formatMoney(remainingAmount)})${detailsText ? ` · ${detailsText}` : ''}`
                : `Penjualan ${formatQuantity(qty)} ${prodUnit} ${prodName} (Lunas)${detailsText ? ` · ${detailsText}` : ''}`)
            : (payStatus === 'dp'
                ? `DP Belanja ${formatQuantity(qty)} ${prodUnit} ${prodName} · Dibayar: ${formatMoney(actualPaidAmount)} (Sisa Utang: ${formatMoney(remainingAmount)})${detailsText ? ` · ${detailsText}` : ''}`
                : `Belanja ${formatQuantity(qty)} ${prodUnit} ${prodName} (Lunas)${detailsText ? ` · ${detailsText}` : ''}`);

          demoStore.insert('cash', {
            direction: isSale ? 'in' : 'out',
            amount: actualPaidAmount,
            category,
            description,
            occurred_on: occ,
          });
        }
        return null;
      }

      if (dir === 'out' && qty > stockFor(pId)) {
        return { message: `Stok tidak mencukupi. Stok saat ini: ${formatQuantity(stockFor(pId))} ${prodUnit}` };
      }

      const { error: invError } = await supabase.from('inventory_movements').insert({
        product_id: pId,
        direction: dir,
        quantity: qty,
        occurred_on: occ,
        notes: formattedNotes,
      });
      if (invError) return invError;

      if (shouldSyncCash && actualPaidAmount > 0) {
        const isSale = dir === 'out';
        const category = isSale
          ? (payStatus === 'dp' ? 'Penjualan Produk (DP)' : 'Penjualan Produk')
          : (payStatus === 'dp' ? 'Belanja Bahan Baku / Barang (DP)' : 'Belanja Bahan Baku / Barang');
        const description = isSale
          ? (payStatus === 'dp'
              ? `DP Penjualan ${formatQuantity(qty)} ${prodUnit} ${prodName} · Diterima: ${formatMoney(actualPaidAmount)} (Sisa Tagihan: ${formatMoney(remainingAmount)})${detailsText ? ` · ${detailsText}` : ''}`
              : `Penjualan ${formatQuantity(qty)} ${prodUnit} ${prodName} (Lunas)${detailsText ? ` · ${detailsText}` : ''}`)
          : (payStatus === 'dp'
              ? `DP Belanja ${formatQuantity(qty)} ${prodUnit} ${prodName} · Dibayar: ${formatMoney(actualPaidAmount)} (Sisa Utang: ${formatMoney(remainingAmount)})${detailsText ? ` · ${detailsText}` : ''}`
              : `Belanja ${formatQuantity(qty)} ${prodUnit} ${prodName} (Lunas)${detailsText ? ` · ${detailsText}` : ''}`);

        const { error: cashError } = await supabase.from('cash_transactions').insert({
          direction: isSale ? 'in' : 'out',
          amount: actualPaidAmount,
          category,
          description,
          occurred_on: occ,
        });
        if (cashError) return cashError;
      }
      return null;
    }, moveType === 'in_production'
      ? `Stok hasil produksi (${formatQuantity(qty)} ${prodUnit} ${prodName}) berhasil ditambahkan ke persediaan.`
      : (moveType === 'out_sale' && payStatus === 'dp'
        ? `Penjualan dicatat. Stok berkurang & DP sebesar ${formatMoney(actualPaidAmount)} masuk ke kas (Sisa piutang: ${formatMoney(remainingAmount)}).`
        : (moveType === 'out_sale' && payStatus === 'unpaid'
          ? `Penjualan tempo dicatat. Stok berkurang & piutang pembeli tercatat ${formatMoney(totalAmount)}.`
          : (shouldSyncCash && actualPaidAmount > 0
            ? 'Pergerakan barang dan transaksi kas berhasil dicatat.'
            : 'Pergerakan barang berhasil dicatat.'))));
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
            <option value="Penjualan Produk (DP)" />
            <option value="Pelunasan Piutang Penjualan" />
            <option value="Pelunasan Utang Pembelian" />
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
  const selectedEmp = activeEmployees.find((e) => e.id === selectedEmpId) || activeEmployees[0];
  const targetDate = record?.work_date || record?.period || defaultDate || state.selectedPayrollDate || localDate;
  const initialStatus = record?.attendance_status || 'present';
  const initialQty = record?.production_quantity ?? 0;
  const initialOtHours = record?.overtime_hours ?? 0;
  const initialOtRate = (record?.overtime_rate !== undefined && record?.overtime_rate !== null)
    ? Number(record.overtime_rate)
    : (Number(selectedEmp?.overtime_rate) || 0);
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

      ${state.products.length && !record ? `
      <div id="att-sync-box" style="display: ${initialQty > 0 ? 'block' : 'none'}; margin: 3px 0 6px; padding: 10px 12px; background: #edf7f0; border: 1px solid #c2e7cc; border-radius: 8px;">
        <label class="checkbox-label" style="font-weight: 600; color: #187554; display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 6px;">
          <input type="checkbox" name="sync_to_stock" id="att-sync-stock" />
          <span>🏭 Masukkan hasil produksi ini langsung ke stok persediaan</span>
        </label>
        <div id="att-sync-prod-wrap" style="display: none; margin-top: 6px;">
          <label style="font-size: 11px; color: #285e43;">Pilih produk yang dihasilkan:
            <select name="sync_product_id" id="att-sync-prod-id" style="margin-top: 4px;">
              ${state.products.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.unit)})</option>`).join('')}
            </select>
          </label>
        </div>
      </div>` : ''}

      <div class="form-row">
        <label>Jam lembur hari ini (jam)
          <input name="overtime_hours" id="att-ot-hours" type="number" min="0" max="24" step="0.5" value="${escapeHtml(initialOtHours)}" placeholder="0" />
        </label>
        <label>Tarif lembur per jam (Rp) — <span style="font-weight: normal; color: #176d51;">Dapat diubah admin</span>
          <input name="overtime_rate" id="att-ot-rate" type="number" min="0" step="500" value="${escapeHtml(initialOtRate)}" placeholder="Contoh: 20000" required />
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
  const syncBox = form.querySelector('#att-sync-box');
  const syncStockCheck = form.querySelector('#att-sync-stock');
  const syncProdWrap = form.querySelector('#att-sync-prod-wrap');

  if (syncBox && syncStockCheck && syncProdWrap) {
    syncStockCheck.addEventListener('change', () => {
      syncProdWrap.style.display = syncStockCheck.checked ? 'block' : 'none';
    });
  }

  function calculateWage(autoFillDefaults = true) {
    const selectedOption = empSelect.selectedOptions[0];
    const dailySalary = Number(selectedOption?.dataset?.daily) || 0;
    const defaultOvertimeRate = Number(selectedOption?.dataset?.overtime) || 0;
    const incentiveRate = Number(selectedOption?.dataset?.incentive) || 0;
    const status = statusSelect.value;
    const rateMultiplier = ATTENDANCE_LABELS[status]?.rate ?? 0;
    const standardDailyWage = Math.round(dailySalary * rateMultiplier);

    if (autoFillDefaults || wageInput.value === '') {
      wageInput.value = standardDailyWage;
    }
    if (autoFillDefaults || otRateInput.value === '') {
      otRateInput.value = defaultOvertimeRate;
    }

    const currentWage = Number(wageInput.value) || 0;
    const otHours = Number(otHoursInput.value) || 0;
    const currentOtRate = Number(otRateInput.value) || 0;
    const otPay = Math.round(otHours * currentOtRate);
    const qty = Number(qtyInput.value) || 0;
    const incentiveAmount = Math.round(qty * incentiveRate);
    const totalWage = currentWage + otPay + incentiveAmount;

    summaryBox.innerHTML = `
      <strong>Estimasi Nilai Kerja Hari Ini:</strong><br />
      • Upah pokok: <strong>${formatMoney(currentWage)}</strong> (${ATTENDANCE_LABELS[status]?.label || status})<br />
      • Upah lembur: ${formatQuantity(otHours)} jam × ${formatMoney(currentOtRate)}/jam = <strong style="color: #b86e1e;">${formatMoney(otPay)}</strong><br />
      • Insentif produksi: ${formatQuantity(qty)} unit × ${formatMoney(incentiveRate)} = <strong>${formatMoney(incentiveAmount)}</strong><br />
      • <strong>Total estimasi hari ini: ${formatMoney(totalWage)}</strong> (diakumulasi untuk gaji akhir bulan)
    `;

    if (syncBox) {
      syncBox.style.display = qty > 0 ? 'block' : 'none';
      if (qty <= 0 && syncStockCheck) {
        syncStockCheck.checked = false;
        if (syncProdWrap) syncProdWrap.style.display = 'none';
      }
    }
  }

  empSelect.addEventListener('change', () => calculateWage(true));
  statusSelect.addEventListener('change', () => calculateWage(false));
  wageInput.addEventListener('input', () => calculateWage(false));
  qtyInput.addEventListener('input', () => calculateWage(false));
  otHoursInput.addEventListener('input', () => calculateWage(false));
  otRateInput.addEventListener('input', () => calculateWage(false));

  if (record) {
    wageInput.value = record.daily_wage ?? record.base_salary ?? '';
    otRateInput.value = (record.overtime_rate !== undefined && record.overtime_rate !== null)
      ? record.overtime_rate
      : (selectedEmp?.overtime_rate ?? 0);
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
    const otRate = Number(formData.get('overtime_rate')) || 0;
    const notes = (formData.get('notes') || '').trim();
    const shouldSyncStock = !record && formData.has('sync_to_stock') && prodQty > 0;
    const syncProdId = formData.get('sync_product_id');

    const emp = activeEmployees.find((e) => e.id === empId);
    if (!emp) {
      showError('Data karyawan tidak valid.');
      return;
    }

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

        if (shouldSyncStock && syncProdId) {
          demoStore.insert('inventory', {
            product_id: syncProdId,
            direction: 'in',
            quantity: prodQty,
            occurred_on: workDate,
            notes: `[Hasil Produksi] Pekerja: ${emp.full_name}${notes ? ` · ${notes}` : ''}`,
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

      if (shouldSyncStock && syncProdId) {
        const { error: invErr } = await supabase.from('inventory_movements').insert({
          product_id: syncProdId,
          direction: 'in',
          quantity: prodQty,
          occurred_on: workDate,
          notes: `[Hasil Produksi] Pekerja: ${emp.full_name}${notes ? ` · ${notes}` : ''}`,
        });
        if (invErr) return invErr;
      }

      return null;
    }, shouldSyncStock
      ? `Catatan absensi disimpan & ${formatQuantity(prodQty)} unit hasil produksi ditambahkan ke stok persediaan.`
      : 'Catatan absensi berhasil disimpan.');
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

function downloadPayrollReport(month) {
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
    .sort((a, b) => (a.work_date || a.period).localeCompare(b.work_date || b.period));

  const rows = [
    ['REKAPITULASI GAJI & ABSENSI KARYAWAN BULANAN'],
    ['Nama Perusahaan', 'Jaya Wijaya'],
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

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `rekap-gaji-dan-absensi-${selectedMonth}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  notify(`Rekap gaji & absensi periode ${selectedMonth} berhasil diunduh.`);
}

function downloadSingleEmployeeAttendance(employeeId, month) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return;
  const calc = calculateMonthlySalary(employee, month);
  const records = [...calc.records].sort((a, b) => (a.work_date || a.period).localeCompare(b.work_date || b.period));

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
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  notify(`Rincian absensi ${employee.full_name} berhasil diunduh.`);
}

function downloadReport(month) {
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

  const expCats = {};
  for (const exp of cash.filter((r) => r.direction === 'out')) {
    const info = categorizeExpense(exp);
    const key = info.group;
    if (!expCats[key]) expCats[key] = { name: key, count: 0, amount: 0 };
    expCats[key].count += 1;
    expCats[key].amount += Number(exp.amount) || 0;
  }

  const rows = [
    ['RINGKASAN LAPORAN KEUANGAN & OPERASIONAL BULANAN'],
    ['Nama Perusahaan', 'Jaya Wijaya'],
    ['Periode Bulan', selectedMonth],
    ['Tanggal Unduh / Ekspor', formatDate(localDate)],
    [],
    ['=== 1. RINGKASAN LABA RUGI OPERASIONAL ==='],
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
    ['=== 2. RINCIAN PENGELUARAN KAS BERDASARKAN KATEGORI (UNTUK APA SAJA) ==='],
    ['Kategori Pengeluaran', 'Jumlah Transaksi', 'Total Nominal (IDR)', 'Pangsa Pengeluaran (%)'],
    ...Object.values(expCats).map((c) => [c.name, c.count, c.amount, `${totalOut > 0 ? ((c.amount / totalOut) * 100).toFixed(1) : 0}%`]),
    ['TOTAL SELURUH PENGELUARAN KAS', cash.filter((r) => r.direction === 'out').length, totalOut, '100%'],
    [],
    ['=== 3. RINCIAN CATATAN TRANSAKSI OPERASIONAL & PERSEDIAAN ==='],
    ['Tanggal', 'Jenis Catatan', 'Nama / Kategori', 'Arah', 'Jumlah / Unit', 'Nilai (IDR)', 'Klasifikasi', 'Catatan / Pihak Terkait (Pembeli/Supplier)']
  ];

  for (const item of inventory) {
    const prod = item.products || state.products.find((p) => p.id === item.product_id);
    const isIn = item.direction === 'in';
    const unitPrice = isIn ? (Number(prod?.purchase_price) || 0) : (Number(prod?.selling_price) || 0);
    const totalVal = Math.round(Number(item.quantity || 0) * unitPrice);
    rows.push([
      item.occurred_on,
      'Persediaan',
      prod?.name || 'Produk',
      isIn ? 'Masuk' : 'Keluar',
      `${item.quantity} ${prod?.unit || ''}`.trim(),
      totalVal > 0 ? totalVal : '',
      isIn ? 'Penerimaan Stok' : 'Pengeluaran Stok',
      item.notes || '',
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
      const calc = calculateMonthlySalary(emp, selectedMonth);
      rows.push([
        monthEnd(selectedMonth),
        'Gaji Bulanan',
        `${emp.full_name} (${calc.effectiveDays} hari kerja, ${calc.totalOvertimeHours} jam lembur)`,
        'Keluar',
        `${formatQuantity(calc.totalProduction)} unit`,
        calc.totalSalary,
        calc.isPaid ? 'Lunas' : 'Belum dibayar',
        `Pokok: ${formatMoney(calc.baseSalary)}; Lembur: ${formatMoney(calc.overtimeAmount)}; Insentif: ${formatMoney(calc.incentiveAmount)}`.trim(),
      ]);
    }

    for (const item of monthRecords(state.payroll, selectedMonth, 'work_date')) {
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
  link.download = `laporan-operasional-${selectedMonth}.csv`;
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
    openDialog('Catat transaksi', `<div class="quick-actions">
      <button class="quick-action-card" data-action="add-production"><span class="quick-action-icon" style="background:#edf7f0; color:#187554;">🏭</span><strong>Hasil produksi</strong><small>Tambah stok barang jadi pabrik</small><span class="quick-action-arrow">→</span></button>
      <button class="quick-action-card" data-action="add-inventory"><span class="quick-action-icon icon-blue">▦</span><strong>Pergerakan barang</strong><small>Beli dari supplier / kirim penjualan</small><span class="quick-action-arrow">→</span></button>
      <button class="quick-action-card" data-action="add-cash"><span class="quick-action-icon icon-green">↗</span><strong>Transaksi kas</strong><small>Catat uang masuk atau keluar</small><span class="quick-action-arrow">→</span></button>
    </div>`);
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
  } else if (action === 'add-production') {
    document.querySelector('#app-dialog').close();
    inventoryForm('in_production', id || null);
  } else if (action === 'add-inventory' || action === 'product-movement') {
    document.querySelector('#app-dialog').close();
    inventoryForm('in_purchase', id || null);
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
    const month = button.dataset.month || document.querySelector('#report-month')?.value || state.selectedReportMonth || currentMonth;
    if (!month) {
      showError('Pilih bulan laporan terlebih dahulu.');
      return;
    }
    downloadReport(month);
    notify(`Laporan bulanan periode ${month} berhasil diunduh.`);
  } else if (action === 'set-report-month') {
    const month = button.dataset.month;
    if (month) {
      state.selectedReportMonth = month;
      renderPage();
    }
  } else if (action === 'download-payroll-report') {
    const month = button.dataset.month || document.querySelector('#payroll-month-picker')?.value || document.querySelector('#report-month')?.value || state.selectedPayrollMonth || currentMonth;
    downloadPayrollReport(month);
  } else if (action === 'download-single-employee-attendance') {
    const month = button.dataset.month || state.selectedPayrollMonth || currentMonth;
    downloadSingleEmployeeAttendance(id, month);
  } else if (action === 'filter-report') {
    state.selectedReportFilter = button.dataset.filter || 'all';
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
    configMessage();
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
