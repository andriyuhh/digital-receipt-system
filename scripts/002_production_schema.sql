-- =============================================================
-- HOSTech Coworking Space Receipt System - Production Schema
-- Run this on a FRESH Supabase project for deployment.
-- If tables already exist from development, this is safe (IF NOT EXISTS).
-- =============================================================

-- ===================== STAFF TABLE =====================
create table if not exists public.staff (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('Cashier', 'Supervisor', 'Admin')),
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  disabled_at timestamp with time zone,
  disabled_by uuid references auth.users(id),
  rules_acknowledged boolean not null default false,
  created_at timestamp with time zone default now()
);

-- ===================== RECEIPT COUNTER =====================
create table if not exists public.receipt_counter (
  id int primary key default 1 check (id = 1),
  current_year int not null default 2026,
  current_number int not null default 0
);

insert into public.receipt_counter (id, current_year, current_number)
values (1, 2026, 0)
on conflict (id) do nothing;

-- ===================== RECEIPTS TABLE =====================
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text unique not null,
  customer_name text not null,
  customer_id text,
  service_description text not null,
  amount numeric(12, 2) not null,
  payment_method text not null check (payment_method in ('Cash', 'Card', 'Bank Transfer', 'Mobile Payment')),
  issuer_id uuid not null,
  issuer_name text not null,
  issuer_role text not null,
  internal_notes text,
  customer_email text,
  customer_phone text,
  qr_signature text,
  status text not null default 'Draft' check (status in ('Draft', 'Issued', 'Printed', 'Emailed', 'Verified', 'Cancelled', 'Synced')),
  is_locked boolean not null default false,
  issued_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- ===================== AUDIT LOG =====================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid references public.receipts(id),
  action text not null,
  old_status text,
  new_status text,
  performed_by uuid not null,
  performed_by_name text not null,
  performed_by_role text not null,
  reason text,
  created_at timestamp with time zone default now()
);

-- ===================== VERIFICATION LOG =====================
create table if not exists public.verification_log (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now()
);

-- ===================== RLS =====================
alter table public.staff enable row level security;
alter table public.receipts enable row level security;
alter table public.audit_log enable row level security;
alter table public.receipt_counter enable row level security;
alter table public.verification_log enable row level security;

-- Staff policies
drop policy if exists "staff_select_all" on public.staff;
create policy "staff_select_all" on public.staff for select to authenticated using (true);

drop policy if exists "staff_insert_admin" on public.staff;
create policy "staff_insert_admin" on public.staff for insert to authenticated with check (true);

drop policy if exists "staff_update_admin" on public.staff;
create policy "staff_update_admin" on public.staff for update to authenticated using (true);

-- Receipt policies
drop policy if exists "receipts_select_all" on public.receipts;
create policy "receipts_select_all" on public.receipts for select to authenticated using (true);

drop policy if exists "receipts_insert_authenticated" on public.receipts;
create policy "receipts_insert_authenticated" on public.receipts for insert to authenticated with check (true);

drop policy if exists "receipts_update_authenticated" on public.receipts;
create policy "receipts_update_authenticated" on public.receipts for update to authenticated using (true);

-- Public read for verification (anon users can look up receipts via QR)
drop policy if exists "receipts_public_verify" on public.receipts;
create policy "receipts_public_verify" on public.receipts for select to anon using (true);

-- Receipt counter policies
drop policy if exists "counter_select_all" on public.receipt_counter;
create policy "counter_select_all" on public.receipt_counter for select to authenticated using (true);

drop policy if exists "counter_update_authenticated" on public.receipt_counter;
create policy "counter_update_authenticated" on public.receipt_counter for update to authenticated using (true);

-- Audit log policies
drop policy if exists "audit_select_all" on public.audit_log;
create policy "audit_select_all" on public.audit_log for select to authenticated using (true);

drop policy if exists "audit_insert_authenticated" on public.audit_log;
create policy "audit_insert_authenticated" on public.audit_log for insert to authenticated with check (true);

-- Verification log policies (service role inserts, no auth needed for insert)
drop policy if exists "verification_log_insert_anon" on public.verification_log;
create policy "verification_log_insert_anon" on public.verification_log for insert to anon with check (true);

drop policy if exists "verification_log_select_auth" on public.verification_log;
create policy "verification_log_select_auth" on public.verification_log for select to authenticated using (true);

-- ===================== INDEXES =====================
create index if not exists idx_receipts_receipt_number on public.receipts(receipt_number);
create index if not exists idx_receipts_issued_at on public.receipts(issued_at);
create index if not exists idx_receipts_issuer_id on public.receipts(issuer_id);
create index if not exists idx_receipts_status on public.receipts(status);
create index if not exists idx_audit_log_receipt_id on public.audit_log(receipt_id);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at);
create index if not exists idx_verification_log_receipt_number on public.verification_log(receipt_number);
