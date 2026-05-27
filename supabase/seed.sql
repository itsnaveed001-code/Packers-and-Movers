-- =====================================================================
-- Packers Go Movers — initial seed
-- Run AFTER schema.sql. Safe to re-run: uses on conflict do nothing.
-- =====================================================================

insert into public.availability_settings
  (working_days, working_hours_start, working_hours_end,
   slot_duration_minutes, max_concurrent_bookings_per_slot,
   advance_booking_days, minimum_notice_hours, singleton)
values
  ('{1,2,3,4,5,6}', '09:00', '19:00', 60, 1, 60, 24, true)
on conflict (singleton) do nothing;

insert into public.services
  (name, slug, description, short_description, base_price,
   duration_hours, icon_name, display_order, is_active)
values
  (
    'Home Shifting',
    'home-shifting',
    'End-to-end home relocation — careful packing of every room, dismantling and reassembly of furniture, loading, transit, and unpacking at your new home. Insured by default.',
    'Full-service household moves with packing, transit and unpacking.',
    1500000,
    6,
    'home',
    1,
    true
  ),
  (
    'Office Shifting',
    'office-shifting',
    'Plan-led office relocations designed to minimise downtime. Weekend or after-hours slots, IT equipment handling, and structured unpacking so your team can work on Monday morning.',
    'Plan-led office relocations with minimal downtime.',
    3500000,
    8,
    'building-2',
    2,
    true
  ),
  (
    'Vehicle Transport',
    'vehicle-transport',
    'Door-to-door transport of bikes and cars in enclosed or open carriers. Insured transit, GPS-tracked, and delivered without a kilometre on the odometer.',
    'Bike and car transport across India, insured and tracked.',
    800000,
    4,
    'car',
    3,
    true
  ),
  (
    'Local Moves',
    'local-moves',
    'Short-distance moves within the city — perfect for studios, 1BHKs, or sending a few items across town. Same-day slots available.',
    'Same-city moves with same-day availability.',
    500000,
    3,
    'truck',
    4,
    true
  ),
  (
    'Intercity Moves',
    'intercity-moves',
    'Long-distance relocations between cities. Dedicated trucks, scheduled delivery windows, and full transit insurance.',
    'Long-distance, dedicated-truck relocations between cities.',
    2500000,
    8,
    'route',
    5,
    true
  ),
  (
    'Storage',
    'storage',
    'Clean, secure, climate-stable storage by the month or week. CCTV-monitored facility, easy pickup and drop scheduling.',
    'Secure short and long-term storage.',
    null,
    2,
    'package',
    6,
    true
  )
on conflict (slug) do nothing;
