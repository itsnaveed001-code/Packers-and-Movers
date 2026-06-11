-- =====================================================================
-- Migration 03 (seed) — Populate CMS tables with the values that are
-- currently hardcoded in lib/constants.ts and the marketing components.
-- After this runs, the public site reads from the DB and the seeded
-- content is pixel-identical to what shipped before this migration.
--
-- Run AFTER 03_cms.sql. Safe to re-run (uses on conflict do nothing).
-- =====================================================================

-- ---------------------------------------------------------------------
-- site_settings singleton — from lib/constants.ts BUSINESS / HOURS
-- ---------------------------------------------------------------------
insert into public.site_settings (
  company_name, tagline, phone, whatsapp, email, address,
  business_hours, social_links, map_mode, map_query, footer_text,
  singleton
)
values (
  'EasyShiftX',
  'Stress-free packing and moving in Bengaluru',
  '+91 78927 73770',
  '917892773770',
  'easyshiftx.2415@gmail.com',
  'Bengaluru, Karnataka, India',
  '{"weekday":"9:00 AM – 7:00 PM","sunday":"Closed"}'::jsonb,
  '{}'::jsonb,
  'arealist',
  'Bengaluru, Karnataka, India',
  null,
  true
)
on conflict (singleton) do nothing;

-- ---------------------------------------------------------------------
-- service_areas — from SERVICE_AREAS constant (order preserved)
-- ---------------------------------------------------------------------
insert into public.service_areas (name, display_order, is_active) values
  ('Koramangala',         10, true),
  ('Indiranagar',         20, true),
  ('HSR Layout',          30, true),
  ('BTM Layout',          40, true),
  ('Jayanagar',           50, true),
  ('JP Nagar',            60, true),
  ('Whitefield',          70, true),
  ('Marathahalli',        80, true),
  ('Bellandur',           90, true),
  ('Sarjapur Road',      100, true),
  ('Electronic City',    110, true),
  ('Bannerghatta Road',  120, true),
  ('Banashankari',       130, true),
  ('Rajajinagar',        140, true),
  ('Malleshwaram',       150, true),
  ('Hebbal',             160, true),
  ('Yelahanka',          170, true),
  ('KR Puram',           180, true),
  ('Mahadevapura',       190, true),
  ('Hennur',             200, true)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- coming-soon flag on services — from COMING_SOON_SERVICES constant
-- (assumes 01_schema seed has already inserted services rows; this just
-- toggles the new column.)
-- ---------------------------------------------------------------------
update public.services set coming_soon = true
 where slug in ('vehicle-transport','intercity-moves','storage');

-- ---------------------------------------------------------------------
-- content_blocks — singleton copy per page+key
-- (Captures the strings the components currently render.)
-- ---------------------------------------------------------------------
insert into public.content_blocks (page, key, value) values
  ('home', 'hero_pill',       '"Now serving all of Bengaluru"'::jsonb),
  ('home', 'hero_heading',    '"Trusted Packers and Movers in Bengaluru"'::jsonb),
  ('home', 'hero_subheading', '"Stress-free packing and moving in Bengaluru. Insured, on-time relocations with transparent pricing — book your slot online in under a minute."'::jsonb),
  ('home', 'why_choose_title',    '"Why customers choose us"'::jsonb),
  ('home', 'why_choose_subtitle', '"Four things we never compromise on."'::jsonb),
  ('about','heading_h1',     '"About EasyShiftX"'::jsonb),
  ('about','intro',          '"EasyShiftX is a packers and movers service based in Bengaluru, helping families and businesses relocate with less stress. We focus on careful handling, honest pricing, and showing up when we say we will."'::jsonb),
  ('about','story_heading',  '"Our story"'::jsonb),
  ('about','story_para_1',   '"We started EasyShiftX with a simple belief: moving shouldn''t be chaotic. We''re building a moving service that Bengaluru can rely on — one careful, on-time move at a time."'::jsonb),
  ('about','story_para_2',   '"Every move is handled by a trained, background-checked crew and tracked from start to finish. No surprises, no hidden charges."'::jsonb),
  ('contact','intro',        '"Have a question about your move? Send us a note — we''ll get back within a few hours during business hours."'::jsonb)
on conflict (page, key) do nothing;

-- ---------------------------------------------------------------------
-- home_features — section='why_choose' (replaces WhyChooseUs PILLARS)
-- ---------------------------------------------------------------------
insert into public.home_features (section, title, body, icon, display_order, is_active) values
  ('why_choose','Verified team',       'Trained crew, background-checked, identified with company IDs on site.', 'badge-check', 10, true),
  ('why_choose','Insured moves',       'Transit insurance available on every booking. We cover what we move.', 'shield',      20, true),
  ('why_choose','On-time delivery',    'We commit to the slot you book. If we run late, we tell you up front.','clock',       30, true),
  ('why_choose','Transparent pricing', 'Detailed estimate up front. No surprise charges on delivery day.',      'wallet',      40, true)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- home_features — section='how_it_works' (replaces HowItWorks steps)
-- ---------------------------------------------------------------------
insert into public.home_features (section, title, body, icon, display_order, is_active) values
  ('how_it_works','Tell us about your move',  'Pick a service, share dates and addresses. Takes under a minute.',                    'list-checks',   10, true),
  ('how_it_works','Get a clear estimate',     'We confirm scope on a quick call and lock in transparent pricing.',                  'message-square',20, true),
  ('how_it_works','We arrive and pack',       'Trained crew shows up in your booked slot with all packing materials.',              'truck',         30, true),
  ('how_it_works','Move and settle in',       'We transport, unload, and unpack so you can settle into your new place.',            'home',          40, true)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- home_features — section='example_card' (the "Today's bookings"
-- sample data shown in the Hero card)
-- ---------------------------------------------------------------------
insert into public.home_features (section, title, body, icon, display_order, is_active) values
  ('example_card','Home Shifting',    'Koramangala → Whitefield · 10:00 AM',   'home',     10, true),
  ('example_card','Office Shifting',  'Indiranagar → HSR Layout · 12:00 PM',   'building', 20, true),
  ('example_card','2 BHK Shifting',   'Jayanagar → Marathahalli · 3:00 PM',    'home',     30, true)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- about_values — from about/page.tsx VALUES
-- ---------------------------------------------------------------------
insert into public.about_values (title, body, icon, display_order, is_active) values
  ('Careful handling','Trained, background-checked crew who pack and move your things like their own.', 'badge-check', 10, true),
  ('Honest pricing',  'A clear estimate up front. No hidden charges added on the day of the move.',     'wallet',      20, true),
  ('On time',         'We show up in the slot you book — and keep you posted if anything changes.',     'clock',       30, true),
  ('Insured moves',   'Transit cover available on every booking, so your move is protected.',          'shield',      40, true)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- testimonials — from TESTIMONIALS constant
-- ---------------------------------------------------------------------
insert into public.testimonials (name, city, quote, rating, display_order, is_active) values
  ('Priya S.',  'Koramangala',
    'The team showed up on time, packed everything carefully, and nothing was damaged. Felt like a real, dependable service.',
    5, 10, true),
  ('Rahul N.',  'Whitefield',
    'Booked online, got a call within an hour, and the move went exactly as quoted. Transparent pricing — no surprises.',
    5, 20, true),
  ('Ananya R.', 'Indiranagar',
    'Office shifting was completed in a single day with zero downtime. Professional and friendly crew throughout.',
    5, 30, true)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- service_includes — from INCLUDED_BY_SLUG in services/[slug]/page.tsx
-- ---------------------------------------------------------------------
do $$
declare
  v_home    uuid; v_office uuid; v_vehicle uuid;
  v_local   uuid; v_inter  uuid; v_storage uuid;
begin
  select id into v_home    from public.services where slug = 'home-shifting'    limit 1;
  select id into v_office  from public.services where slug = 'office-shifting'  limit 1;
  select id into v_vehicle from public.services where slug = 'vehicle-transport' limit 1;
  select id into v_local   from public.services where slug = 'local-moves'       limit 1;
  select id into v_inter   from public.services where slug = 'intercity-moves'   limit 1;
  select id into v_storage from public.services where slug = 'storage'           limit 1;

  if v_home is not null then
    insert into public.service_includes (service_id, item, display_order)
    select v_home, item, display_order from (values
      ('Careful packing of every room with quality materials', 10),
      ('Dismantling and reassembly of furniture',              20),
      ('Loading, transit and unloading',                       30),
      ('Unpacking and setup at destination',                   40),
      ('Transit insurance available',                          50)
    ) as t(item, display_order)
    where not exists (
      select 1 from public.service_includes
      where service_id = v_home and item = t.item
    );
  end if;

  if v_office is not null then
    insert into public.service_includes (service_id, item, display_order)
    select v_office, item, display_order from (values
      ('Site survey and move plan in advance',  10),
      ('IT equipment handling',                 20),
      ('Weekend or after-hours slots',          30),
      ('Structured unpacking at destination',   40),
      ('Workstation reassembly',                50)
    ) as t(item, display_order)
    where not exists (
      select 1 from public.service_includes
      where service_id = v_office and item = t.item
    );
  end if;

  if v_vehicle is not null then
    insert into public.service_includes (service_id, item, display_order)
    select v_vehicle, item, display_order from (values
      ('Bike or car pickup from your address',  10),
      ('Enclosed or open carrier options',      20),
      ('GPS tracking through transit',          30),
      ('Insured against transit damage',        40),
      ('Door-to-door delivery',                 50)
    ) as t(item, display_order)
    where not exists (
      select 1 from public.service_includes
      where service_id = v_vehicle and item = t.item
    );
  end if;

  if v_local is not null then
    insert into public.service_includes (service_id, item, display_order)
    select v_local, item, display_order from (values
      ('Same-day slots available',                          10),
      ('Right-sized vehicles (tempo or mini-truck)',        20),
      ('Packing materials included',                        30),
      ('Helpers for loading/unloading',                     40)
    ) as t(item, display_order)
    where not exists (
      select 1 from public.service_includes
      where service_id = v_local and item = t.item
    );
  end if;

  if v_inter is not null then
    insert into public.service_includes (service_id, item, display_order)
    select v_inter, item, display_order from (values
      ('Dedicated truck — no co-loading', 10),
      ('Scheduled delivery window',       20),
      ('Full transit insurance',          30),
      ('Real-time updates en route',      40)
    ) as t(item, display_order)
    where not exists (
      select 1 from public.service_includes
      where service_id = v_inter and item = t.item
    );
  end if;

  if v_storage is not null then
    insert into public.service_includes (service_id, item, display_order)
    select v_storage, item, display_order from (values
      ('Clean, climate-stable facility',         10),
      ('CCTV monitored, 24/7 security',          20),
      ('Short and long-term options',            30),
      ('Easy pickup and drop scheduling',        40)
    ) as t(item, display_order)
    where not exists (
      select 1 from public.service_includes
      where service_id = v_storage and item = t.item
    );
  end if;
end$$;

-- ---------------------------------------------------------------------
-- pricing_tiers — from HOUSE_SHIFTING_TIERS constant (home-shifting)
-- Prices stored in paise (× 100).
-- ---------------------------------------------------------------------
do $$
declare
  v_home uuid;
begin
  select id into v_home from public.services where slug = 'home-shifting' limit 1;
  if v_home is null then return; end if;

  insert into public.pricing_tiers (service_id, label, sublabel, price, display_order)
  select v_home, label, sublabel, price, display_order from (values
    ('1 RK / Few items', 'Studio or a handful of items',  249900,  10),
    ('1 BHK',            'Compact home, 1 bedroom',       499900,  20),
    ('2 BHK',            'Most common family move',       799900,  30),
    ('3 BHK',            'Larger home, more furniture',  1299900,  40),
    ('4 BHK / Villa',    'Big home or villa',            1899900,  50)
  ) as t(label, sublabel, price, display_order)
  where not exists (
    select 1 from public.pricing_tiers
    where service_id = v_home and label = t.label
  );
end$$;

-- ---------------------------------------------------------------------
-- faqs — from FAQS_BY_SLUG in services/[slug]/page.tsx
-- ---------------------------------------------------------------------
do $$
declare
  v_home    uuid; v_office uuid; v_vehicle uuid;
  v_local   uuid; v_inter  uuid; v_storage uuid;
begin
  select id into v_home    from public.services where slug = 'home-shifting'    limit 1;
  select id into v_office  from public.services where slug = 'office-shifting'  limit 1;
  select id into v_vehicle from public.services where slug = 'vehicle-transport' limit 1;
  select id into v_local   from public.services where slug = 'local-moves'       limit 1;
  select id into v_inter   from public.services where slug = 'intercity-moves'   limit 1;
  select id into v_storage from public.services where slug = 'storage'           limit 1;

  if v_home is not null then
    insert into public.faqs (service_id, question, answer, display_order, is_active)
    select v_home, q, a, ord, true from (values
      ('How long does a home move take?',
       'A typical 2BHK takes 6–8 hours end-to-end for a local move. Larger homes and intercity moves take longer; we share a detailed estimate after a quick chat.', 10),
      ('Do you provide packing materials?',
       'Yes — boxes, bubble wrap, stretch film, and tape are included in every home move.', 20),
      ('What about my fragile items?',
       'We use double-walled boxes, custom crating for art and glass, and dedicated padding. We''ll walk you through it before move day.', 30),
      ('Is insurance included?',
       'Optional transit insurance is available on every move and we strongly recommend it for high-value contents.', 40)
    ) as t(q,a,ord)
    where not exists (
      select 1 from public.faqs where service_id = v_home and question = t.q
    );
  end if;

  if v_office is not null then
    insert into public.faqs (service_id, question, answer, display_order, is_active)
    select v_office, q, a, ord, true from (values
      ('Can you move us over the weekend?',
       'Yes — weekend and after-hours slots are designed exactly for this. Most offices choose Friday evening to Sunday.', 10),
      ('Do you handle IT equipment?',
       'Yes. We disconnect, label, transport, and reconnect workstations and routers. Server racks require a quick survey first.', 20),
      ('How do you minimise downtime?',
       'We plan the move in zones so critical teams are operational first thing Monday.', 30)
    ) as t(q,a,ord)
    where not exists (
      select 1 from public.faqs where service_id = v_office and question = t.q
    );
  end if;

  if v_vehicle is not null then
    insert into public.faqs (service_id, question, answer, display_order, is_active)
    select v_vehicle, q, a, ord, true from (values
      ('Will my vehicle pick up additional kilometres?',
       'No. Vehicles are loaded onto the carrier — the odometer does not move during transit.', 10),
      ('How long does intercity transport take?',
       'Bengaluru to a nearby city is typically 1–2 days. Longer routes vary — we share a delivery window before booking.', 20),
      ('Is the vehicle insured during transit?',
       'Yes — transit insurance is included by default for vehicle transport.', 30)
    ) as t(q,a,ord)
    where not exists (
      select 1 from public.faqs where service_id = v_vehicle and question = t.q
    );
  end if;

  if v_local is not null then
    insert into public.faqs (service_id, question, answer, display_order, is_active)
    select v_local, q, a, ord, true from (values
      ('Do you offer same-day moves?',
       'Subject to availability — book by 11 AM and we can usually arrange a same-day slot for small moves.', 10),
      ('What size vehicle do I need?',
       'We''ll recommend the right size after a quick call. Small (tempo), medium (407), or large (mini-truck).', 20),
      ('Can I help with loading?',
       'Absolutely. But our crew is included — no extra cost.', 30)
    ) as t(q,a,ord)
    where not exists (
      select 1 from public.faqs where service_id = v_local and question = t.q
    );
  end if;

  if v_inter is not null then
    insert into public.faqs (service_id, question, answer, display_order, is_active)
    select v_inter, q, a, ord, true from (values
      ('Do you co-load with other customers?',
       'No — every intercity move is on a dedicated vehicle. Your goods are not mixed with anyone else''s.', 10),
      ('What are the delivery windows?',
       'Typical metro-to-metro moves take 1–3 days. We commit to a window before you book.', 20),
      ('How is pricing calculated?',
       'Pricing depends on volume, distance, and floor access. We share a fixed quote — no per-kilometre surprises.', 30)
    ) as t(q,a,ord)
    where not exists (
      select 1 from public.faqs where service_id = v_inter and question = t.q
    );
  end if;

  if v_storage is not null then
    insert into public.faqs (service_id, question, answer, display_order, is_active)
    select v_storage, q, a, ord, true from (values
      ('How is the storage facility secured?',
       '24/7 CCTV, security guards, and access control. Climate is stable year-round.', 10),
      ('How is storage priced?',
       'By volume per month. We share a fixed monthly rate after the inventory is confirmed.', 20),
      ('Can you pick items up and drop them off?',
       'Yes — scheduled pickup and delivery on request, added to your monthly bill.', 30)
    ) as t(q,a,ord)
    where not exists (
      select 1 from public.faqs where service_id = v_storage and question = t.q
    );
  end if;
end$$;
