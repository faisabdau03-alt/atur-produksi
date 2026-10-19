-- Jalankan skrip ini di Supabase Dashboard > SQL Editor.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  unit text not null default 'pcs',
  purchase_price numeric(16, 2) not null default 0,
  selling_price numeric(16, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists purchase_price numeric(16, 2) not null default 0;
alter table public.products add column if not exists selling_price numeric(16, 2) not null default 0;

create unique index if not exists products_name_unique
  on public.products (lower(name));

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  direction text not null check (direction in ('in', 'out')),
  quantity numeric(14, 2) not null check (quantity > 0),
  occurred_on date not null default current_date,
  notes text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_date_idx
  on public.inventory_movements (product_id, occurred_on desc);

create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(16, 2) not null check (amount > 0),
  category text not null,
  description text not null default '',
  occurred_on date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists cash_transactions_date_idx
  on public.cash_transactions (occurred_on desc);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  position text not null default 'Produksi',
  daily_salary numeric(16, 2) not null default 0 check (daily_salary >= 0),
  monthly_salary numeric(16, 2) not null default 0 check (monthly_salary >= 0),
  incentive_per_unit numeric(16, 2) not null default 0 check (incentive_per_unit >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.employees add column if not exists daily_salary numeric(16, 2) not null default 0 check (daily_salary >= 0);

create table if not exists public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  work_date date not null default current_date,
  period date not null default current_date,
  attendance_status text not null default 'present' check (attendance_status in ('present', 'half_day', 'permit', 'sick', 'absent')),
  daily_wage numeric(16, 2) not null default 0 check (daily_wage >= 0),
  base_salary numeric(16, 2) not null default 0 check (base_salary >= 0),
  production_quantity numeric(14, 2) not null default 0 check (production_quantity >= 0),
  incentive_rate numeric(16, 2) not null default 0 check (incentive_rate >= 0),
  incentive_amount numeric(18, 2) not null default 0 check (incentive_amount >= 0),
  total_amount numeric(18, 2) not null default 0 check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

alter table public.payroll_records drop constraint if exists payroll_records_period_check;
alter table public.payroll_records add column if not exists work_date date default current_date;
alter table public.payroll_records add column if not exists attendance_status text default 'present';
alter table public.payroll_records add column if not exists daily_wage numeric(16, 2) default 0;
alter table public.payroll_records add column if not exists notes text default '';

create index if not exists payroll_records_date_idx
  on public.payroll_records (work_date desc);

create or replace function public.prevent_negative_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  available_stock numeric(14, 2);
begin
  perform 1
  from public.products
  where id = new.product_id
  for update;

  select coalesce(sum(
    case when direction = 'in' then quantity else -quantity end
  ), 0)
  into available_stock
  from public.inventory_movements
  where product_id = new.product_id;

  if new.direction = 'out' and new.quantity > available_stock then
    raise exception 'Stok tidak mencukupi. Stok tersedia: %', available_stock;
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_movements_check_stock on public.inventory_movements;
create trigger inventory_movements_check_stock
  before insert on public.inventory_movements
  for each row execute function public.prevent_negative_stock();

alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.employees enable row level security;
alter table public.payroll_records enable row level security;

drop policy if exists "Authenticated users can manage products" on public.products;
create policy "Authenticated users can manage products"
  on public.products for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can manage inventory" on public.inventory_movements;
create policy "Authenticated users can manage inventory"
  on public.inventory_movements for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can manage cash transactions" on public.cash_transactions;
create policy "Authenticated users can manage cash transactions"
  on public.cash_transactions for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Admins can manage employees" on public.employees;
create policy "Admins can manage employees"
  on public.employees for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage payroll" on public.payroll_records;
create policy "Admins can manage payroll"
  on public.payroll_records for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.products,
  public.inventory_movements,
  public.cash_transactions,
  public.employees,
  public.payroll_records
to authenticated;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'products',
      'inventory_movements',
      'cash_transactions',
      'employees',
      'payroll_records'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;
