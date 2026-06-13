-- =====================================================================
-- 08_invoices.sql — Per-booking invoices the admin sends after the
-- move. Customer pays via a tokenised public link backed by Razorpay,
-- or the admin marks the invoice "cash received" for offline payment.
--
-- Idempotent: safe to re-run. Purely additive — no data is dropped.
-- =====================================================================

-- ---------------------------------------------------------------------
-- invoices — one row per invoice. Today each booking gets at most one
-- non-draft invoice (enforced by the partial unique index below); the
-- 'draft' status is reserved for a future "save without sending" flow.
-- ---------------------------------------------------------------------
create table if not exists public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  -- Authoritative amount, in paise. Computed server-side from
  -- line_items at creation time; the client never supplies it.
  amount_paise        integer not null check (amount_paise >= 0),
  -- [{ description: text, amount_inr: int }, ...]
  -- amount_inr is the per-line rupee value the admin typed; the total
  -- in `amount_paise` is the source of truth for charging.
  line_items          jsonb not null default '[]'::jsonb,
  notes               text null,
  status              text not null default 'sent'
    check (status in ('draft','sent','paid','cash_received')),
  -- Public payment-page token. crypto.randomBytes(32).toString('hex')
  -- → 64 hex chars. Indexed unique so /invoice/[token] is a single-row
  -- lookup and unguessable.
  payment_token       text not null unique,
  razorpay_order_id   text null,
  razorpay_payment_id text null,
  sent_at             timestamptz null,
  paid_at             timestamptz null,
  received_at         timestamptz null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Admin booking-detail loads the invoice by booking_id.
create index if not exists invoices_booking_id_idx
  on public.invoices (booking_id);

-- Webhook lookups when payment.captured arrives for an invoice.
create unique index if not exists invoices_razorpay_order_id_key
  on public.invoices (razorpay_order_id)
  where razorpay_order_id is not null;

-- One non-draft invoice per booking — "Resend" updates the existing
-- row; a new send_invoice call on a booking with an active invoice
-- returns the existing one rather than creating a duplicate.
create unique index if not exists invoices_one_per_booking
  on public.invoices (booking_id)
  where status in ('sent','paid','cash_received');

-- Reuse the shared timestamp trigger from 02_db_hardening.sql.
drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- RLS: service-role only. All reads/writes happen through admin or
-- public API routes that fetch by token / id and never expose the table.
alter table public.invoices enable row level security;
