-- =====================================================================
-- Migration 02 — Database hardening
-- Strengthens the existing schema before adding CMS tables in 03.
-- Adds: Postgres ENUMs, customers (contacts), booking_events,
-- generic audit_log + trigger, analytics_events (funnel),
-- soft delete on bookings, universal updated_at triggers, indexes,
-- constraints.
--
-- Run once in Supabase SQL editor. Idempotent (every statement uses
-- IF NOT EXISTS or DO blocks) — re-running is safe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Helper: updated_at trigger (already exists from 01_schema; safe
-- to re-declare).
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. ENUM types
-- We keep CHECK constraints on existing columns (less disruptive) and
-- ALSO create ENUM types for new tables (booking_events, blog_status,
-- payment_method on customers). Stricter typing where it costs nothing.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum
      ('pending','confirmed','in_progress','completed','cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum
      ('cash','upi','bank_transfer','card');
  end if;

  if not exists (select 1 from pg_type where typname = 'blog_status') then
    create type public.blog_status as enum ('draft','published');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_event_type') then
    create type public.booking_event_type as enum (
      'created',
      'confirmed',
      'rescheduled',
      'in_progress',
      'completed',
      'cancelled',
      'payment_received',
      'note_added'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'funnel_event_type') then
    create type public.funnel_event_type as enum (
      'site_visit',
      'service_viewed',
      'booking_started',
      'booking_step_completed',
      'booking_submitted',
      'booking_abandoned'
    );
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 2. customers — de-duped contact records (no login). Bookings will
-- gain a customer_id FK so the admin can see "this is the 3rd booking
-- by this phone".
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  -- Identity: phone is the natural key in India (most reliable).
  phone         text not null unique,
  name          text not null,
  email         text,
  -- Aggregates for the admin customers view (cheap to denormalise).
  total_bookings  integer not null default 0,
  total_revenue   bigint  not null default 0,   -- paise
  first_booking_at timestamptz,
  last_booking_at  timestamptz,
  -- Optional notes the admin keeps on the customer.
  admin_notes   text,
  -- Hook for "Accounts later" — when we add Supabase Auth, this links
  -- to auth.users.id. Nullable for now.
  user_id       uuid unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists customers_email_idx on public.customers (lower(email)) where email is not null;
create index if not exists customers_last_booking_idx on public.customers (last_booking_at desc nulls last);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. bookings: hardening
--   - customer_id FK to customers
--   - deleted_at for soft delete
--   - updated_at trigger (already set in 01_schema; idempotent)
--   - new indexes for status+date and customer_id
-- ---------------------------------------------------------------------
alter table public.bookings
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists deleted_at  timestamptz;

create index if not exists bookings_customer_id_idx on public.bookings (customer_id);
create index if not exists bookings_status_date_idx on public.bookings (status, booking_date)
  where deleted_at is null;
create index if not exists bookings_phone_idx       on public.bookings (customer_phone);

-- Restrict admin views to non-deleted by convention — RLS not changed
-- because we still want service-role / admin to see deleted rows for
-- recovery. Use `where deleted_at is null` in app queries.

-- Helper: upsert a customer when a booking is created, and roll up
-- the aggregates. App layer can call this from /api/bookings instead
-- if you prefer explicit control — keeping the trigger here makes it
-- foolproof.
create or replace function public.bookings_upsert_customer()
returns trigger
language plpgsql
as $$
declare
  v_customer_id uuid;
begin
  -- Only act on INSERT or when phone changes
  if (tg_op = 'INSERT') or (tg_op = 'UPDATE' and new.customer_phone <> old.customer_phone) then
    insert into public.customers (phone, name, email)
    values (new.customer_phone, new.customer_name, new.customer_email)
    on conflict (phone) do update
      set name  = excluded.name,
          email = coalesce(excluded.email, public.customers.email),
          updated_at = now()
    returning id into v_customer_id;

    new.customer_id := v_customer_id;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_upsert_customer_trg on public.bookings;
create trigger bookings_upsert_customer_trg
  before insert or update of customer_phone on public.bookings
  for each row execute function public.bookings_upsert_customer();

-- Recompute customer aggregates after any booking row movement.
create or replace function public.customers_recompute_aggregates()
returns trigger
language plpgsql
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := coalesce(new.customer_id, old.customer_id);
  if v_customer_id is null then
    return null;
  end if;

  update public.customers c
     set total_bookings   = sub.cnt,
         total_revenue    = sub.rev,
         first_booking_at = sub.first_at,
         last_booking_at  = sub.last_at,
         updated_at       = now()
    from (
      select count(*)                                     as cnt,
             coalesce(sum(final_price) filter (where final_price is not null), 0) as rev,
             min(created_at)                              as first_at,
             max(created_at)                              as last_at
        from public.bookings
       where customer_id = v_customer_id
         and deleted_at is null
    ) sub
   where c.id = v_customer_id;

  return null;
end;
$$;

drop trigger if exists bookings_recompute_customer_trg on public.bookings;
create trigger bookings_recompute_customer_trg
  after insert or update or delete on public.bookings
  for each row execute function public.customers_recompute_aggregates();

-- ---------------------------------------------------------------------
-- 4. booking_events — typed timeline of business events.
-- Emitted by triggers + by the app for events that have side payload
-- (e.g. note_added, payment_received with amount).
-- ---------------------------------------------------------------------
create table if not exists public.booking_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  event_type  public.booking_event_type not null,
  payload     jsonb not null default '{}'::jsonb,
  actor       text,                                  -- email / 'system' / 'customer'
  created_at  timestamptz not null default now()
);

create index if not exists booking_events_booking_id_idx
  on public.booking_events (booking_id, created_at desc);
create index if not exists booking_events_type_idx
  on public.booking_events (event_type, created_at desc);

-- Auto-emit events on status changes + reschedule + payment toggle.
create or replace function public.bookings_emit_events()
returns trigger
language plpgsql
as $$
declare
  v_actor text;
begin
  -- best-effort actor capture; falls back to 'system' for service-role writes
  begin
    v_actor := coalesce(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'email'),
      'system'
    );
  exception when others then
    v_actor := 'system';
  end;

  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, event_type, actor, payload)
    values (new.id, 'created', v_actor,
      jsonb_build_object(
        'service_id', new.service_id,
        'booking_date', new.booking_date,
        'booking_time', new.booking_time
      ));
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Status transitions
    if new.status is distinct from old.status then
      insert into public.booking_events (booking_id, event_type, actor, payload)
      values (new.id, new.status::public.booking_event_type, v_actor,
        jsonb_build_object('from', old.status, 'to', new.status));
    end if;

    -- Reschedule
    if (new.booking_date is distinct from old.booking_date)
       or (new.booking_time is distinct from old.booking_time) then
      insert into public.booking_events (booking_id, event_type, actor, payload)
      values (new.id, 'rescheduled', v_actor,
        jsonb_build_object(
          'from_date', old.booking_date, 'from_time', old.booking_time,
          'to_date',   new.booking_date, 'to_time',   new.booking_time
        ));
    end if;

    -- Payment received toggled on
    if new.payment_received = true and (old.payment_received is distinct from true) then
      insert into public.booking_events (booking_id, event_type, actor, payload)
      values (new.id, 'payment_received', v_actor,
        jsonb_build_object(
          'amount', new.final_price,
          'method', new.payment_method
        ));
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_emit_events_trg on public.bookings;
create trigger bookings_emit_events_trg
  after insert or update on public.bookings
  for each row execute function public.bookings_emit_events();

-- ---------------------------------------------------------------------
-- 5. audit_log — generic row-level audit for any tracked table.
-- Captures TG_OP, old/new row, actor, timestamp.
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigserial primary key,
  table_name  text not null,
  row_id      text not null,                         -- text so it works for any PK type
  op          text not null check (op in ('INSERT','UPDATE','DELETE')),
  old_row     jsonb,
  new_row     jsonb,
  actor       text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_table_row_idx
  on public.audit_log (table_name, row_id, created_at desc);
create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);

create or replace function public.audit_log_capture()
returns trigger
language plpgsql
as $$
declare
  v_actor text;
  v_id    text;
begin
  begin
    v_actor := coalesce(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'email'),
      'system'
    );
  exception when others then
    v_actor := 'system';
  end;

  if tg_op = 'DELETE' then
    v_id := old.id::text;
    insert into public.audit_log (table_name, row_id, op, old_row, actor)
    values (tg_table_name, v_id, tg_op, to_jsonb(old), v_actor);
    return old;
  end if;

  v_id := new.id::text;
  insert into public.audit_log (table_name, row_id, op, old_row, new_row, actor)
  values (tg_table_name, v_id, tg_op,
          case when tg_op = 'INSERT' then null else to_jsonb(old) end,
          to_jsonb(new),
          v_actor);
  return new;
end;
$$;

-- Attach audit to tables where changes matter most. (Migration 03 will
-- also attach the audit trigger to CMS tables.)
drop trigger if exists audit_bookings_trg              on public.bookings;
drop trigger if exists audit_services_trg              on public.services;
drop trigger if exists audit_availability_settings_trg on public.availability_settings;
drop trigger if exists audit_blocked_dates_trg         on public.blocked_dates;
drop trigger if exists audit_customers_trg             on public.customers;

create trigger audit_bookings_trg
  after insert or update or delete on public.bookings
  for each row execute function public.audit_log_capture();

create trigger audit_services_trg
  after insert or update or delete on public.services
  for each row execute function public.audit_log_capture();

create trigger audit_availability_settings_trg
  after insert or update or delete on public.availability_settings
  for each row execute function public.audit_log_capture();

create trigger audit_blocked_dates_trg
  after insert or update or delete on public.blocked_dates
  for each row execute function public.audit_log_capture();

create trigger audit_customers_trg
  after insert or update or delete on public.customers
  for each row execute function public.audit_log_capture();

-- ---------------------------------------------------------------------
-- 6. analytics_events — funnel events from the public site
-- ---------------------------------------------------------------------
create table if not exists public.analytics_events (
  id           bigserial primary key,
  event_type   public.funnel_event_type not null,
  session_id   text not null,                        -- anonymous browser-session UUID
  service_slug text,                                 -- for service_viewed / step events
  step         smallint,                             -- 1..5 for booking_step_completed
  -- Free-form payload (utm, referrer, viewport, etc.)
  payload      jsonb not null default '{}'::jsonb,
  -- Light request context (no PII)
  ua_summary   text,                                 -- e.g. "mobile-safari" — set server-side
  country      text,                                 -- ISO-2 if available
  created_at   timestamptz not null default now()
);

create index if not exists analytics_events_type_idx
  on public.analytics_events (event_type, created_at desc);
create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id, created_at);
create index if not exists analytics_events_service_idx
  on public.analytics_events (service_slug, created_at desc)
  where service_slug is not null;

-- ---------------------------------------------------------------------
-- 7. updated_at triggers on tables that don't have one yet.
-- bookings already has one (set in 01_schema). services / availability /
-- blocked don't track updated_at currently — adding the column +
-- trigger so audit_log can show "this row last changed when".
-- ---------------------------------------------------------------------
alter table public.services
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

alter table public.availability_settings
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists availability_settings_set_updated_at on public.availability_settings;
create trigger availability_settings_set_updated_at
  before update on public.availability_settings
  for each row execute function public.set_updated_at();

alter table public.blocked_dates
  add column if not exists created_at timestamptz not null default now();

-- ---------------------------------------------------------------------
-- 8. RLS — new tables
-- booking_events: admin-only (timeline shown in admin)
-- audit_log: admin-only
-- analytics_events: public INSERT (browser fires events), admin read
-- customers: admin-only
-- ---------------------------------------------------------------------
alter table public.customers          enable row level security;
alter table public.booking_events     enable row level security;
alter table public.audit_log          enable row level security;
alter table public.analytics_events   enable row level security;

drop policy if exists "customers admin"             on public.customers;
create policy "customers admin"
  on public.customers for all to authenticated using (true) with check (true);

drop policy if exists "booking_events read admin"   on public.booking_events;
create policy "booking_events read admin"
  on public.booking_events for select to authenticated using (true);

drop policy if exists "booking_events write admin"  on public.booking_events;
create policy "booking_events write admin"
  on public.booking_events for insert to authenticated with check (true);

drop policy if exists "audit_log read admin"        on public.audit_log;
create policy "audit_log read admin"
  on public.audit_log for select to authenticated using (true);

drop policy if exists "analytics_events insert pub" on public.analytics_events;
create policy "analytics_events insert pub"
  on public.analytics_events for insert with check (true);

drop policy if exists "analytics_events read admin" on public.analytics_events;
create policy "analytics_events read admin"
  on public.analytics_events for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 9. Backfill: link existing bookings to customers (if any rows exist
-- before this migration ran).
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  v_customer_id uuid;
begin
  for r in
    select id, customer_phone, customer_name, customer_email
      from public.bookings
     where customer_id is null
  loop
    insert into public.customers (phone, name, email)
    values (r.customer_phone, r.customer_name, r.customer_email)
    on conflict (phone) do update
      set name = excluded.name,
          email = coalesce(excluded.email, public.customers.email)
    returning id into v_customer_id;

    update public.bookings set customer_id = v_customer_id where id = r.id;
  end loop;
end$$;
