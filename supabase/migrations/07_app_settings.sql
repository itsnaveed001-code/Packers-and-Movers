-- =====================================================================
-- 07_app_settings.sql — Generic key/value store for runtime-tunable
-- knobs that the admin can edit without a redeploy. First user: the
-- booking deposit amount (was hardcoded in lib/paymentsPolicy.ts).
--
-- Idempotent: safe to re-run. Purely additive.
-- =====================================================================

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Reuse the shared timestamp trigger from 02_db_hardening.sql.
drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Seed the deposit amount. Stored in paise to avoid float math anywhere.
-- ₹299 matches the previous hardcoded default.
insert into public.app_settings (key, value)
values ('deposit_amount_paise', '29900'::jsonb)
on conflict (key) do nothing;

-- RLS: service-role only, same pattern as email_otps / payment_orders.
-- The admin API routes use the service-role client and bypass RLS.
alter table public.app_settings enable row level security;
