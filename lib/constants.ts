// Business configuration. Edit these values before deploying.
// Phone numbers, WhatsApp, and office address MUST be updated to real values.

export const BUSINESS = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME || 'EasyShiftX',
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+91 78927 73770',
  // WhatsApp: digits only, country code + number (used in wa.me links)
  whatsapp: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || '917892773770',
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'easyshiftx.2415@gmail.com',
  // TODO(owner): replace with real office address in Bengaluru
  address: 'Bengaluru, Karnataka, India',
  domain: 'easyshiftx.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://easyshiftx.vercel.app',
  tagline: 'Stress-free packing and moving in Bengaluru',
  // gst left blank until verified — do not display unverified info
  gst: '',
} as const;

// Single operating city for now (Bengaluru only).
export const CITY = 'Bengaluru';
export const CITIES = [CITY] as const;
export const PRIMARY_CITY = CITY;

// Localities served within Bengaluru. Powers the "areas we serve" section
// and the booking address pickers.
export const SERVICE_AREAS = [
  'Koramangala',
  'Indiranagar',
  'HSR Layout',
  'BTM Layout',
  'Jayanagar',
  'JP Nagar',
  'Whitefield',
  'Marathahalli',
  'Bellandur',
  'Sarjapur Road',
  'Electronic City',
  'Bannerghatta Road',
  'Banashankari',
  'Rajajinagar',
  'Malleshwaram',
  'Hebbal',
  'Yelahanka',
  'KR Puram',
  'Mahadevapura',
  'Hennur',
] as const;

// Services not yet launched — shown as "Coming soon" and disabled in booking.
export const COMING_SOON_SERVICES = [
  'vehicle-transport',
  'intercity-moves',
  'storage',
] as const;

export function isComingSoon(slug: string): boolean {
  return (COMING_SOON_SERVICES as readonly string[]).includes(slug);
}

// Placeholder house-shifting price tiers. Indicative only — the owner sets
// real prices later. Values are in rupees.
export const HOUSE_SHIFTING_TIERS = [
  { label: '1 RK / Few items', priceFrom: 2499, note: 'Studio or a handful of items' },
  { label: '1 BHK', priceFrom: 4999, note: 'Compact home, 1 bedroom' },
  { label: '2 BHK', priceFrom: 7999, note: 'Most common family move' },
  { label: '3 BHK', priceFrom: 12999, note: 'Larger home, more furniture' },
  { label: '4 BHK / Villa', priceFrom: 18999, note: 'Big home or villa' },
] as const;

export const HOURS = {
  weekday: '9:00 AM – 7:00 PM',
  sunday: 'Closed',
} as const;

// NOTE: Trust stats are hidden until we have real, verifiable figures.
// Kept here (unused) so they're easy to switch back on later.
export const STATS = {
  yearsExperience: 0,
  movesCompleted: '',
  citiesServed: CITIES.length,
  rating: '',
} as const;

export const TESTIMONIALS = [
  {
    name: 'Priya S.',
    city: 'Koramangala',
    quote:
      'The team showed up on time, packed everything carefully, and nothing was damaged. Felt like a real, dependable service.',
  },
  {
    name: 'Rahul N.',
    city: 'Whitefield',
    quote:
      'Booked online, got a call within an hour, and the move went exactly as quoted. Transparent pricing — no surprises.',
  },
  {
    name: 'Ananya R.',
    city: 'Indiranagar',
    quote:
      'Office shifting was completed in a single day with zero downtime. Professional and friendly crew throughout.',
  },
] as const;

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-900 border-blue-200',
  in_progress: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  completed: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-900 border-rose-200',
};
