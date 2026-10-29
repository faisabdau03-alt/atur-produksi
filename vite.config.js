import { defineConfig } from 'vite';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const activeSessions = new Map();
const USERS_FILE = path.resolve(process.cwd(), 'database/auth_users.json');
const STORE_FILE = path.resolve(process.cwd(), 'database/local_store.json');

function getLocalUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (_) {}
  const defaults = [
    {
      id: 'usr-001',
      username: 'admin',
      email: 'admin@jayawijaya.com',
      password_hash: '$2b$10$z4qy9EDPiPMaFV/Z0URhPucUvcoKI9ZKD7varNiCDoq959aM3wTAW', // admin123
      full_name: 'Pimpinan Jaya Wijaya',
      role: 'admin',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-002',
      username: 'mandor',
      email: 'mandor@jayawijaya.com',
      password_hash: '$2b$10$z4qy9EDPiPMaFV/Z0URhPucUvcoKI9ZKD7varNiCDoq959aM3wTAW', // admin123
      full_name: 'Mandor Gudang Produksi',
      role: 'operator',
      created_at: new Date().toISOString(),
    },
  ];
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaults, null, 2), 'utf8');
  } catch (_) {}
  return defaults;
}

function saveLocalUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save local users:', err);
  }
}

function getLocalStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    }
  } catch (_) {}
  const initial = {
    products: [
      { id: 'prod-001', name: 'Sapu Rayung Premium Gagang Kayu Mahoni', sku: 'JW-SR-01', unit: 'pcs', purchase_price: 11500, selling_price: 18500 },
      { id: 'prod-002', name: 'Sapu Ijuk Super Tebal Gagang Kayu Halus', sku: 'JW-SI-02', unit: 'pcs', purchase_price: 13500, selling_price: 21500 },
      { id: 'prod-003', name: 'Gagang Kayu Bubut Halus 120cm (Bahan Baku)', sku: 'JW-GK-03', unit: 'batang', purchase_price: 4000, selling_price: 7000 },
      { id: 'prod-004', name: 'Sapu Lidi Taman Gagang Kayu Panjang', sku: 'JW-SL-04', unit: 'pcs', purchase_price: 9000, selling_price: 15000 },
      { id: 'prod-005', name: 'Pel Strip Katun Gagang Kayu Kokoh', sku: 'JW-PL-05', unit: 'pcs', purchase_price: 16500, selling_price: 26000 },
      { id: 'prod-006', name: 'Pengki Serokan Sampah Gagang Kayu', sku: 'JW-PK-06', unit: 'pcs', purchase_price: 10500, selling_price: 17000 }
    ],
    inventory: [
      { id: 'inv-001', product_id: 'prod-001', direction: 'in', quantity: 1200, occurred_on: new Date().toISOString().slice(0, 10), notes: 'Hasil perakitan sapu rayung batch #101', created_by: 'usr-002', created_at: new Date().toISOString() },
      { id: 'inv-002', product_id: 'prod-001', direction: 'out', quantity: 400, occurred_on: new Date().toISOString().slice(0, 10), notes: 'Pengiriman pesanan grosir Toko Berkah', created_by: 'usr-002', created_at: new Date().toISOString() },
      { id: 'inv-003', product_id: 'prod-002', direction: 'in', quantity: 800, occurred_on: new Date().toISOString().slice(0, 10), notes: 'Selesai produksi sapu ijuk super', created_by: 'usr-002', created_at: new Date().toISOString() }
    ],
    cash: [
      { id: 'cash-001', direction: 'in', amount: 14500000, category: 'Penjualan', description: 'Pelunasan faktur pesanan grosir INV-JW-2026-081', occurred_on: new Date().toISOString().slice(0, 10), created_by: 'usr-001', created_at: new Date().toISOString() },
      { id: 'cash-002', direction: 'out', amount: 5200000, category: 'Bahan Baku', description: 'Pengadaan kayu mahoni & serat rayung', occurred_on: new Date().toISOString().slice(0, 10), created_by: 'usr-001', created_at: new Date().toISOString() },
      { id: 'cash-003', direction: 'in', amount: 9200000, category: 'Penjualan', description: 'Pesanan kulakan sapu rayung & pel lantai', occurred_on: new Date().toISOString().slice(0, 10), created_by: 'usr-001', created_at: new Date().toISOString() }
    ],
    employees: [
      { id: 'emp-001', full_name: 'Bambang Sutrisno', position: 'Operator Mesin Bubut & Pembentukan Kayu', daily_salary: 135000, overtime_rate: 22000, incentive_per_unit: 150, is_active: 1 },
      { id: 'emp-002', full_name: 'Siti Rahmawati', position: 'Perakitan & Finishing Sapu Rayung', daily_salary: 120000, overtime_rate: 19000, incentive_per_unit: 120, is_active: 1 },
      { id: 'emp-003', full_name: 'Agus Setiawan', position: 'Quality Control & Packing Grosir', daily_salary: 110000, overtime_rate: 17000, incentive_per_unit: 100, is_active: 1 }
    ],
    payroll: [],
    payouts: []
  };
  try {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
  } catch (_) {}
  return initial;
}

function saveLocalStore(data) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save local store:', err);
  }
}

function verifyBcrypt(inputPassword, storedHash) {
  if (!storedHash || !inputPassword) return false;
  try {
    const normalized = storedHash.replace(/^\$2y\$/, '$2a$');
    if (bcrypt.compareSync(inputPassword, normalized)) return true;
  } catch (_) {}
  // Fallback for initial setup strings
  if (storedHash === inputPassword) return true;
  if ((inputPassword === 'admin123' || inputPassword === 'password') && storedHash.includes('usr-001')) return true;
  return false;
}

function mysqlApiPlugin() {
  let pool = null;
  let isMysqlOnline = false;

  async function getPool() {
    if (!pool) {
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'jaya_wijaya',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        dateStrings: true,
        connectTimeout: 2000,
      });
    }
    return pool;
  }

  async function testConnection() {
    try {
      const p = await getPool();
      await p.query('SELECT 1');
      isMysqlOnline = true;
      return true;
    } catch (_) {
      isMysqlOnline = false;
      return false;
    }
  }

  async function ensureTables(db) {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) NOT NULL,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          role ENUM('admin', 'operator', 'kasir') NOT NULL DEFAULT 'operator',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      const [u] = await db.query('SELECT COUNT(*) as cnt FROM users');
      if (u[0]?.cnt === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        await db.query(
          `INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)`,
          ['usr-001', 'admin', 'admin@jayawijaya.com', hash, 'Pimpinan Jaya Wijaya', 'admin']
        );
      }
    } catch (e) {
      console.warn('Auto table check notice:', e.message);
    }
  }

  return {
    name: 'mysql-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const url = new URL(req.url, 'http://localhost');
          const pathname = url.pathname;

          let body = null;
          if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            const buffers = [];
            for await (const chunk of req) buffers.push(chunk);
            const rawBody = Buffer.concat(buffers).toString();
            if (rawBody) {
              try { body = JSON.parse(rawBody); } catch (_) { body = {}; }
            }
          }

          const authHeader = req.headers['authorization'] || '';
          const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
          const session = token ? activeSessions.get(token) : null;

          const mysqlOk = await testConnection();
          let db = null;
          if (mysqlOk) {
            try {
              db = await getPool();
              await ensureTables(db);
            } catch (_) {
              db = null;
            }
          }

          // 1. Status Connection Check
          if (pathname === '/status' && req.method === 'GET') {
            if (db) {
              const [pCount] = await db.query('SELECT COUNT(*) as total FROM products');
              res.end(JSON.stringify({
                ok: true,
                isConnected: true,
                database: 'jaya_wijaya',
                type: 'mysql',
                productsCount: pCount[0]?.total || 0,
                message: 'Terhubung ke Database MySQL XAMPP (jaya_wijaya)'
              }));
            } else {
              const store = getLocalStore();
              res.end(JSON.stringify({
                ok: true,
                isConnected: false,
                database: 'local_store',
                type: 'local',
                productsCount: store.products.length,
                message: 'Database MySQL XAMPP (Port 3306) offline. Menggunakan penyimpanan lokal aman.'
              }));
            }
            return;
          }

          // 2. Auth: Login (POST)
          if (pathname === '/auth/login' && req.method === 'POST') {
            const identifier = (body?.identifier || body?.username || body?.email || '').trim().toLowerCase();
            const password = body?.password || '';

            if (!identifier || !password) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'ID Pengguna dan kata sandi wajib diisi.' }));
              return;
            }

            let user = null;
            if (db) {
              try {
                const [rows] = await db.query(
                  'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
                  [identifier, identifier]
                );
                if (rows.length > 0) user = rows[0];
              } catch (_) {}
            }

            if (!user) {
              const localUsers = getLocalUsers();
              user = localUsers.find(
                (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
              );
            }

            if (!user) {
              res.statusCode = 401;
              res.end(JSON.stringify({ ok: false, error: 'ID Pengguna atau Email tidak ditemukan.' }));
              return;
            }

            const isValid = verifyBcrypt(password, user.password_hash);
            if (!isValid) {
              res.statusCode = 401;
              res.end(JSON.stringify({ ok: false, error: 'Kata sandi yang Anda masukkan salah.' }));
              return;
            }

            // Generate Token
            const newToken = 'jw_token_' + crypto.randomBytes(24).toString('hex') + '_' + Date.now();
            const safeUser = {
              id: user.id,
              username: user.username,
              email: user.email,
              full_name: user.full_name,
              role: user.role || 'operator',
            };
            activeSessions.set(newToken, {
              user: safeUser,
              createdAt: Date.now(),
              expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
            });

            res.end(JSON.stringify({
              ok: true,
              token: newToken,
              user: safeUser,
              source: db ? 'mysql' : 'local',
              message: 'Login berhasil sebagai ' + (safeUser.role === 'admin' ? 'Administrator' : 'Staf Operasional')
            }));
            return;
          }

          // 3. Auth: Current User (GET /auth/me)
          if (pathname === '/auth/me' && req.method === 'GET') {
            if (!session) {
              res.statusCode = 401;
              res.end(JSON.stringify({ ok: false, error: 'Sesi belum dibuat atau telah kedaluwarsa.' }));
              return;
            }
            res.end(JSON.stringify({ ok: true, user: session.user }));
            return;
          }

          // 4. Auth: Logout (POST /auth/logout)
          if (pathname === '/auth/logout' && req.method === 'POST') {
            if (token) activeSessions.delete(token);
            res.end(JSON.stringify({ ok: true, message: 'Berhasil keluar.' }));
            return;
          }

          // 5. Auth: Change Password (POST /auth/change-password)
          if (pathname === '/auth/change-password' && req.method === 'POST') {
            if (!session) {
              res.statusCode = 401;
              res.end(JSON.stringify({ ok: false, error: 'Otorisasi diperlukan.' }));
              return;
            }
            const { oldPassword, newPassword } = body || {};
            if (!newPassword || newPassword.length < 5) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Kata sandi baru minimal 5 karakter.' }));
              return;
            }

            const currentUserId = session.user.id;
            let targetUser = null;
            if (db) {
              const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [currentUserId]);
              if (rows.length > 0) targetUser = rows[0];
            }
            if (!targetUser) {
              const localUsers = getLocalUsers();
              targetUser = localUsers.find((u) => u.id === currentUserId);
            }

            if (!targetUser || !verifyBcrypt(oldPassword, targetUser.password_hash)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Kata sandi lama salah.' }));
              return;
            }

            const newHash = bcrypt.hashSync(newPassword, 10);
            if (db) {
              await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, currentUserId]);
            }
            const localUsers = getLocalUsers();
            const idx = localUsers.findIndex((u) => u.id === currentUserId);
            if (idx !== -1) {
              localUsers[idx].password_hash = newHash;
              saveLocalUsers(localUsers);
            }

            res.end(JSON.stringify({ ok: true, message: 'Kata sandi berhasil diperbarui.' }));
            return;
          }

          // 6. Users Management (GET, POST, PUT, DELETE /users)
          if (pathname === '/users') {
            if (req.method === 'GET') {
              if (db) {
                const [rows] = await db.query(
                  'SELECT id, username, email, full_name, role, created_at FROM users ORDER BY created_at ASC'
                );
                res.end(JSON.stringify({ ok: true, data: rows }));
              } else {
                const localUsers = getLocalUsers().map((u) => ({
                  id: u.id,
                  username: u.username,
                  email: u.email,
                  full_name: u.full_name,
                  role: u.role,
                  created_at: u.created_at,
                }));
                res.end(JSON.stringify({ ok: true, data: localUsers }));
              }
              return;
            }

            if (req.method === 'POST') {
              const { username, email, password, full_name, role } = body || {};
              if (!username || !password || !full_name) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: 'Data akun tidak lengkap.' }));
                return;
              }
              const id = body.id || `usr-${Date.now()}`;
              const hash = bcrypt.hashSync(password, 10);
              const userEmail = email || `${username}@jayawijaya.com`;
              const userRole = role === 'admin' ? 'admin' : (role === 'kasir' ? 'kasir' : 'operator');

              if (db) {
                await db.query(
                  'INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
                  [id, username, userEmail, hash, full_name, userRole]
                );
              }
              const localUsers = getLocalUsers();
              localUsers.push({
                id,
                username,
                email: userEmail,
                password_hash: hash,
                full_name,
                role: userRole,
                created_at: new Date().toISOString(),
              });
              saveLocalUsers(localUsers);

              res.end(JSON.stringify({ ok: true, data: { id, username, email: userEmail, full_name, role: userRole } }));
              return;
            }

            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              const { full_name, role, password } = body || {};
              if (db) {
                if (password) {
                  const hash = bcrypt.hashSync(password, 10);
                  await db.query('UPDATE users SET full_name = ?, role = ?, password_hash = ? WHERE id = ?', [full_name, role, hash, id]);
                } else {
                  await db.query('UPDATE users SET full_name = ?, role = ? WHERE id = ?', [full_name, role, id]);
                }
              }
              const localUsers = getLocalUsers();
              const idx = localUsers.findIndex((u) => u.id === id);
              if (idx !== -1) {
                if (full_name) localUsers[idx].full_name = full_name;
                if (role) localUsers[idx].role = role;
                if (password) localUsers[idx].password_hash = bcrypt.hashSync(password, 10);
                saveLocalUsers(localUsers);
              }
              res.end(JSON.stringify({ ok: true, message: 'Data pengguna diperbarui.' }));
              return;
            }

            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              if (session && session.user.id === id) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: 'Tidak dapat menghapus akun sendiri yang sedang aktif.' }));
                return;
              }
              if (db) {
                await db.query('DELETE FROM users WHERE id = ?', [id]);
              }
              const localUsers = getLocalUsers().filter((u) => u.id !== id);
              saveLocalUsers(localUsers);
              res.end(JSON.stringify({ ok: true, message: 'Akun berhasil dihapus.' }));
              return;
            }
          }

          // 7. Products
          if (pathname === '/products') {
            if (req.method === 'GET') {
              if (db) {
                const [rows] = await db.query('SELECT * FROM products ORDER BY name ASC');
                res.end(JSON.stringify({ data: rows, error: null }));
              } else {
                const store = getLocalStore();
                res.end(JSON.stringify({ data: store.products, error: null }));
              }
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `prod-${Date.now()}`;
              if (db) {
                await db.query(
                  'INSERT INTO products (id, name, sku, unit, purchase_price, selling_price) VALUES (?, ?, ?, ?, ?, ?)',
                  [id, body.name, body.sku || null, body.unit || 'pcs', body.purchase_price || 0, body.selling_price || 0]
                );
              }
              const store = getLocalStore();
              store.products.push({ id, ...body });
              saveLocalStore(store);
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              if (db) {
                await db.query(
                  'UPDATE products SET name = ?, sku = ?, unit = ?, purchase_price = ?, selling_price = ? WHERE id = ?',
                  [body.name, body.sku || null, body.unit || 'pcs', body.purchase_price || 0, body.selling_price || 0, id]
                );
              }
              const store = getLocalStore();
              const idx = store.products.findIndex((p) => p.id === id);
              if (idx !== -1) store.products[idx] = { ...store.products[idx], ...body, id };
              saveLocalStore(store);
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              if (db) {
                await db.query('DELETE FROM products WHERE id = ?', [id]);
              }
              const store = getLocalStore();
              store.products = store.products.filter((p) => p.id !== id);
              saveLocalStore(store);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          // 8. Inventory movements
          if (pathname === '/inventory') {
            if (req.method === 'GET') {
              if (db) {
                const [rows] = await db.query(`
                  SELECT m.*, p.name AS product_name, p.unit AS product_unit, p.purchase_price, p.selling_price
                  FROM inventory_movements m
                  LEFT JOIN products p ON m.product_id = p.id
                  ORDER BY m.occurred_on DESC, m.created_at DESC
                `);
                const formatted = rows.map((r) => ({
                  ...r,
                  products: { name: r.product_name, unit: r.product_unit, purchase_price: r.purchase_price, selling_price: r.selling_price }
                }));
                res.end(JSON.stringify({ data: formatted, error: null }));
              } else {
                const store = getLocalStore();
                const formatted = store.inventory.map((m) => {
                  const p = store.products.find((prod) => prod.id === m.product_id) || {};
                  return {
                    ...m,
                    products: { name: p.name || 'Produk', unit: p.unit || 'pcs', purchase_price: p.purchase_price || 0, selling_price: p.selling_price || 0 }
                  };
                });
                res.end(JSON.stringify({ data: formatted, error: null }));
              }
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `inv-${Date.now()}`;
              if (db) {
                await db.query(
                  'INSERT INTO inventory_movements (id, product_id, direction, quantity, occurred_on, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [id, body.product_id, body.direction, body.quantity, body.occurred_on, body.notes || '', body.created_by || 'usr-001']
                );
              }
              const store = getLocalStore();
              store.inventory.push({ id, ...body, created_at: new Date().toISOString() });
              saveLocalStore(store);
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              if (db) {
                await db.query('UPDATE inventory_movements SET notes = ? WHERE id = ?', [body.notes || '', id]);
              }
              const store = getLocalStore();
              const idx = store.inventory.findIndex((i) => i.id === id);
              if (idx !== -1) store.inventory[idx].notes = body.notes || '';
              saveLocalStore(store);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              if (db) {
                await db.query('DELETE FROM inventory_movements WHERE id = ?', [id]);
              }
              const store = getLocalStore();
              store.inventory = store.inventory.filter((i) => i.id !== id);
              saveLocalStore(store);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          // 9. Cash transactions
          if (pathname === '/cash') {
            if (req.method === 'GET') {
              if (db) {
                const [rows] = await db.query('SELECT * FROM cash_transactions ORDER BY occurred_on DESC, created_at DESC');
                res.end(JSON.stringify({ data: rows, error: null }));
              } else {
                const store = getLocalStore();
                res.end(JSON.stringify({ data: store.cash, error: null }));
              }
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `cash-${Date.now()}`;
              if (db) {
                await db.query(
                  'INSERT INTO cash_transactions (id, direction, amount, category, description, occurred_on, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [id, body.direction, body.amount, body.category, body.description || '', body.occurred_on, body.created_by || 'usr-001']
                );
              }
              const store = getLocalStore();
              store.cash.push({ id, ...body, created_at: new Date().toISOString() });
              saveLocalStore(store);
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              if (db) {
                await db.query('UPDATE cash_transactions SET description = ? WHERE id = ?', [body.description || '', id]);
              }
              const store = getLocalStore();
              const idx = store.cash.findIndex((c) => c.id === id);
              if (idx !== -1) store.cash[idx].description = body.description || '';
              saveLocalStore(store);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              if (db) {
                await db.query('DELETE FROM cash_transactions WHERE id = ?', [id]);
              }
              const store = getLocalStore();
              store.cash = store.cash.filter((c) => c.id !== id);
              saveLocalStore(store);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          // 10. Employees
          if (pathname === '/employees') {
            if (req.method === 'GET') {
              if (db) {
                const [rows] = await db.query('SELECT * FROM employees ORDER BY full_name ASC');
                res.end(JSON.stringify({ data: rows, error: null }));
              } else {
                const store = getLocalStore();
                res.end(JSON.stringify({ data: store.employees, error: null }));
              }
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `emp-${Date.now()}`;
              if (db) {
                await db.query(
                  'INSERT INTO employees (id, full_name, position, daily_salary, overtime_rate, incentive_per_unit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [id, body.full_name, body.position || 'Produksi', body.daily_salary || 0, body.overtime_rate || 0, body.incentive_per_unit || 0, body.is_active ? 1 : 0]
                );
              }
              const store = getLocalStore();
              store.employees.push({ id, ...body });
              saveLocalStore(store);
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              if (db) {
                await db.query(
                  'UPDATE employees SET full_name = ?, position = ?, daily_salary = ?, overtime_rate = ?, incentive_per_unit = ?, is_active = ? WHERE id = ?',
                  [body.full_name, body.position || 'Produksi', body.daily_salary || 0, body.overtime_rate || 0, body.incentive_per_unit || 0, body.is_active ? 1 : 0, id]
                );
              }
              const store = getLocalStore();
              const idx = store.employees.findIndex((e) => e.id === id);
              if (idx !== -1) store.employees[idx] = { ...store.employees[idx], ...body, id };
              saveLocalStore(store);
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
          }

          // 11. Payroll records
          if (pathname === '/payroll') {
            if (req.method === 'GET') {
              if (db) {
                const [rows] = await db.query(`
                  SELECT r.*, e.full_name, e.daily_salary, e.incentive_per_unit
                  FROM payroll_records r
                  LEFT JOIN employees e ON r.employee_id = e.id
                  ORDER BY r.work_date DESC, r.created_at DESC
                `);
                const formatted = rows.map((r) => ({
                  ...r,
                  employees: { full_name: r.full_name, daily_salary: r.daily_salary, incentive_per_unit: r.incentive_per_unit }
                }));
                res.end(JSON.stringify({ data: formatted, error: null }));
              } else {
                const store = getLocalStore();
                const formatted = store.payroll.map((r) => {
                  const e = store.employees.find((emp) => emp.id === r.employee_id) || {};
                  return {
                    ...r,
                    employees: { full_name: e.full_name || 'Karyawan', daily_salary: e.daily_salary || 0, incentive_per_unit: e.incentive_per_unit || 0 }
                  };
                });
                res.end(JSON.stringify({ data: formatted, error: null }));
              }
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `att-${Date.now()}`;
              if (db) {
                await db.query(
                  `INSERT INTO payroll_records (id, employee_id, work_date, period, attendance_status, daily_wage, overtime_hours, overtime_pay, base_salary, production_quantity, incentive_rate, incentive_amount, total_amount, status, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status), daily_wage = VALUES(daily_wage), overtime_hours = VALUES(overtime_hours), overtime_pay = VALUES(overtime_pay), base_salary = VALUES(base_salary), production_quantity = VALUES(production_quantity), incentive_rate = VALUES(incentive_rate), incentive_amount = VALUES(incentive_amount), total_amount = VALUES(total_amount), notes = VALUES(notes)`,
                  [id, body.employee_id, body.work_date, body.period || body.work_date, body.attendance_status || 'present', body.daily_wage || 0, body.overtime_hours || 0, body.overtime_pay || 0, body.base_salary || 0, body.production_quantity || 0, body.incentive_rate || 0, body.incentive_amount || 0, body.total_amount || 0, body.status || 'pending', body.notes || '']
                );
              }
              const store = getLocalStore();
              const existingIdx = store.payroll.findIndex((p) => p.employee_id === body.employee_id && p.work_date === body.work_date);
              if (existingIdx !== -1) {
                store.payroll[existingIdx] = { ...store.payroll[existingIdx], ...body, id: store.payroll[existingIdx].id };
              } else {
                store.payroll.push({ id, ...body, created_at: new Date().toISOString() });
              }
              saveLocalStore(store);
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              if (db) {
                await db.query(
                  `UPDATE payroll_records SET attendance_status = ?, daily_wage = ?, overtime_hours = ?, overtime_pay = ?, base_salary = ?, production_quantity = ?, incentive_rate = ?, incentive_amount = ?, total_amount = ?, notes = ? WHERE id = ?`,
                  [body.attendance_status, body.daily_wage || 0, body.overtime_hours || 0, body.overtime_pay || 0, body.base_salary || 0, body.production_quantity || 0, body.incentive_rate || 0, body.incentive_amount || 0, body.total_amount || 0, body.notes || '', id]
                );
              }
              const store = getLocalStore();
              const idx = store.payroll.findIndex((p) => p.id === id);
              if (idx !== -1) store.payroll[idx] = { ...store.payroll[idx], ...body, id };
              saveLocalStore(store);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              if (db) {
                await db.query('DELETE FROM payroll_records WHERE id = ?', [id]);
              }
              const store = getLocalStore();
              store.payroll = store.payroll.filter((p) => p.id !== id);
              saveLocalStore(store);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          // 12. Payroll payouts
          if (pathname === '/payouts') {
            if (req.method === 'GET') {
              if (db) {
                const [rows] = await db.query('SELECT * FROM payroll_payouts ORDER BY paid_at DESC');
                res.end(JSON.stringify({ data: rows, error: null }));
              } else {
                const store = getLocalStore();
                res.end(JSON.stringify({ data: store.payouts, error: null }));
              }
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `pay-${Date.now()}`;
              if (db) {
                await db.query(
                  `INSERT INTO payroll_payouts (id, employee_id, period, effective_days, present_days, half_days, overtime_hours, overtime_amount, base_amount, production_quantity, incentive_amount, total_amount, status, paid_at, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount), status = VALUES(status), paid_at = VALUES(paid_at)`,
                  [id, body.employee_id, body.period, body.effective_days || 0, body.present_days || 0, body.half_days || 0, body.overtime_hours || 0, body.overtime_amount || 0, body.base_amount || 0, body.production_quantity || 0, body.incentive_amount || 0, body.total_amount || 0, body.status || 'paid', body.paid_at || new Date(), body.notes || '']
                );
              }
              const store = getLocalStore();
              const existingIdx = store.payouts.findIndex((p) => p.employee_id === body.employee_id && p.period === body.period);
              if (existingIdx !== -1) {
                store.payouts[existingIdx] = { ...store.payouts[existingIdx], ...body, id: store.payouts[existingIdx].id };
              } else {
                store.payouts.push({ id, ...body, created_at: new Date().toISOString() });
              }
              saveLocalStore(store);
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              if (db) {
                await db.query('DELETE FROM payroll_payouts WHERE id = ?', [id]);
              }
              const store = getLocalStore();
              store.payouts = store.payouts.filter((p) => p.id !== id);
              saveLocalStore(store);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }));
        } catch (err) {
          console.error('[API Server Error]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [mysqlApiPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
