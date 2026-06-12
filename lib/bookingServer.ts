// Shared booking-creation pipeline. POST /api/bookings (no-deposit
// fallback), POST /api/payments/order (validate before charging), and
// the payment verify/webhook routes (insert after payment) all run the
// same validation + insert + email code from here.
//
// Server-only: uses the service-role client and the email sender.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomResources, Database, PaymentStatus } from '@/types/database';
import type { CreateVerifiedBookingInput, StoredBookingPayload } from '@/lib/validation';
import { generateReferenceCode } from '@/lib/utils';
import { BUSINESS } from '@/lib/constants';
import {
  MAX_ACTIVE_BOOKINGS_PER_EMAIL,
  underActiveBookingCap,
} from '@/lib/bookingPolicy';
import { computeCustomPrice, loadRateCard } from '@/lib/customPricing';
import { sendEmail } from '@/lib/email/send';
import {
  adminNotificationEmail,
  customerConfirmationEmail,
  bookingTemplateParams,
  type BookingEmailData,
} from '@/lib/email/templates';

type Supabase = SupabaseClient<Database>;

export type BookingApiError = {
  ok: false;
  status: number;
  error: string;
  extra?: Record<string, unknown>;
};

export type ValidatedBooking = {
  ok: true;
  /** Everything the insert needs, ready to park in payment_orders. */
  payload: StoredBookingPayload;
};

function parseDateUTC(yyyyMmDd: string): Date {
  const [y, mo, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Full booking-request validation: service, date/time rules, blocked
 * dates, capacity, per-email soft cap, custom-move pricing. Email
 * ownership (OTP token) is checked by the callers — the webhook path
 * replays an already-verified payload and has no token.
 */
export async function validateBookingRequest(
  supabase: Supabase,
  data: CreateVerifiedBookingInput,
): Promise<ValidatedBooking | BookingApiError> {
  // Load availability settings + service in parallel
  const [availRes, serviceRes] = await Promise.all([
    supabase.from('availability_settings').select('*').maybeSingle(),
    supabase
      .from('services')
      .select('id, name, duration_hours, is_active, is_custom')
      .eq('id', data.service_id)
      .maybeSingle(),
  ]);

  if (availRes.error || !availRes.data) {
    return { ok: false, status: 500, error: 'no_settings' };
  }
  const avail = availRes.data;

  if (serviceRes.error || !serviceRes.data || !serviceRes.data.is_active) {
    return { ok: false, status: 400, error: 'service_not_found' };
  }
  const service = serviceRes.data;

  // Validate the date/time against availability rules
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const bookingDate = parseDateUTC(data.booking_date);
  const maxDate = new Date(
    todayUTC.getTime() + avail.advance_booking_days * 24 * 60 * 60 * 1000,
  );

  if (bookingDate.getTime() < todayUTC.getTime()) {
    return { ok: false, status: 400, error: 'date_in_past' };
  }
  if (bookingDate.getTime() > maxDate.getTime()) {
    return { ok: false, status: 400, error: 'date_too_far' };
  }

  // Blocked?
  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('date', data.booking_date)
    .maybeSingle();
  if (blocked) {
    return { ok: false, status: 400, error: 'date_blocked' };
  }

  // Working day?
  const dow = bookingDate.getUTCDay();
  if (!avail.working_days.includes(dow)) {
    return { ok: false, status: 400, error: 'non_working_day' };
  }

  // Within working hours?
  const start = toMinutes(avail.working_hours_start);
  const end = toMinutes(avail.working_hours_end);
  const t = toMinutes(data.booking_time);
  if (t < start || t + avail.slot_duration_minutes > end) {
    return { ok: false, status: 400, error: 'time_out_of_hours' };
  }

  // Minimum notice
  const slotInstant = new Date(
    `${data.booking_date}T${data.booking_time}:00+05:30`,
  ).getTime();
  const noticeMs = avail.minimum_notice_hours * 60 * 60 * 1000;
  if (slotInstant - Date.now() < noticeMs) {
    return { ok: false, status: 400, error: 'too_soon' };
  }

  // Capacity check
  const { data: existing, error: existingErr } = await supabase
    .from('bookings')
    .select('id')
    .eq('booking_date', data.booking_date)
    .eq('booking_time', data.booking_time)
    .neq('status', 'cancelled');

  if (existingErr) {
    return { ok: false, status: 500, error: 'lookup_failed' };
  }
  if ((existing?.length ?? 0) >= avail.max_concurrent_bookings_per_slot) {
    return { ok: false, status: 409, error: 'slot_taken' };
  }

  // Soft cap: multiple bookings are allowed; only past N active
  // (pending/confirmed) bookings for this email do we ask the customer to
  // manage existing ones first. OTP + send rate limits are the real guard.
  const { count: activeCount, error: activeErr } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .ilike('customer_email', data.customer_email)
    .in('status', ['pending', 'confirmed']);
  if (activeErr) {
    return { ok: false, status: 500, error: 'lookup_failed' };
  }
  if (!underActiveBookingCap(activeCount ?? 0)) {
    return {
      ok: false,
      status: 429,
      error: 'too_many_active_bookings',
      extra: {
        limit: MAX_ACTIVE_BOOKINGS_PER_EMAIL,
        manageUrl: '/booking-status',
      },
    };
  }

  // Custom move: persist the resource selections with an indicative price
  // from the rate card; the customer's estimated hours drive the duration.
  let customResources: CustomResources | null = null;
  let durationHours = service.duration_hours;
  if (service.is_custom) {
    if (!data.custom_resources) {
      return { ok: false, status: 400, error: 'custom_resources_required' };
    }
    const rateCard = await loadRateCard(supabase);
    const price = computeCustomPrice(data.custom_resources, rateCard);
    if (price == null) {
      return { ok: false, status: 400, error: 'invalid_vehicle' };
    }
    customResources = {
      ...data.custom_resources,
      indicative_price_paise: price,
    };
    durationHours = data.custom_resources.hours;
  }

  return {
    ok: true,
    payload: {
      service_id: data.service_id,
      service_name: service.name,
      booking_date: data.booking_date,
      booking_time: data.booking_time,
      duration_hours: durationHours,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email,
      pickup_address: data.pickup_address,
      pickup_city: data.pickup_city,
      pickup_pincode: data.pickup_pincode,
      dropoff_address: data.dropoff_address,
      dropoff_city: data.dropoff_city,
      dropoff_pincode: data.dropoff_pincode,
      notes: data.notes || null,
      custom_resources: customResources,
    },
  };
}

export type BookingPaymentFields = {
  deposit_amount_inr: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  payment_status: PaymentStatus;
};

export type InsertedBooking = {
  ok: true;
  booking: { id: string; reference_code: string };
  /** True when another writer (verify vs. webhook race) already booked this order. */
  duplicate: boolean;
};

/**
 * Inserts the booking with reference-code collision retry. When `payment`
 * is set, the unique index on bookings.razorpay_order_id makes the insert
 * idempotent per order: a concurrent duplicate returns the existing row
 * with duplicate=true instead of a second booking.
 *
 * Capacity is NOT re-checked here for the payment path — it was checked
 * when the order was created, minutes earlier. A paid customer landing in
 * a just-filled slot is resolved on the confirmation call rather than by
 * auto-refunding them.
 */
export async function insertBooking(
  supabase: Supabase,
  payload: StoredBookingPayload,
  payment: BookingPaymentFields | null,
): Promise<InsertedBooking | BookingApiError> {
  let reference_code = generateReferenceCode();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: inserted, error: insertErr } = await supabase
      .from('bookings')
      .insert({
        reference_code,
        service_id: payload.service_id,
        booking_date: payload.booking_date,
        booking_time: payload.booking_time,
        duration_hours: payload.duration_hours,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        customer_email: payload.customer_email,
        pickup_address: payload.pickup_address,
        pickup_city: payload.pickup_city,
        pickup_pincode: payload.pickup_pincode,
        dropoff_address: payload.dropoff_address,
        dropoff_city: payload.dropoff_city,
        dropoff_pincode: payload.dropoff_pincode,
        notes: payload.notes,
        status: 'pending',
        email_verified: true,
        custom_resources: payload.custom_resources,
        ...(payment
          ? {
              deposit_amount_inr: payment.deposit_amount_inr,
              razorpay_order_id: payment.razorpay_order_id,
              razorpay_payment_id: payment.razorpay_payment_id,
              payment_status: payment.payment_status,
            }
          : {}),
      })
      .select('id, reference_code')
      .single();

    if (!insertErr && inserted) {
      return { ok: true, booking: inserted, duplicate: false };
    }

    // 23505 = unique_violation. A reference_code collision retries with a
    // fresh code; a razorpay_order_id collision means the booking already
    // exists (concurrent verify/webhook) — fetch and reuse it.
    if (insertErr?.code === '23505') {
      if (insertErr.message?.includes('reference_code')) {
        reference_code = generateReferenceCode();
        continue;
      }
      if (payment && insertErr.message?.includes('razorpay_order_id')) {
        const { data: existing } = await supabase
          .from('bookings')
          .select('id, reference_code')
          .eq('razorpay_order_id', payment.razorpay_order_id)
          .maybeSingle();
        if (existing) {
          return { ok: true, booking: existing, duplicate: true };
        }
      }
    }

    console.error('[bookings] insert failed:', insertErr);
    return { ok: false, status: 500, error: 'insert_failed' };
  }

  return { ok: false, status: 500, error: 'insert_failed' };
}

/**
 * Fire-and-forget admin + customer emails. Never blocks or throws —
 * failures are logged. Falls back to the business inbox so notifications
 * work once an email provider key is set.
 */
export function sendBookingEmails(
  payload: StoredBookingPayload,
  referenceCode: string,
  deposit: { amountInr: number; paymentId: string } | null,
): void {
  const adminEmail = process.env.ADMIN_EMAIL || BUSINESS.email;
  void (async () => {
    try {
      const emailData: BookingEmailData = {
        reference_code: referenceCode,
        service_name: payload.service_name,
        booking_date: payload.booking_date,
        booking_time: payload.booking_time,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        customer_email: payload.customer_email,
        pickup_address: payload.pickup_address,
        pickup_city: payload.pickup_city,
        pickup_pincode: payload.pickup_pincode,
        dropoff_address: payload.dropoff_address,
        dropoff_city: payload.dropoff_city,
        dropoff_pincode: payload.dropoff_pincode,
        notes: payload.notes,
        deposit,
      };
      if (adminEmail) {
        const t = adminNotificationEmail(emailData);
        const templateIdRaw = process.env.BREVO_ADMIN_TEMPLATE_ID;
        const templateId = templateIdRaw ? Number.parseInt(templateIdRaw, 10) : NaN;
        await sendEmail({
          to: adminEmail,
          subject: t.subject,
          html: t.html, // fallback when no template id / Resend provider
          replyTo: payload.customer_email,
          templateId: Number.isFinite(templateId) ? templateId : undefined,
          params: bookingTemplateParams(emailData),
        });
      }
      const c = customerConfirmationEmail(emailData);
      await sendEmail({
        to: payload.customer_email,
        subject: c.subject,
        html: c.html,
        replyTo: adminEmail,
      });
    } catch (err) {
      console.error('[bookings] email dispatch failed:', err);
    }
  })();
}
