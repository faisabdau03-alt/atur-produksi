import { defineConfig } from 'vite';
import mysql from 'mysql2/promise';

function mysqlApiPlugin() {
  let pool = null;

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
      });
    }
    return pool;
  }

  return {
    name: 'mysql-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

          const db = await getPool();

          // 1. Status Connection Check
          if (pathname === '/status' && req.method === 'GET') {
            await db.query('SELECT 1');
            const [pCount] = await db.query('SELECT COUNT(*) as total FROM products');
            res.end(JSON.stringify({
              ok: true,
              database: 'jaya_wijaya',
              type: 'mysql',
              productsCount: pCount[0]?.total || 0,
              message: 'Terhubung ke MySQL XAMPP (jaya_wijaya)'
            }));
            return;
          }

          // 2. Products
          if (pathname === '/products') {
            if (req.method === 'GET') {
              const [rows] = await db.query('SELECT * FROM products ORDER BY name ASC');
              res.end(JSON.stringify({ data: rows, error: null }));
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `prod-${Date.now()}`;
              await db.query(
                'INSERT INTO products (id, name, sku, unit, purchase_price, selling_price) VALUES (?, ?, ?, ?, ?, ?)',
                [id, body.name, body.sku || null, body.unit || 'pcs', body.purchase_price || 0, body.selling_price || 0]
              );
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              await db.query(
                'UPDATE products SET name = ?, sku = ?, unit = ?, purchase_price = ?, selling_price = ? WHERE id = ?',
                [body.name, body.sku || null, body.unit || 'pcs', body.purchase_price || 0, body.selling_price || 0, id]
              );
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              await db.query('DELETE FROM products WHERE id = ?', [id]);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          // 3. Inventory movements
          if (pathname === '/inventory') {
            if (req.method === 'GET') {
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
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `inv-${Date.now()}`;
              await db.query(
                'INSERT INTO inventory_movements (id, product_id, direction, quantity, occurred_on, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, body.product_id, body.direction, body.quantity, body.occurred_on, body.notes || '', body.created_by || 'usr-001']
              );
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              await db.query('UPDATE inventory_movements SET notes = ? WHERE id = ?', [body.notes || '', id]);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              await db.query('DELETE FROM inventory_movements WHERE id = ?', [id]);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          // 4. Cash transactions
          if (pathname === '/cash') {
            if (req.method === 'GET') {
              const [rows] = await db.query('SELECT * FROM cash_transactions ORDER BY occurred_on DESC, created_at DESC');
              res.end(JSON.stringify({ data: rows, error: null }));
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `cash-${Date.now()}`;
              await db.query(
                'INSERT INTO cash_transactions (id, direction, amount, category, description, occurred_on, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, body.direction, body.amount, body.category, body.description || '', body.occurred_on, body.created_by || 'usr-001']
              );
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              await db.query('UPDATE cash_transactions SET description = ? WHERE id = ?', [body.description || '', id]);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              await db.query('DELETE FROM cash_transactions WHERE id = ?', [id]);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          // 5. Employees
          if (pathname === '/employees') {
            if (req.method === 'GET') {
              const [rows] = await db.query('SELECT * FROM employees ORDER BY full_name ASC');
              res.end(JSON.stringify({ data: rows, error: null }));
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `emp-${Date.now()}`;
              await db.query(
                'INSERT INTO employees (id, full_name, position, daily_salary, overtime_rate, incentive_per_unit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, body.full_name, body.position || 'Produksi', body.daily_salary || 0, body.overtime_rate || 0, body.incentive_per_unit || 0, body.is_active ? 1 : 0]
              );
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              await db.query(
                'UPDATE employees SET full_name = ?, position = ?, daily_salary = ?, overtime_rate = ?, incentive_per_unit = ?, is_active = ? WHERE id = ?',
                [body.full_name, body.position || 'Produksi', body.daily_salary || 0, body.overtime_rate || 0, body.incentive_per_unit || 0, body.is_active ? 1 : 0, id]
              );
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
          }

          // 6. Payroll records
          if (pathname === '/payroll') {
            if (req.method === 'GET') {
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
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `att-${Date.now()}`;
              await db.query(
                `INSERT INTO payroll_records (id, employee_id, work_date, period, attendance_status, daily_wage, overtime_hours, overtime_pay, base_salary, production_quantity, incentive_rate, incentive_amount, total_amount, status, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status), daily_wage = VALUES(daily_wage), overtime_hours = VALUES(overtime_hours), overtime_pay = VALUES(overtime_pay), base_salary = VALUES(base_salary), production_quantity = VALUES(production_quantity), incentive_rate = VALUES(incentive_rate), incentive_amount = VALUES(incentive_amount), total_amount = VALUES(total_amount), notes = VALUES(notes)`,
                [id, body.employee_id, body.work_date, body.period || body.work_date, body.attendance_status || 'present', body.daily_wage || 0, body.overtime_hours || 0, body.overtime_pay || 0, body.base_salary || 0, body.production_quantity || 0, body.incentive_rate || 0, body.incentive_amount || 0, body.total_amount || 0, body.status || 'pending', body.notes || '']
              );
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'PUT') {
              const id = url.searchParams.get('id') || body.id;
              await db.query(
                `UPDATE payroll_records SET attendance_status = ?, daily_wage = ?, overtime_hours = ?, overtime_pay = ?, base_salary = ?, production_quantity = ?, incentive_rate = ?, incentive_amount = ?, total_amount = ?, notes = ? WHERE id = ?`,
                [body.attendance_status, body.daily_wage || 0, body.overtime_hours || 0, body.overtime_pay || 0, body.base_salary || 0, body.production_quantity || 0, body.incentive_rate || 0, body.incentive_amount || 0, body.total_amount || 0, body.notes || '', id]
              );
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              await db.query('DELETE FROM payroll_records WHERE id = ?', [id]);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          // 7. Payroll payouts
          if (pathname === '/payouts') {
            if (req.method === 'GET') {
              const [rows] = await db.query('SELECT * FROM payroll_payouts ORDER BY paid_at DESC');
              res.end(JSON.stringify({ data: rows, error: null }));
              return;
            }
            if (req.method === 'POST') {
              const id = body.id || `pay-${Date.now()}`;
              await db.query(
                `INSERT INTO payroll_payouts (id, employee_id, period, effective_days, present_days, half_days, overtime_hours, overtime_amount, base_amount, production_quantity, incentive_amount, total_amount, status, paid_at, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount), status = VALUES(status), paid_at = VALUES(paid_at)`,
                [id, body.employee_id, body.period, body.effective_days || 0, body.present_days || 0, body.half_days || 0, body.overtime_hours || 0, body.overtime_amount || 0, body.base_amount || 0, body.production_quantity || 0, body.incentive_amount || 0, body.total_amount || 0, body.status || 'paid', body.paid_at || new Date(), body.notes || '']
              );
              res.end(JSON.stringify({ data: { id, ...body }, error: null }));
              return;
            }
            if (req.method === 'DELETE') {
              const id = url.searchParams.get('id') || body?.id;
              await db.query('DELETE FROM payroll_payouts WHERE id = ?', [id]);
              res.end(JSON.stringify({ ok: true, error: null }));
              return;
            }
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }));
        } catch (err) {
          console.error('[MySQL API Error]', err);
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

