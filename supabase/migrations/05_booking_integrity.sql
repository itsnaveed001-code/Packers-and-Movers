-- =====================================================================
-- 05_booking_integrity.sql — Email OTP verification, self-service
-- cancellation, and custom-move bookings.
--
-- Idempotent: safe to run multiple times. Purely additive — no data is
-- dropped or rewritten.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. email_otps — server-side OTP store. Codes are stored as a salted
--    SHA-256 hash (lib/otp.ts); the raw code never touches the DB.
-- ---------------------------------------------------------------------
create table if not exists public.email_otps (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  purpose     text not null default 'booking'
    check (purpose in ('booking','cancel','manage')),
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz null,
  ip          text null,
  created_at  timestamptz not null default now()
);

create index if not exists email_otps_email_purpose_created_idx
  on public.email_otps (email, purpose, created_at desc);

-- Used by the per-IP send rate limit.
create index if not exists email_otps_ip_created_idx
  on public.email_otps (ip, created_at desc);

-- RLS: no public or authenticated access — all OTP reads/writes happen
-- server-side through the service-role client, which bypasses RLS.
-- Enabling RLS with zero policies locks the table for everyone else.
alter table public.email_otps enable row level security;

-- ---------------------------------------------------------------------
-- 2. bookings — additive columns for verification + cancellation +
--    custom-move resource selections.
-- ---------------------------------------------------------------------
alter table public.bookings
  add column if not exists email_verified   boolean not null default false,
  add column if not exists cancelled_at     timestamptz null,
  add column if not exists cancel_reason    text null,
  add column if not exists custom_resources jsonb null;

-- bookings.status: base schema uses a text CHECK that already includes
-- 'cancelled'. Defensive: if a check constraint exists WITHOUT
-- 'cancelled' (older deployments), rebuild it additively.
do $$
declare
  v_def text;
begin
  select pg_get_constraintdef(c.oid) into v_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'bookings'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%status%';

  if v_def is not null and v_def not like '%cancelled%' then
    alter table public.bookings drop constraint if exists bookings_status_check;
    alter table public.bookings add constraint bookings_status_check
      check (status in ('pending','confirmed','in_progress','completed','cancelled'));
  end if;
end $$;

-- If booking_status enum exists (02_db_hardening) and somehow lacks
-- 'cancelled', add it additively.
do $$
begin
  if exists (select 1 from pg_type where typname = 'booking_status')
     and not exists (
       select 1 from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       where t.typname = 'booking_status' and e.enumlabel = 'cancelled'
     )
  then
    alter type public.booking_status add value 'cancelled';
  end if;
end $$;

-- Helps the soft-cap count (active bookings per email).
create index if not exists bookings_email_status_idx
  on public.bookings (customer_email, status);

-- ---------------------------------------------------------------------
-- 3. services.is_custom + the "Custom move" service row.
-- ---------------------------------------------------------------------
alter table public.services
  add column if not exists is_custom boolean not null default false;

insert into public.services
  (name, slug, description, short_description, base_price, duration_hours,
   icon_name, display_order, is_active, coming_soon, is_custom)
values
  ('Custom move',
   'custom',
   'Build your own move: choose how many movers you need, pick a vehicle, and tell us roughly how long the job should take. You get an instant indicative price and our team confirms the final quote on call.',
   'Pick your own crew, vehicle and hours — instant indicative price.',
   null,
   4,
   'route',
   90,
   true,
   false,
   true)
on conflict (slug) do nothing;

-- Ensure the flag is set even if the row pre-existed.
update public.services set is_custom = true where slug = 'custom' and is_custom = false;
