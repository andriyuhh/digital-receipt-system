-- Create staff table for user management
create table if not exists public.staff (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('Cashier', 'Supervisor', 'Admin')),
  staff_id text unique not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create receipt counter table for sequential numbering
create table if not exists public.receipt_counter (
  id int primary key default 1 check (id = 1),
  current_year int not null default 2026,
  current_number int not null default 0
);

-- Initialize counter
insert into public.receipt_counter (id, current_year, current_number) 
values (1, 2026, 0)
on conflict (id) do nothing;

-- Create receipts table
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text unique not null,
  customer_name text not null,
  customer_contact text,
  amount numeric(12, 2) not null,
  amount_in_words text not null,
  description text not null,
  payment_mode text not null check (payment_mode in ('Cash', 'Cheque', 'Mobile Money', 'Others')),
  received_amount numeric(12, 2) not null default 0,
  due_payment numeric(12, 2) not null default 0,
  unpaid_amount numeric(12, 2) not null default 0,
  internal_notes text,
  status text not null default 'Valid' check (status in ('Valid', 'Cancelled', 'Refunded')),
  issuer_id uuid not null references public.staff(id),
  issued_at timestamp with time zone default now(),
  locked boolean not null default true,
  created_at timestamp with time zone default now()
);

-- Create audit log table
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id),
  action text not null check (action in ('Created', 'Cancelled', 'Refunded')),
  performed_by uuid not null references public.staff(id),
  reason text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.staff enable row level security;
alter table public.receipts enable row level security;
alter table public.audit_log enable row level security;
alter table public.receipt_counter enable row level security;

-- Staff policies
create policy "staff_select_all" on public.staff for select to authenticated using (true);
create policy "staff_insert_own" on public.staff for insert to authenticated with check (auth.uid() = id);
create policy "staff_update_own" on public.staff for update to authenticated using (auth.uid() = id);

-- Receipt policies
create policy "receipts_select_all" on public.receipts for select to authenticated using (true);
create policy "receipts_insert_authenticated" on public.receipts for insert to authenticated with check (true);
create policy "receipts_update_supervisor" on public.receipts for update to authenticated using (
  exists (
    select 1 from public.staff 
    where staff.id = auth.uid() 
    and staff.role in ('Supervisor', 'Admin')
  )
);

-- Receipt counter policies
create policy "counter_select_all" on public.receipt_counter for select to authenticated using (true);
create policy "counter_update_authenticated" on public.receipt_counter for update to authenticated using (true);

-- Audit log policies
create policy "audit_select_all" on public.audit_log for select to authenticated using (true);
create policy "audit_insert_authenticated" on public.audit_log for insert to authenticated with check (true);

-- Public read policy for receipt verification (no auth required)
create policy "receipts_public_verify" on public.receipts for select to anon using (true);
