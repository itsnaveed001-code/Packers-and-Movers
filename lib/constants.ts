// Business configuration. Edit these values before deploying.
// Phone numbers, WhatsApp, and office address MUST be updated to real values.

export const BUSINESS = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Packers Go Movers',
  // TODO(owner): replace with real business phone (E.164 format)
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+91 98765 43210',
  // TODO(owner): replace with real WhatsApp number (digits only, country code + number)
  whatsapp: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || '919876543210',
  email: 'hello@packersgomovers.com',
  // TODO(owner): replace with real office address
  address: 'Andheri East, Mumbai, Maharashtra 400069, India',
  domain: 'packersgomovers.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://packersgomovers.com',
  tagline: 'Stress-free packing and moving across India',
  gst: '27ABCDE1234F1Z5', // TODO(owner): replace with real GST number or remove
} as const;

export const CITIES = ['Mumbai', 'Pune', 'Thane', 'Navi Mumbai'] as const;
export const PRIMARY_CITY = CITIES[0];

export const HOURS = {
  weekday: '9:00 AM – 7:00 PM',
  sunday: 'Closed',
} as const;

export const STATS = {
  // Placeholder display numbers — replace with real figures once you have them.
  yearsExperience: 8,
  movesCompleted: '5,000+',
  citiesServed: CITIES.length,
  rating: '4.8 / 5',
} as const;

export const TESTIMONIALS = [
  {
    name: 'Priya S.',
    city: 'Mumbai',
    quote:
      'The team showed up on time, packed everything carefully, and nothing was damaged. Felt like a real, dependable service.',
  },
  {
    name: 'Rohan K.',
    city: 'Pune',
    quote:
      'Booked online, got a call within an hour, and the move went exactly as quoted. Transparent pricing — no surprises.',
  },
  {
    name: 'Anita M.',
    city: 'Thane',
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
