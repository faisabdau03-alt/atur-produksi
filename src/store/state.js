import { localDate, currentMonth, quantityFormat } from '../utils/formatters.js';
import { db } from '../api/db.js';
import { apiRequest } from '../api/client.js';

export { localDate, currentMonth, quantityFormat };

export const state = {
  user: null,
  isAdmin: false,
  isDemo: false,
  isMysql: true,
  mysqlAvailable: true,
  sidebarCollapsed: false,
  page: 'dashboard',
  selectedPayrollDate: localDate,
  selectedPayrollMonth: currentMonth,
  selectedReportMonth: currentMonth,
  selectedReportFilter: 'all',
  productsFilter: 'all',
  cashFilter: 'all',
  payrollStatusFilter: 'all',
  attendanceFilter: 'all',
  products: [],
  inventory: [],
  cash: [],
  employees: [],
  payroll: [],
  payouts: [],
  systemUsers: [],
};

export function userDisplayId(user = state.user) {
  if (!user) return '';
  return user.full_name || user.username || (user.email ? user.email.split('@')[0] : '') || 'Pengguna';
}

export function stockFor(productId) {
  return state.inventory.reduce((balance, movement) => {
    if (movement.product_id !== productId) return balance;
    return balance + (movement.direction === 'in' ? 1 : -1) * Number(movement.quantity);
  }, 0);
}

export function cashBalance(records = state.cash) {
  return records.reduce((balance, record) => (
    balance + (record.direction === 'in' ? 1 : -1) * Number(record.amount)
  ), 0);
}

export async function checkMysqlStatus() {
  try {
    const res = await apiRequest('/status', { method: 'GET' });
    if (res && res.ok && res.isConnected) {
      state.mysqlAvailable = true;
      return true;
    }
  } catch (_) {}
  state.mysqlAvailable = false;
  return false;
}

export async function refreshData() {
  const requests = [
    db.from('products').select('*').order('name'),
    db.from('inventory_movements').select('*, products(name, unit)').order('occurred_on', { ascending: false }),
    db.from('cash_transactions').select('*').order('occurred_on', { ascending: false }),
  ];
  if (state.isAdmin) {
    requests.push(
      db.from('employees').select('*').order('full_name'),
      db.from('payroll_records').select('*, employees(full_name, daily_salary, incentive_per_unit)').order('work_date', { ascending: false }),
      db.from('payroll_payouts').select('*').order('paid_at', { ascending: false }),
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
    try {
      const uRes = await apiRequest('/users', { method: 'GET' });
      if (uRes && uRes.ok) state.systemUsers = uRes.data || [];
    } catch (_) {}
  } else {
    state.employees = [];
    state.payroll = [];
    state.payouts = [];
    state.systemUsers = [];
  }
}
