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

export const referenceCodeSchema = z
  .string()
  .regex(/^PGM-[A-Z2-9]{5}$/, 'Invalid reference code');
