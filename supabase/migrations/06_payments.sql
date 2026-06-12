-- =====================================================================
-- 06_payments.sql — Razorpay booking deposit: payment columns on
-- bookings + the payment_orders staging table.
--
-- Idempotent: safe to run multiple times. Purely additive — no data is
-- dropped or rewritten.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. bookings — deposit/payment columns. payment_status is null for
--    bookings made without an online deposit (pre-feature rows and the
--    env-vars-missing fallback mode).
-- ---------------------------------------------------------------------
alter table public.bookings
  add column if not exists deposit_amount_inr  integer null,
  add column if not exists razorpay_order_id   text null,
  add column if not exists razorpay_payment_id text null,
  add column if not exists payment_status      text null,
  add column if not exists refund_id           text null,
  add column if not exists refunded_at         timestamptz null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_payment_status_check'
  ) then
    alter table public.bookings add constraint bookings_payment_status_check
      check (
        payment_status is null
        or payment_status in ('pending','paid','failed','refunded','refund_failed')
      );
  end if;
end $$;

-- Exactly one booking per Razorpay order. This is the idempotency guard
-- for the checkout-verify vs. webhook race: whichever inserts second
-- hits 23505 and reuses the existing booking.
create unique index if not exists bookings_razorpay_order_id_key
  on public.bookings (razorpay_order_id)
  where razorpay_order_id is not null;

-- refund.processed webhooks look bookings up by payment id.
create index if not exists bookings_razorpay_payment_id_idx
  on public.bookings (razorpay_payment_id)
  where razorpay_payment_id is not null;

-- ---------------------------------------------------------------------
-- 2. payment_orders — the validated booking payload parked between
--    "Razorpay order created" and "payment captured". The webhook can
--    create the booking from this row even when the browser checkout
--    callback never arrives (tab closed, network drop).
-- ---------------------------------------------------------------------
create table if not exists public.payment_orders (
  id                  uuid primary key default gen_random_uuid(),
  razorpay_order_id   text not null unique,
  amount_paise        integer not null,
  currency            text not null default 'INR',
  status              text not null default 'created'
    check (status in ('created','paid','failed')),
  customer_email      text not null,
  -- Server-validated booking payload (lib/bookingServer.ts shape), ready
  -- to insert once payment is confirmed. Email ownership was proven by
  -- OTP before the order was created.
  booking_payload     jsonb not null,
  booking_id          uuid null references public.bookings(id) on delete set null,
  razorpay_payment_id text null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists payment_orders_email_created_idx
  on public.payment_orders (customer_email, created_at desc);

drop trigger if exists payment_orders_set_updated_at on public.payment_orders;
create trigger payment_orders_set_updated_at
  before update on public.payment_orders
  for each row execute function public.set_updated_at();

-- RLS: no public or authenticated access — all reads/writes happen
-- server-side through the service-role client, which bypasses RLS.
-- Enabling RLS with zero policies locks the table for everyone else
-- (same pattern as email_otps in 05_booking_integrity).
alter table public.payment_orders enable row level security;
