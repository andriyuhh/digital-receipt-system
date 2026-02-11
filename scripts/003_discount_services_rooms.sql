-- =============================================================
-- HOSTech Coworking Space - Discount Codes, Service Types, 
-- Room Bookings, and Staff Soft Delete
-- =============================================================

-- ===================== DISCOUNT CODES TABLE =====================
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  max_usage int,
  usage_count int not null default 0,
  is_active boolean not null default true,
  expires_at timestamp with time zone,
  created_by uuid not null,
  created_by_name text not null,
  created_at timestamp with time zone default now()
);

-- ===================== SERVICE CONFIGURATIONS =====================
-- Admin-configurable pricing for meeting rooms, conference rooms, printing
create table if not exists public.service_config (
  id uuid primary key default gen_random_uuid(),
  config_key text unique not null,
  config_value jsonb not null,
  updated_by uuid,
  updated_at timestamp with time zone default now()
);

-- Insert default service configurations
insert into public.service_config (config_key, config_value) values
  ('meeting_room_price_per_hour', '{"price": 300}'::jsonb),
  ('conference_room_price_per_hour', '{"price": 300}'::jsonb),
  ('printing_bw_extra_page_price', '{"price": 2}'::jsonb)
on conflict (config_key) do nothing;

-- ===================== ROOM BOOKINGS TABLE =====================
create table if not exists public.room_bookings (
  id uuid primary key default gen_random_uuid(),
  room_type text not null check (room_type in ('Meeting Room', 'Conference Room')),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  booked_by uuid not null,
  booked_by_name text not null,
  receipt_id uuid references public.receipts(id),
  customer_name text not null,
  status text not null default 'Active' check (status in ('Active', 'Cancelled')),
  created_at timestamp with time zone default now()
);

-- ===================== MODIFY STAFF TABLE (soft delete) =====================
-- Add deleted_status column for soft delete
alter table public.staff add column if not exists deleted_status text check (deleted_status in ('Active', 'Suspended', 'Deleted'));

-- Set default for existing rows
update public.staff set deleted_status = case when is_active then 'Active' else 'Suspended' end where deleted_status is null;

-- ===================== MODIFY RECEIPTS TABLE =====================
-- Add discount and service type fields to receipts
alter table public.receipts add column if not exists service_type text;
alter table public.receipts add column if not exists service_details jsonb;
alter table public.receipts add column if not exists discount_code text;
alter table public.receipts add column if not exists discount_amount numeric(12, 2) default 0;
alter table public.receipts add column if not exists original_amount numeric(12, 2);
alter table public.receipts add column if not exists receipt_items jsonb;

-- ===================== RLS FOR NEW TABLES =====================
alter table public.discount_codes enable row level security;
alter table public.service_config enable row level security;
alter table public.room_bookings enable row level security;

-- Discount codes policies
drop policy if exists "discount_codes_select_all" on public.discount_codes;
create policy "discount_codes_select_all" on public.discount_codes for select to authenticated using (true);

drop policy if exists "discount_codes_insert_admin" on public.discount_codes;
create policy "discount_codes_insert_admin" on public.discount_codes for insert to authenticated with check (true);

drop policy if exists "discount_codes_update_admin" on public.discount_codes;
create policy "discount_codes_update_admin" on public.discount_codes for update to authenticated using (true);

drop policy if exists "discount_codes_delete_admin" on public.discount_codes;
create policy "discount_codes_delete_admin" on public.discount_codes for delete to authenticated using (true);

-- Service config policies
drop policy if exists "service_config_select_all" on public.service_config;
create policy "service_config_select_all" on public.service_config for select to authenticated using (true);

drop policy if exists "service_config_update_admin" on public.service_config;
create policy "service_config_update_admin" on public.service_config for update to authenticated using (true);

drop policy if exists "service_config_insert_admin" on public.service_config;
create policy "service_config_insert_admin" on public.service_config for insert to authenticated with check (true);

-- Room bookings policies
drop policy if exists "room_bookings_select_all" on public.room_bookings;
create policy "room_bookings_select_all" on public.room_bookings for select to authenticated using (true);

drop policy if exists "room_bookings_insert_auth" on public.room_bookings;
create policy "room_bookings_insert_auth" on public.room_bookings for insert to authenticated with check (true);

drop policy if exists "room_bookings_update_auth" on public.room_bookings;
create policy "room_bookings_update_auth" on public.room_bookings for update to authenticated using (true);

-- ===================== INDEXES =====================
create index if not exists idx_discount_codes_code on public.discount_codes(code);
create index if not exists idx_discount_codes_active on public.discount_codes(is_active);
create index if not exists idx_room_bookings_date on public.room_bookings(booking_date);
create index if not exists idx_room_bookings_room_type on public.room_bookings(room_type);
create index if not exists idx_receipts_service_type on public.receipts(service_type);
create index if not exists idx_receipts_discount_code on public.receipts(discount_code);
