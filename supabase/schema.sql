-- ==============================================================================
-- SKRIP DATABASE RESMI: JAYA WIJAYA
-- Manufaktur, Distribusi & Grosir Alat Kebersihan Berbahan Kayu
-- Slogan: "Produksi Berkualitas, Harga Bersahabat, Mitra Terpercaya."
-- ==============================================================================
-- Petunjuk Eksekusi:
-- 1. Buka Supabase Dashboard project Anda (https://supabase.com/dashboard)
-- 2. Pilih menu "SQL Editor" di bilah sisi kiri
-- 3. Tempelkan seluruh kode ini lalu klik "Run" (Jalankan)
-- ==============================================================================

-- 1. FUNGSI CEK HAK AKSES ADMIN
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- 2. TABEL: PRODUK & BARANG JADI (products)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  unit text not null default 'pcs',
  purchase_price numeric(16, 2) not null default 0 check (purchase_price >= 0),
  selling_price numeric(16, 2) not null default 0 check (selling_price >= 0),
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists purchase_price numeric(16, 2) not null default 0;
alter table public.products add column if not exists selling_price numeric(16, 2) not null default 0;

create unique index if not exists products_name_unique
  on public.products (lower(name));

-- 3. TABEL: MUTASI STOK BARANG & GUDANG (inventory_movements)
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

-- 4. TABEL: ARUS KAS & BUKU KEUANGAN (cash_transactions)
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

-- 5. TABEL: MASTER DATA KARYAWAN & TENAGA KERJA (employees)
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  position text not null default 'Produksi',
  daily_salary numeric(16, 2) not null default 0 check (daily_salary >= 0),
  monthly_salary numeric(16, 2) not null default 0 check (monthly_salary >= 0),
  overtime_rate numeric(16, 2) not null default 0 check (overtime_rate >= 0),
  incentive_per_unit numeric(16, 2) not null default 0 check (incentive_per_unit >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.employees add column if not exists daily_salary numeric(16, 2) not null default 0 check (daily_salary >= 0);
alter table public.employees add column if not exists overtime_rate numeric(16, 2) not null default 0 check (overtime_rate >= 0);

-- 6. TABEL: LOG ABSENSI HARIAN & PRODUKTIVITAS KERJA (payroll_records)
create table if not exists public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  work_date date not null default current_date,
  period date not null default current_date,
  attendance_status text not null default 'present' check (attendance_status in ('present', 'half_day', 'permit', 'sick', 'absent')),
  daily_wage numeric(16, 2) not null default 0 check (daily_wage >= 0),
  overtime_hours numeric(6, 2) not null default 0 check (overtime_hours >= 0),
  overtime_pay numeric(16, 2) not null default 0 check (overtime_pay >= 0),
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
alter table public.payroll_records add column if not exists overtime_hours numeric(6, 2) default 0;
alter table public.payroll_records add column if not exists overtime_pay numeric(16, 2) default 0;
alter table public.payroll_records add column if not exists notes text default '';

create index if not exists payroll_records_date_idx
  on public.payroll_records (work_date desc);

-- 7. TABEL: REKAPITULASI PELUNASAN GAJI BULANAN (payroll_payouts)
create table if not exists public.payroll_payouts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  period text not null,
  effective_days numeric(6, 2) not null default 0,
  present_days int not null default 0,
  half_days int not null default 0,
  overtime_hours numeric(8, 2) not null default 0,
  overtime_amount numeric(18, 2) not null default 0,
  base_amount numeric(16, 2) not null default 0,
  production_quantity numeric(14, 2) not null default 0,
  incentive_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null default 0,
  status text not null default 'paid' check (status in ('pending', 'paid')),
  paid_at timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (employee_id, period)
);

create index if not exists payroll_payouts_period_idx
  on public.payroll_payouts (period desc);

-- 8. TRIGGER: PENCEGAHAN STOK MINUS (prevent_negative_stock)
create or replace function public.prevent_negative_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  available_stock numeric(14, 2);
begin
  -- Kunci baris produk untuk mencegah race condition mutasi paralel
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
    raise exception 'Stok tidak mencukupi untuk mutasi keluar. Sisa stok tersedia: %', available_stock;
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_movements_check_stock on public.inventory_movements;
create trigger inventory_movements_check_stock
  before insert on public.inventory_movements
  for each row execute function public.prevent_negative_stock();

-- 9. KEAMANAN AKSES DATA (ROW LEVEL SECURITY / RLS)
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.employees enable row level security;
alter table public.payroll_records enable row level security;
alter table public.payroll_payouts enable row level security;

-- Kebijakan Produk (Dapat dibaca & dikelola oleh pengguna terautentikasi)
drop policy if exists "Authenticated users can manage products" on public.products;
create policy "Authenticated users can manage products"
  on public.products for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Kebijakan Mutasi Stok (Dapat dicatat oleh seluruh staf gudang/operator)
drop policy if exists "Authenticated users can manage inventory" on public.inventory_movements;
create policy "Authenticated users can manage inventory"
  on public.inventory_movements for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Kebijakan Kas Operasional (Dapat dicatat oleh kasir/staf keuangan)
drop policy if exists "Authenticated users can manage cash transactions" on public.cash_transactions;
create policy "Authenticated users can manage cash transactions"
  on public.cash_transactions for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Kebijakan Karyawan & Penggajian (Hanya Admin yang dapat mengubah/menggaji)
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

drop policy if exists "Admins can manage payroll payouts" on public.payroll_payouts;
create policy "Admins can manage payroll payouts"
  on public.payroll_payouts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Izin schema public
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.products,
  public.inventory_movements,
  public.cash_transactions,
  public.employees,
  public.payroll_records,
  public.payroll_payouts
to authenticated;

-- 10. REALTIME SUBSCRIPTION MULTI-DEVICE
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
      'payroll_records',
      'payroll_payouts'
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

-- 11. DATA AWAL PRODUK ALAT KEBERSIHAN KAYU (SEED DATA RESMI)
insert into public.products (name, sku, unit, purchase_price, selling_price)
values
  ('Sapu Rayung Premium Gagang Kayu Mahoni', 'JW-SR-01', 'pcs', 11500, 18500),
  ('Sapu Ijuk Super Tebal Gagang Kayu Halus', 'JW-SI-02', 'pcs', 13500, 21500),
  ('Gagang Kayu Bubut Halus 120cm (Bahan Baku)', 'JW-GK-03', 'batang', 4000, 7000),
  ('Sapu Lidi Taman Gagang Kayu Panjang', 'JW-SL-04', 'pcs', 9000, 15000),
  ('Pel Strip Katun Gagang Kayu Kokoh', 'JW-PL-05', 'pcs', 16500, 26000),
  ('Pengki Serokan Sampah Gagang Kayu', 'JW-PK-06', 'pcs', 10500, 17000)
on conflict (lower(name)) do nothing;
