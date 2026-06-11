-- =====================================================================
-- Migration 03 — CMS tables (depends on 02_db_hardening.sql for the
-- audit trigger function and updated_at trigger).
-- Run once in Supabase SQL editor. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. services.coming_soon (replaces COMING_SOON_SERVICES constant)
-- ---------------------------------------------------------------------
alter table public.services
  add column if not exists coming_soon boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. site_settings (singleton)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  id                       uuid primary key default gen_random_uuid(),
  company_name             text not null default 'EasyShiftX',
  tagline                  text not null default 'Stress-free packing and moving in Bengaluru',
  logo_url                 text,
  phone                    text not null default '+91 78927 73770',
  whatsapp                 text not null default '917892773770',
  email                    text not null default 'easyshiftx.2415@gmail.com',
  address                  text not null default 'Bengaluru, Karnataka, India',
  footer_text              text,
  business_hours           jsonb not null default
    '{"weekday":"9:00 AM – 7:00 PM","sunday":"Closed"}'::jsonb,
  social_links             jsonb not null default '{}'::jsonb,
  -- map_mode: how the Contact page renders location
  map_mode                 text not null default 'arealist'
    check (map_mode in ('embed','arealist')),
  map_query                text,
  map_lat                  numeric(9,6),
  map_lng                  numeric(9,6),
  google_rating            numeric(2,1) check (google_rating between 0 and 5),
  google_reviews_url       text,
  insurance_badge_url      text,
  stat_moves_completed     text,
  stat_years_service       text,
  singleton                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint site_settings_singleton unique (singleton)
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. service_areas
-- ---------------------------------------------------------------------
create table if not exists public.service_areas (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists service_areas_active_order_idx
  on public.service_areas (is_active, display_order);

-- ---------------------------------------------------------------------
-- 4. content_blocks (singleton per page+key)
-- ---------------------------------------------------------------------
create table if not exists public.content_blocks (
  id          uuid primary key default gen_random_uuid(),
  page        text not null,
  key         text not null,
  value       jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (page, key)
);

drop trigger if exists content_blocks_set_updated_at on public.content_blocks;
create trigger content_blocks_set_updated_at
  before update on public.content_blocks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. home_features
-- ---------------------------------------------------------------------
create table if not exists public.home_features (
  id            uuid primary key default gen_random_uuid(),
  section       text not null
    check (section in ('why_choose','how_it_works','example_card')),
  title         text not null,
  body          text,
  icon          text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists home_features_section_order_idx
  on public.home_features (section, display_order)
  where is_active = true;

drop trigger if exists home_features_set_updated_at on public.home_features;
create trigger home_features_set_updated_at
  before update on public.home_features
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6. about_values
-- ---------------------------------------------------------------------
create table if not exists public.about_values (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  icon          text not null default 'badge-check',
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists about_values_active_order_idx
  on public.about_values (is_active, display_order);

drop trigger if exists about_values_set_updated_at on public.about_values;
create trigger about_values_set_updated_at
  before update on public.about_values
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. testimonials
-- ---------------------------------------------------------------------
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  city          text,
  quote         text not null,
  rating        integer check (rating between 1 and 5),
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists testimonials_active_order_idx
  on public.testimonials (is_active, display_order);

drop trigger if exists testimonials_set_updated_at on public.testimonials;
create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. faqs
-- ---------------------------------------------------------------------
create table if not exists public.faqs (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid references public.services(id) on delete cascade,
  question      text not null,
  answer        text not null,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists faqs_service_order_idx
  on public.faqs (service_id, display_order)
  where is_active = true;

drop trigger if exists faqs_set_updated_at on public.faqs;
create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 9. service_includes
-- ---------------------------------------------------------------------
create table if not exists public.service_includes (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references public.services(id) on delete cascade,
  item          text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists service_includes_service_order_idx
  on public.service_includes (service_id, display_order);

-- ---------------------------------------------------------------------
-- 10. pricing_tiers
-- ---------------------------------------------------------------------
create table if not exists public.pricing_tiers (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references public.services(id) on delete cascade,
  label         text not null,
  sublabel      text,
  price         integer not null check (price >= 0),  -- paise
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pricing_tiers_service_order_idx
  on public.pricing_tiers (service_id, display_order);

drop trigger if exists pricing_tiers_set_updated_at on public.pricing_tiers;
create trigger pricing_tiers_set_updated_at
  before update on public.pricing_tiers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 11. contact_submissions (admin inbox; replaces fire-and-forget email)
-- ---------------------------------------------------------------------
create table if not exists public.contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists contact_submissions_unread_idx
  on public.contact_submissions (created_at desc)
  where is_read = false;
create index if not exists contact_submissions_created_idx
  on public.contact_submissions (created_at desc);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.site_settings        enable row level security;
alter table public.service_areas        enable row level security;
alter table public.content_blocks       enable row level security;
alter table public.home_features        enable row level security;
alter table public.about_values         enable row level security;
alter table public.testimonials         enable row level security;
alter table public.faqs                 enable row level security;
alter table public.service_includes     enable row level security;
alter table public.pricing_tiers        enable row level security;
alter table public.contact_submissions  enable row level security;

drop policy if exists "site_settings read"             on public.site_settings;
create policy "site_settings read" on public.site_settings for select using (true);
drop policy if exists "site_settings write admin"      on public.site_settings;
create policy "site_settings write admin" on public.site_settings for all to authenticated using (true) with check (true);

drop policy if exists "service_areas read active"      on public.service_areas;
create policy "service_areas read active" on public.service_areas for select using (is_active = true);
drop policy if exists "service_areas read all admin"   on public.service_areas;
create policy "service_areas read all admin" on public.service_areas for select to authenticated using (true);
drop policy if exists "service_areas write admin"      on public.service_areas;
create policy "service_areas write admin" on public.service_areas for all to authenticated using (true) with check (true);

drop policy if exists "content_blocks read"            on public.content_blocks;
create policy "content_blocks read" on public.content_blocks for select using (true);
drop policy if exists "content_blocks write admin"     on public.content_blocks;
create policy "content_blocks write admin" on public.content_blocks for all to authenticated using (true) with check (true);

drop policy if exists "home_features read active"      on public.home_features;
create policy "home_features read active" on public.home_features for select using (is_active = true);
drop policy if exists "home_features write admin"      on public.home_features;
create policy "home_features write admin" on public.home_features for all to authenticated using (true) with check (true);

drop policy if exists "about_values read active"       on public.about_values;
create policy "about_values read active" on public.about_values for select using (is_active = true);
drop policy if exists "about_values write admin"       on public.about_values;
create policy "about_values write admin" on public.about_values for all to authenticated using (true) with check (true);

drop policy if exists "testimonials read active"       on public.testimonials;
create policy "testimonials read active" on public.testimonials for select using (is_active = true);
drop policy if exists "testimonials write admin"       on public.testimonials;
create policy "testimonials write admin" on public.testimonials for all to authenticated using (true) with check (true);

drop policy if exists "faqs read active"               on public.faqs;
create policy "faqs read active" on public.faqs for select using (is_active = true);
drop policy if exists "faqs write admin"               on public.faqs;
create policy "faqs write admin" on public.faqs for all to authenticated using (true) with check (true);

drop policy if exists "service_includes read"          on public.service_includes;
create policy "service_includes read" on public.service_includes for select using (true);
drop policy if exists "service_includes write admin"   on public.service_includes;
create policy "service_includes write admin" on public.service_includes for all to authenticated using (true) with check (true);

drop policy if exists "pricing_tiers read"             on public.pricing_tiers;
create policy "pricing_tiers read" on public.pricing_tiers for select using (true);
drop policy if exists "pricing_tiers write admin"      on public.pricing_tiers;
create policy "pricing_tiers write admin" on public.pricing_tiers for all to authenticated using (true) with check (true);

drop policy if exists "contact_submissions insert pub" on public.contact_submissions;
create policy "contact_submissions insert pub"
  on public.contact_submissions for insert with check (true);
drop policy if exists "contact_submissions read admin" on public.contact_submissions;
create policy "contact_submissions read admin"
  on public.contact_submissions for select to authenticated using (true);
drop policy if exists "contact_submissions update admin" on public.contact_submissions;
create policy "contact_submissions update admin"
  on public.contact_submissions for update to authenticated using (true) with check (true);
drop policy if exists "contact_submissions delete admin" on public.contact_submissions;
create policy "contact_submissions delete admin"
  on public.contact_submissions for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- Audit triggers on CMS tables (from migration 02's audit_log_capture)
-- ---------------------------------------------------------------------
drop trigger if exists audit_site_settings_trg    on public.site_settings;
create trigger audit_site_settings_trg
  after insert or update or delete on public.site_settings
  for each row execute function public.audit_log_capture();

drop trigger if exists audit_pricing_tiers_trg    on public.pricing_tiers;
create trigger audit_pricing_tiers_trg
  after insert or update or delete on public.pricing_tiers
  for each row execute function public.audit_log_capture();

drop trigger if exists audit_content_blocks_trg   on public.content_blocks;
create trigger audit_content_blocks_trg
  after insert or update or delete on public.content_blocks
  for each row execute function public.audit_log_capture();

drop trigger if exists audit_faqs_trg             on public.faqs;
create trigger audit_faqs_trg
  after insert or update or delete on public.faqs
  for each row execute function public.audit_log_capture();
