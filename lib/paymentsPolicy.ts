// Booking-deposit policy: amount, refund rules, and the pure state
// reducers the payment routes share. Client-safe (no env, no crypto) so
// the wizard, the API routes, and the self-test use one source of truth.
// Server-side Razorpay calls live in lib/razorpay.ts.

import type { PaymentStatus } from '@/types/database';

/** Refundable deposit collected at booking time, in rupees. */
export const DEPOSIT_AMOUNT_INR = 299;

/** Cancelling inside the allowed window (≥12 h) refunds the deposit in full. */
export const REFUND_ON_CANCEL = true;

/**
 * Amount sent to Razorpay, in paise. Always derived server-side from the
 * policy constant — client-supplied amounts are never trusted.
 */
export function depositAmountPaise(): number {
  return DEPOSIT_AMOUNT_INR * 100;
}

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
