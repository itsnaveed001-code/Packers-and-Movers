-- =====================================================================
-- Migration 01 — add payment tracking to bookings
-- Run once in Supabase SQL editor. Idempotent: re-running is safe.
-- =====================================================================

alter table public.bookings
  add column if not exists final_price      integer,           -- paise; null = not yet recorded
  add column if not exists payment_received boolean not null default false,
  add column if not exists paid_at          timestamptz,
  add column if not exists payment_method   text;

-- Helpful index for the revenue dashboard's most common query:
--   bookings where status = 'completed' and updated_at between :from and :to
create index if not exists bookings_completed_updated_idx
  on public.bookings (updated_at desc)
  where status = 'completed';
