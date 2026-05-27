-- =====================================================================
-- Packers Go Movers — full database schema
-- Run this in Supabase SQL editor (Project → SQL → New query) once.
-- Idempotent on a fresh project. Re-running on an existing project that
-- already has these tables will error — drop them first if rebuilding.
-- =====================================================================

-- Extensions ----------------------------------------------------------
create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- Helper: updated_at trigger -----------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- services
-- =====================================================================
create table public.services (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  description       text not null,
  short_description text not null,
  base_price        integer,                              -- paise; null = custom quote
  duration_hours    integer not null default 4,
  icon_name         text not null default 'truck',
  display_order     integer not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index services_active_order_idx
  on public.services (is_active, display_order);

-- =====================================================================
-- availability_settings (single row)
-- =====================================================================
create table public.availability_settings (
  id                                uuid primary key default gen_random_uuid(),
  working_days                      integer[] not null default '{1,2,3,4,5,6}',
  working_hours_start               time not null default '09:00',
  working_hours_end                 time not null default '19:00',
  slot_duration_minutes             integer not null default 60,
  max_concurrent_bookings_per_slot  integer not null default 1,
  advance_booking_days              integer not null default 60,
  minimum_notice_hours              integer not null default 24,
  singleton                         boolean not null default true,
  constraint availability_settings_singleton unique (singleton)
);

-- =====================================================================
-- blocked_dates
-- =====================================================================
create table public.blocked_dates (
  id     uuid primary key default gen_random_uuid(),
  date   date not null unique,
  reason text
);

create index blocked_dates_date_idx on public.blocked_dates (date);

-- =====================================================================
-- bookings
-- =====================================================================
create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  reference_code  text not null unique,
  service_id      uuid not null references public.services(id) on delete restrict,
  booking_date    date not null,
  booking_time    time not null,
  duration_hours  integer not null,
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text not null,
  pickup_address  text not null,
  pickup_city     text not null,
  pickup_pincode  text not null,
  dropoff_address text not null,
  dropoff_city    text not null,
  dropoff_pincode text not null,
  notes           text,
  status          text not null default 'pending'
    check (status in ('pending','confirmed','in_progress','completed','cancelled')),
  admin_notes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index bookings_date_idx          on public.bookings (booking_date);
create index bookings_status_idx        on public.bookings (status);
create index bookings_reference_idx     on public.bookings (reference_code);
create index bookings_date_time_idx     on public.bookings (booking_date, booking_time);
create index bookings_created_at_idx    on public.bookings (created_at desc);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.services              enable row level security;
alter table public.availability_settings enable row level security;
alter table public.blocked_dates         enable row level security;
alter table public.bookings              enable row level security;

-- services: anyone can read active services; only authenticated users (admins) write.
create policy "services read active"
  on public.services for select
  using (is_active = true);

create policy "services read all for admin"
  on public.services for select
  to authenticated
  using (true);

create policy "services write admin"
  on public.services for insert
  to authenticated
  with check (true);

create policy "services update admin"
  on public.services for update
  to authenticated
  using (true)
  with check (true);

create policy "services delete admin"
  on public.services for delete
  to authenticated
  using (true);

-- availability_settings: anyone can read; only admins modify.
create policy "availability read"
  on public.availability_settings for select
  using (true);

create policy "availability write admin"
  on public.availability_settings for insert
  to authenticated
  with check (true);

create policy "availability update admin"
  on public.availability_settings for update
  to authenticated
  using (true)
  with check (true);

create policy "availability delete admin"
  on public.availability_settings for delete
  to authenticated
  using (true);

-- blocked_dates: anyone can read; only admins modify.
create policy "blocked read"
  on public.blocked_dates for select
  using (true);

create policy "blocked write admin"
  on public.blocked_dates for insert
  to authenticated
  with check (true);

create policy "blocked update admin"
  on public.blocked_dates for update
  to authenticated
  using (true)
  with check (true);

create policy "blocked delete admin"
  on public.blocked_dates for delete
  to authenticated
  using (true);

-- bookings: ONLY admins can read/update/delete. Inserts happen via the
-- service-role key (API route), which bypasses RLS — so we do NOT need
-- a public insert policy. Leaving it bypass-only is more secure.
create policy "bookings read admin"
  on public.bookings for select
  to authenticated
  using (true);

create policy "bookings update admin"
  on public.bookings for update
  to authenticated
  using (true)
  with check (true);

create policy "bookings delete admin"
  on public.bookings for delete
  to authenticated
  using (true);
