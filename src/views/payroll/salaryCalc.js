import { state as appState } from '../../store/state.js';

export function calculateMonthlySalary(employee, month, state = appState) {
  const currentState = state || appState;
  const records = (currentState?.payroll || []).filter(
    (r) => r.employee_id === employee.id && (r.work_date || r.period)?.slice(0, 7) === month
  );
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

  const payout = (currentState?.payouts || []).find((p) => p.employee_id === employee.id && p.period === month);

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
