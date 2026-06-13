// Booking-deposit policy: amount, refund rules, and the pure state
// reducers the payment routes share. Client-safe (no env, no crypto) so
// the wizard, the API routes, and the self-test use one source of truth.
// Server-side Razorpay calls live in lib/razorpay.ts.

import type { PaymentStatus } from '@/types/database';

/**
 * Fallback deposit amount, in paise, used only when the live value in
 * `app_settings` is missing or malformed. Admin-edited via /admin/settings.
 * Kept here (not in lib/appSettings.ts) so this file stays env- and
 * DB-free and the wizard's client bundle can import it.
 */
export const DEPOSIT_AMOUNT_PAISE_FALLBACK = 29900;

/** Cancelling inside the allowed window (≥12 h) refunds the deposit in full. */
export const REFUND_ON_CANCEL = true;

/**
 * Should cancellation trigger a Razorpay refund? Only when the policy is
 * on and a captured payment actually exists. Already-refunded (or
 * refund-failed) bookings are not refunded twice.
 */
export function shouldRefundOnCancel(
  paymentStatus: PaymentStatus | null,
  razorpayPaymentId: string | null,
): boolean {
  return REFUND_ON_CANCEL && paymentStatus === 'paid' && Boolean(razorpayPaymentId);
}

/** Booking payment_status after a refund API attempt. */
export function statusAfterRefundAttempt(ok: boolean): PaymentStatus {
  return ok ? 'refunded' : 'refund_failed';
}

// ---------------------------------------------------------------------
// Webhook event reducers. The routes fetch rows; these decide — kept
// pure so scripts/booking-integrity-selftest.ts can assert idempotency
// without a DB.
// ---------------------------------------------------------------------

export type CapturedOutcome =
  | 'create_booking' // first confirmation for this order — book it
  | 'mark_paid' // booking exists (checkout verify won the race) — just sync status
  | 'ignore'; // unknown order / already processed

/**
 * What a payment.captured event (or a verified checkout callback) should
 * do, given current order state. Duplicate deliveries land in
 * 'mark_paid' / 'ignore' — never a second booking.
 */
export function capturedEventOutcome(order: {
  found: boolean;
  bookingId: string | null;
}): CapturedOutcome {
  if (!order.found) return 'ignore';
  return order.bookingId ? 'mark_paid' : 'create_booking';
}

/**
 * payment.failed must never regress an order that a captured payment (or
 * verified checkout) already marked paid — Razorpay customers can retry
 * a failed attempt on the same order, so failed/captured events for one
 * order can interleave.
 */
export function failedEventOutcome(order: {
  found: boolean;
  status: 'created' | 'paid' | 'failed';
}): 'mark_failed' | 'ignore' {
  if (!order.found || order.status === 'paid') return 'ignore';
  return 'mark_failed';
}
