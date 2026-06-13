import { z } from 'zod';
import { BOOKING_STATUSES } from './constants';

const indianPhoneRegex = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function canonicalizePhone(raw: string): string {
  const digits = raw.replace(/[\s-]/g, '').replace(/^\+91/, '');
  return `+91${digits}`;
}

export const createBookingSchema = z.object({
  service_id: z.string().regex(uuidRegex, 'Invalid service'),
  booking_date: z.string().regex(dateRegex, 'Invalid date'),
  booking_time: z.string().regex(timeRegex, 'Invalid time'),
  customer_name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name is too long'),
  customer_phone: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Enter a valid 10-digit Indian mobile number')
    .transform(canonicalizePhone),
  customer_email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .max(120),
  pickup_address: z.string().trim().min(10, 'Address is too short').max(300),
  pickup_city: z.string().trim().min(2).max(60),
  pickup_pincode: z.string().trim().regex(pincodeRegex, 'Pincode must be 6 digits'),
  dropoff_address: z.string().trim().min(10, 'Address is too short').max(300),
  dropoff_city: z.string().trim().min(2).max(60),
  dropoff_pincode: z.string().trim().regex(pincodeRegex, 'Pincode must be 6 digits'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const contactFormSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(120),
  phone: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Enter a valid 10-digit Indian mobile number')
    .transform(canonicalizePhone),
  message: z.string().trim().min(10, 'Tell us a bit more').max(1000),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const updateBookingSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  admin_notes: z.string().trim().max(1000).optional().or(z.literal('')),
  booking_date: z.string().regex(dateRegex, 'Invalid date').optional(),
  booking_time: z.string().regex(timeRegex, 'Invalid time').optional(),
  // Paise. Owner records the actual price after the job — used for revenue reports.
  // Cap = ₹50,00,000 (50 lakh) in paise — covers premium villa/interstate jobs with headroom.
  final_price: z.number().int().nonnegative().max(500_000_000).nullable().optional(),
  payment_received: z.boolean().optional(),
  payment_method: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .optional()
    .or(z.literal('')),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

// availability_settings is a singleton — we PUT the whole row.
export const updateSettingsSchema = z.object({
  working_days: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'Pick at least one working day')
    .max(7),
  working_hours_start: z.string().regex(timeRegex, 'Invalid start time'),
  working_hours_end: z.string().regex(timeRegex, 'Invalid end time'),
  slot_duration_minutes: z.number().int().min(15).max(480),
  max_concurrent_bookings_per_slot: z.number().int().min(1).max(20),
  advance_booking_days: z.number().int().min(1).max(365),
  minimum_notice_hours: z.number().int().min(0).max(168),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const slotsQuerySchema = z.object({
  date: z.string().regex(dateRegex),
  service_id: z.string().regex(uuidRegex).optional(),
});

// Codes are 'ESX-XXXXX' on the rebranded brand; legacy bookings (pre-rebrand)
// have 'PGM-XXXXX'. Accept both so legacy customers can still look up old bookings.
export const referenceCodeSchema = z
  .string()
  .regex(/^(ESX|PGM)-[A-Z2-9]{5}$/, 'Invalid reference code');

// ---- Phase 3 admin editors ------------------------------------------

export const siteSettingsUpdateSchema = z.object({
  company_name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(40),
  whatsapp: z.string().trim().regex(/^\d{10,15}$/, 'Digits only, with country code'),
  email: z.string().trim().email().max(120),
  address: z.string().trim().min(5).max(300),
  footer_text: z.string().trim().max(500).nullable().optional().or(z.literal('')),
  business_hours: z.object({
    weekday: z.string().trim().min(2).max(60),
    sunday: z.string().trim().min(2).max(60),
  }),
  social_links: z
    .record(z.string().trim().url().or(z.literal('')))
    .default({}),
  map_mode: z.enum(['embed', 'arealist']),
  map_query: z.string().trim().max(300).nullable().optional().or(z.literal('')),
  map_lat: z.number().min(-90).max(90).nullable().optional(),
  map_lng: z.number().min(-180).max(180).nullable().optional(),
  google_rating: z.number().min(0).max(5).nullable().optional(),
  google_reviews_url: z
    .string()
    .trim()
    .url()
    .max(300)
    .nullable()
    .optional()
    .or(z.literal('')),
  insurance_badge_url: z
    .string()
    .trim()
    .url()
    .max(300)
    .nullable()
    .optional()
    .or(z.literal('')),
  stat_moves_completed: z.string().trim().max(40).nullable().optional().or(z.literal('')),
  stat_years_service: z.string().trim().max(40).nullable().optional().or(z.literal('')),
});

export type SiteSettingsUpdateInput = z.infer<typeof siteSettingsUpdateSchema>;

// PUT /api/admin/services/[id]/pricing — replaces the whole tier list
// for a service. Empty list = delete all tiers.
export const pricingTiersUpdateSchema = z.object({
  tiers: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        sublabel: z.string().trim().max(120).nullable().optional().or(z.literal('')),
        // Price in paise. Same cap as bookings.final_price (₹50L).
        price: z.number().int().nonnegative().max(500_000_000),
        display_order: z.number().int().nonnegative().default(0),
      }),
    )
    .max(20),
});

export type PricingTiersUpdateInput = z.infer<typeof pricingTiersUpdateSchema>;

export const inboxUpdateSchema = z.object({
  is_read: z.boolean(),
});

export type InboxUpdateInput = z.infer<typeof inboxUpdateSchema>;

// ---- Booking integrity (OTP / cancellation / custom move) -----------

export const otpPurposeSchema = z.enum(['booking', 'cancel', 'manage']);

const otpEmailField = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .max(120)
  .transform((v) => v.toLowerCase());

export const otpSendSchema = z.object({
  email: otpEmailField,
  name: z.string().trim().max(60).optional().or(z.literal('')),
  purpose: otpPurposeSchema,
});

export type OtpSendInput = z.infer<typeof otpSendSchema>;

export const otpVerifySchema = z.object({
  email: otpEmailField,
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
  purpose: otpPurposeSchema,
});

export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

// Custom-move resource selections (workers stepper 2–8, vehicle select,
// estimated hours). Bounds mirror lib/customPricing.ts.
export const customResourcesSchema = z.object({
  workers: z.number().int().min(2).max(8),
  vehicle: z.string().trim().min(1).max(40),
  hours: z.number().int().min(2).max(12),
});

export type CustomResourcesInput = z.infer<typeof customResourcesSchema>;

// Extends the original booking payload: a verified-email token is now
// required, and custom moves carry their resource selections.
export const createVerifiedBookingSchema = createBookingSchema.extend({
  verification_token: z.string().min(16, 'Email verification required'),
  custom_resources: customResourcesSchema.optional(),
});

export type CreateVerifiedBookingInput = z.infer<typeof createVerifiedBookingSchema>;

// The server-validated booking payload parked in payment_orders between
// order creation and payment capture. Written by /api/payments/order,
// re-parsed defensively by the verify/webhook routes before insert.
export const storedBookingPayloadSchema = z.object({
  service_id: z.string().regex(uuidRegex),
  service_name: z.string().min(1).max(120),
  booking_date: z.string().regex(dateRegex),
  booking_time: z.string().regex(timeRegex),
  duration_hours: z.number().int().min(1).max(24),
  customer_name: z.string().min(2).max(60),
  customer_phone: z.string().min(10).max(20),
  customer_email: z.string().email().max(120),
  pickup_address: z.string().min(10).max(300),
  pickup_city: z.string().min(2).max(60),
  pickup_pincode: z.string().regex(pincodeRegex),
  dropoff_address: z.string().min(10).max(300),
  dropoff_city: z.string().min(2).max(60),
  dropoff_pincode: z.string().regex(pincodeRegex),
  notes: z.string().max(500).nullable(),
  custom_resources: customResourcesSchema
    .extend({ indicative_price_paise: z.number().int().nonnegative().optional() })
    .nullable(),
});

export type StoredBookingPayload = z.infer<typeof storedBookingPayloadSchema>;

// POST /api/payments/verify — Razorpay Checkout success handback.
export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string().trim().min(8).max(64),
  razorpay_payment_id: z.string().trim().min(8).max(64),
  razorpay_signature: z.string().trim().min(16).max(256),
});

export type PaymentVerifyInput = z.infer<typeof paymentVerifySchema>;

// POST /api/bookings/my — either a fresh manage OTP code, a still-valid
// manage token, or a quick read-only reference_code + email lookup.
export const myBookingsSchema = z
  .object({
    email: otpEmailField,
    code: z.string().trim().regex(/^\d{6}$/).optional(),
    token: z.string().min(16).optional(),
    reference_code: referenceCodeSchema.optional(),
  })
  .refine((v) => v.code || v.token || v.reference_code, {
    message: 'Provide a code, token, or reference code',
  });

export type MyBookingsInput = z.infer<typeof myBookingsSchema>;

// ---- Invoices --------------------------------------------------------

// One row of an invoice. Description is admin free text; amount is whole
// rupees (the form caps at ₹50L per line, matching final_price). The
// server multiplies × 100 to get paise — no float math anywhere.
export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description required').max(120),
  amount_inr: z
    .number()
    .int()
    .nonnegative()
    .max(5_000_000),
});

// POST /api/admin/bookings/[id]/invoice
export const createInvoiceSchema = z.object({
  line_items: z.array(invoiceLineItemSchema).min(1, 'Add at least one line item').max(20),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// 32 random bytes → 64 hex characters. Reject anything else early so
// /invoice/<garbage> 404s without touching the DB.
export const invoiceTokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/, 'Invalid invoice token');

// POST /api/bookings/cancel — booking_id or reference_code, plus either a
// fresh cancel/manage OTP code or a still-valid manage token.
export const cancelBookingSchema = z
  .object({
    booking_id: z.string().regex(uuidRegex).optional(),
    reference_code: referenceCodeSchema.optional(),
    email: otpEmailField,
    code: z.string().trim().regex(/^\d{6}$/).optional(),
    token: z.string().min(16).optional(),
    reason: z.string().trim().max(300).optional().or(z.literal('')),
  })
  .refine((v) => v.booking_id || v.reference_code, {
    message: 'Provide a booking id or reference code',
  })
  .refine((v) => v.code || v.token, {
    message: 'Provide a verification code or token',
  });

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
