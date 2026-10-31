export const today = new Date();
export const localDate = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-');
export const currentMonth = localDate.slice(0, 7);

export const money = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const quantityFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export function formatMoney(value) {
  return money.format(Number(value) || 0);
}

export function formatQuantity(value) {
  return quantityFormat.format(Number(value) || 0);
}

export function formatDate(value) {
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

export function formatMonthLabel(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return monthStr || '—';
  try {
    const [y, m] = monthStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
  } catch (_) {
    return monthStr;
  }
}

export function monthStart(month) {
  return `${month}-01`;
}

export function monthEnd(month) {
  if (!month) return '';
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

export function monthRecords(records, month, field = 'occurred_on') {
  return (records || []).filter((record) => (record[field] || record.work_date || record.period)?.slice(0, 7) === month);
}

export const ATTENDANCE_LABELS = {
  present: { label: 'Hadir', class: 'status-present', rate: 1 },
  half_day: { label: '½ Hari', class: 'status-half_day', rate: 0.5 },
  permit: { label: 'Izin', class: 'status-permit', rate: 0 },
  sick: { label: 'Sakit', class: 'status-sick', rate: 0 },
  absent: { label: 'Alpa', class: 'status-absent', rate: 0 },
};

export function extractNotaId(str) {
  if (!str) return null;
  const m = String(str).match(/\[Nota\s*#?([A-Za-z0-9\-_]+)\]/i);
  return m ? m[1] : null;
}
