// Payment-confirmation core shared by POST /api/payments/verify (browser
// checkout handback) and POST /api/payments/webhook (payment.captured).
// Both call confirmPaidOrder(); whichever arrives first creates the
// booking, the other finds it already there. Idempotency is anchored by
// the unique index on bookings.razorpay_order_id.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { storedBookingPayloadSchema } from '@/lib/validation';
import { insertBooking, sendBookingEmails } from '@/lib/bookingServer';
import { capturedEventOutcome } from '@/lib/paymentsPolicy';

type Supabase = SupabaseClient<Database>;

export type ConfirmResult =
  | { ok: true; referenceCode: string; bookingId: string; created: boolean }
  | { ok: false; status: number; error: string };

/**
 * Marks an order paid and ensures exactly one booking exists for it.
 * Safe to call any number of times with the same order (duplicate
 * webhook deliveries, webhook + checkout race): repeats return the
 * existing booking with created=false.
 */
export async function confirmPaidOrder(
  supabase: Supabase,
  opts: { orderId: string; paymentId: string },
): Promise<ConfirmResult> {
  const { data: order, error } = await supabase
    .from('payment_orders')
    .select('id, status, amount_paise, booking_id, booking_payload')
    .eq('razorpay_order_id', opts.orderId)
    .maybeSingle();

  if (error) {
    console.error('[payments] order lookup failed:', error);
    return { ok: false, status: 500, error: 'lookup_failed' };
  }

  const outcome = capturedEventOutcome({
    found: Boolean(order),
    bookingId: order?.booking_id ?? null,
  });

  if (outcome === 'ignore' || !order) {
    return { ok: false, status: 404, error: 'order_not_found' };
  }

  if (outcome === 'mark_paid') {
    // Booking already created by the other path — just sync order state.
    await supabase
      .from('payment_orders')
      .update({ status: 'paid', razorpay_payment_id: opts.paymentId })
      .eq('id', order.id);
    const { data: existing } = await supabase
      .from('bookings')
      .select('id, reference_code')
      .eq('id', order.booking_id!)
      .maybeSingle();
    if (!existing) {
      return { ok: false, status: 500, error: 'booking_missing' };
    }
    return {
      ok: true,
      referenceCode: existing.reference_code,
      bookingId: existing.id,
      created: false,
    };
  }

  // create_booking: re-parse the parked payload defensively before insert.
  const parsedPayload = storedBookingPayloadSchema.safeParse(order.booking_payload);
  if (!parsedPayload.success) {
    console.error(
      '[payments] stored payload invalid for order',
      opts.orderId,
      parsedPayload.error.flatten(),
    );
    return { ok: false, status: 500, error: 'payload_invalid' };
  }
  const payload = parsedPayload.data;

  const inserted = await insertBooking(supabase, payload, {
    deposit_amount_inr: Math.round(order.amount_paise / 100),
    razorpay_order_id: opts.orderId,
    razorpay_payment_id: opts.paymentId,
    payment_status: 'paid',
  });
  if (!inserted.ok) {
    return { ok: false, status: inserted.status, error: inserted.error };
  }

  await supabase
    .from('payment_orders')
    .update({
      status: 'paid',
      razorpay_payment_id: opts.paymentId,
      booking_id: inserted.booking.id,
    })
    .eq('id', order.id);

  // Emails only on first creation — a duplicate means the other writer
  // already sent them.
  if (!inserted.duplicate) {
    sendBookingEmails(payload, inserted.booking.reference_code, {
      amountInr: Math.round(order.amount_paise / 100),
      paymentId: opts.paymentId,
    });
  }

  return {
    ok: true,
    referenceCode: inserted.booking.reference_code,
    bookingId: inserted.booking.id,
    created: !inserted.duplicate,
  };
}
