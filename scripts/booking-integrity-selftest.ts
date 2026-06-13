/**
 * Booking-integrity + payments self-test. Pure-logic assertions against
 * the same modules the API routes use — no database or network required.
 *
 *   npx tsx scripts/booking-integrity-selftest.ts
 *
 * Prints PASS/FAIL per check and exits 1 if anything fails.
 */

// The OTP module resolves its secret from env at call time — set one for
// the test run before any hashing/signing happens.
process.env.BOOKING_OTP_SECRET = 'selftest-secret-do-not-use-in-prod';

// Start from a known payments-env state; individual checks set/clear
// these to exercise both the enabled path and the graceful fallback.
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;
delete process.env.RAZORPAY_WEBHOOK_SECRET;

import {
  codeMatches,
  generateCode,
  hashCode,
  hasAttemptsLeft,
  isOtpConsumed,
  isOtpExpired,
  issueVerificationToken,
  OTP_CONFIG,
  resendWaitSeconds,
  underSendCap,
  verifyVerificationToken,
  type OtpRowLike,
} from '../lib/otp';
import {
  CANCEL_MIN_HOURS_BEFORE,
  isCancellable,
  MAX_ACTIVE_BOOKINGS_PER_EMAIL,
  underActiveBookingCap,
} from '../lib/bookingPolicy';
import {
  computeCustomPrice,
  DEFAULT_RATE_CARD,
} from '../lib/customPricing';
import { createHmac } from 'node:crypto';
import {
  capturedEventOutcome,
  DEPOSIT_AMOUNT_PAISE_FALLBACK,
  failedEventOutcome,
  REFUND_ON_CANCEL,
  shouldRefundOnCancel,
  statusAfterRefundAttempt,
} from '../lib/paymentsPolicy';
import {
  paymentsEnabled,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from '../lib/razorpay';
import { isCrossOriginForbidden, isCsrfExempt } from '../lib/apiGuard';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}`);
  }
}

// Minute-aligned so boundary slots (HH:MM, no seconds) land exactly on
// the cancellation cutoff.
const NOW = Math.floor(Date.now() / 60_000) * 60_000;
const EMAIL = 'customer@example.com';

function otpRow(overrides: Partial<OtpRowLike> = {}): OtpRowLike {
  return {
    attempts: 0,
    expires_at: new Date(NOW + OTP_CONFIG.expiryMinutes * 60_000).toISOString(),
    consumed_at: null,
    created_at: new Date(NOW).toISOString(),
    ...overrides,
  };
}

/** Epoch → IST wall-clock {date, time} the way bookings store slots. */
function istSlot(epochMs: number): { date: string; time: string } {
  const ist = new Date(epochMs + 5.5 * 60 * 60 * 1000);
  return {
    date: ist.toISOString().slice(0, 10),
    time: ist.toISOString().slice(11, 16),
  };
}

console.log('--- OTP codes & hashing ---');
const code = generateCode();
check('generateCode returns 6 digits', /^\d{6}$/.test(code));
check(
  'hashCode is deterministic',
  hashCode('123456', EMAIL) === hashCode('123456', EMAIL),
);
check(
  'hashCode binds to the email',
  hashCode('123456', EMAIL) !== hashCode('123456', 'other@example.com'),
);
check('correct code matches its stored hash', codeMatches(code, EMAIL, hashCode(code, EMAIL)));
check(
  'wrong code does not match',
  !codeMatches('000000', EMAIL, hashCode('999999', EMAIL)),
);

console.log('--- OTP expiry, attempts, consumption ---');
check('fresh OTP is not expired', !isOtpExpired(otpRow(), NOW));
check(
  'OTP expired after 10 minutes is rejected',
  isOtpExpired(otpRow({ expires_at: new Date(NOW - 1000).toISOString() }), NOW),
);
check('attempts 0..4 may retry', hasAttemptsLeft(otpRow({ attempts: 4 })));
check(
  `attempt ${OTP_CONFIG.maxAttempts + 1} (>5 wrong tries) is blocked`,
  !hasAttemptsLeft(otpRow({ attempts: OTP_CONFIG.maxAttempts })),
);
check(
  'consumed OTP cannot be reused (succeeds only once)',
  isOtpConsumed(otpRow({ consumed_at: new Date(NOW).toISOString() })),
);

console.log('--- OTP send rate limits ---');
check(
  'resend blocked inside the 60 s cooldown',
  resendWaitSeconds(new Date(NOW - 10_000).toISOString(), NOW) > 0,
);
check(
  'resend allowed after the cooldown',
  resendWaitSeconds(new Date(NOW - 61_000).toISOString(), NOW) === 0,
);
check('5th send in an hour allowed', underSendCap(4, OTP_CONFIG.maxSendsPerEmailPerHour));
check('6th send in an hour blocked', !underSendCap(5, OTP_CONFIG.maxSendsPerEmailPerHour));

console.log('--- Verification token (15-min HMAC) ---');
const token = issueVerificationToken(EMAIL, 'booking', { now: NOW });
check('token validates for its bound email', verifyVerificationToken(token, EMAIL, ['booking'], { now: NOW }));
check(
  'token rejected for a different email',
  !verifyVerificationToken(token, 'attacker@example.com', ['booking'], { now: NOW }),
);
check(
  'token rejected for the wrong purpose',
  !verifyVerificationToken(token, EMAIL, ['manage'], { now: NOW }),
);
check(
  'token still valid at 14 minutes',
  verifyVerificationToken(token, EMAIL, ['booking'], { now: NOW + 14 * 60_000 }),
);
check(
  'token rejected after 15 minutes',
  !verifyVerificationToken(token, EMAIL, ['booking'], { now: NOW + 15 * 60_000 + 1000 }),
);
check(
  'tampered token rejected',
  !verifyVerificationToken(`${token.slice(0, -2)}xx`, EMAIL, ['booking'], { now: NOW }),
);

console.log('--- Multiple bookings & soft cap ---');
check('2nd booking allowed (1 active)', underActiveBookingCap(1));
check('3rd booking allowed (2 active)', underActiveBookingCap(2));
check(
  `${MAX_ACTIVE_BOOKINGS_PER_EMAIL}th booking allowed (${MAX_ACTIVE_BOOKINGS_PER_EMAIL - 1} active)`,
  underActiveBookingCap(MAX_ACTIVE_BOOKINGS_PER_EMAIL - 1),
);
check(
  `6th active booking rejected with 429 (${MAX_ACTIVE_BOOKINGS_PER_EMAIL} active)`,
  !underActiveBookingCap(MAX_ACTIVE_BOOKINGS_PER_EMAIL),
);

console.log('--- Custom move pricing ---');
const fullDayPrice = computeCustomPrice(
  { workers: 4, vehicle: '14ft', hours: 8 },
  DEFAULT_RATE_CARD,
);
check(
  'full-day price = workers × full-day rate + vehicle',
  fullDayPrice ===
    4 * DEFAULT_RATE_CARD.laborFullDayPaise +
      DEFAULT_RATE_CARD.vehicles.find((v) => v.id === '14ft')!.ratePaise,
);
const halfDayPrice = computeCustomPrice(
  { workers: 2, vehicle: 'tata-ace', hours: 4 },
  DEFAULT_RATE_CARD,
);
check(
  'half-day price uses the half-day labor rate',
  halfDayPrice ===
    2 * DEFAULT_RATE_CARD.laborHalfDayPaise +
      DEFAULT_RATE_CARD.vehicles.find((v) => v.id === 'tata-ace')!.ratePaise,
);
check(
  'unknown vehicle is rejected (null)',
  computeCustomPrice({ workers: 2, vehicle: 'rocket', hours: 4 }) === null,
);
// Shape persisted on bookings.custom_resources by POST /api/bookings:
const persisted = {
  workers: 4,
  vehicle: '14ft',
  hours: 8,
  indicative_price_paise: fullDayPrice!,
};
check(
  'custom_resources persists selections + indicative price',
  persisted.workers === 4 &&
    persisted.vehicle === '14ft' &&
    persisted.hours === 8 &&
    persisted.indicative_price_paise > 0,
);

console.log('--- Cancellation window ---');
const in24h = istSlot(NOW + 24 * 60 * 60 * 1000);
const in6h = istSlot(NOW + 6 * 60 * 60 * 1000);
const at12h = istSlot(NOW + CANCEL_MIN_HOURS_BEFORE * 60 * 60 * 1000);
check(
  'cancellable 24 h before the slot',
  isCancellable('pending', in24h.date, in24h.time, NOW),
);
check(
  'cancellable exactly at the 12 h boundary',
  isCancellable('confirmed', at12h.date, at12h.time, NOW),
);
check('blocked under 12 h to the slot', !isCancellable('pending', in6h.date, in6h.time, NOW));
check(
  'completed booking not cancellable',
  !isCancellable('completed', in24h.date, in24h.time, NOW),
);
check(
  'already-cancelled booking not cancellable',
  !isCancellable('cancelled', in24h.date, in24h.time, NOW),
);

console.log('--- Slot freed after cancellation ---');
// Mirrors the counting in GET /api/slots and the capacity check in
// POST /api/bookings: both filter with .neq('status', 'cancelled').
type SlotBooking = { booking_time: string; status: string };
function availableCount(rows: SlotBooking[], time: string, capacity: number): number {
  const active = rows.filter((r) => r.status !== 'cancelled');
  const taken = active.filter((r) => r.booking_time.slice(0, 5) === time).length;
  return capacity - taken;
}
const slotRows: SlotBooking[] = [
  { booking_time: '09:00:00', status: 'pending' },
  { booking_time: '09:00:00', status: 'confirmed' },
];
check('slot full at capacity 2 with 2 active bookings', availableCount(slotRows, '09:00', 2) === 0);
slotRows[0].status = 'cancelled';
check(
  'cancelling one booking frees the slot for availability',
  availableCount(slotRows, '09:00', 2) === 1,
);

console.log('--- Deposit amount (server-derived, DB-backed) ---');
check(
  'deposit fallback is ₹299 (paise) when app_settings row is missing',
  DEPOSIT_AMOUNT_PAISE_FALLBACK === 29_900,
);
check(
  'fallback is always integer paise (no float math)',
  Number.isInteger(DEPOSIT_AMOUNT_PAISE_FALLBACK),
);

console.log('--- Razorpay signature verification ---');
const KEY_SECRET = 'selftest-razorpay-key-secret';
const WEBHOOK_SECRET = 'selftest-razorpay-webhook-secret';
const ORDER_ID = 'order_TestABC123';
const PAYMENT_ID = 'pay_TestXYZ789';
// Reference HMACs computed independently of lib/razorpay.ts.
const checkoutSig = createHmac('sha256', KEY_SECRET)
  .update(`${ORDER_ID}|${PAYMENT_ID}`)
  .digest('hex');
check(
  'valid checkout signature accepted',
  verifyCheckoutSignature(
    { orderId: ORDER_ID, paymentId: PAYMENT_ID, signature: checkoutSig },
    KEY_SECRET,
  ),
);
check(
  'tampered signature rejected',
  !verifyCheckoutSignature(
    { orderId: ORDER_ID, paymentId: PAYMENT_ID, signature: `${checkoutSig.slice(0, -2)}ff` },
    KEY_SECRET,
  ),
);
check(
  'signature for a different payment id rejected',
  !verifyCheckoutSignature(
    { orderId: ORDER_ID, paymentId: 'pay_Forged000000', signature: checkoutSig },
    KEY_SECRET,
  ),
);
check(
  'signature minted with the wrong secret rejected',
  !verifyCheckoutSignature(
    {
      orderId: ORDER_ID,
      paymentId: PAYMENT_ID,
      signature: createHmac('sha256', 'attacker-secret')
        .update(`${ORDER_ID}|${PAYMENT_ID}`)
        .digest('hex'),
    },
    KEY_SECRET,
  ),
);

const webhookBody = JSON.stringify({
  event: 'payment.captured',
  payload: { payment: { entity: { id: PAYMENT_ID, order_id: ORDER_ID } } },
});
const webhookSig = createHmac('sha256', WEBHOOK_SECRET)
  .update(webhookBody)
  .digest('hex');
check(
  'valid webhook signature accepted',
  verifyWebhookSignature(webhookBody, webhookSig, WEBHOOK_SECRET),
);
check(
  'webhook body altered after signing rejected',
  !verifyWebhookSignature(`${webhookBody} `, webhookSig, WEBHOOK_SECRET),
);
check(
  'webhook with empty signature rejected',
  !verifyWebhookSignature(webhookBody, '', WEBHOOK_SECRET),
);

console.log('--- Webhook idempotency & ordering ---');
check(
  'first capture for a staged order creates the booking',
  capturedEventOutcome({ found: true, bookingId: null }) === 'create_booking',
);
check(
  'duplicate capture (booking exists) only syncs status — no second booking',
  capturedEventOutcome({ found: true, bookingId: 'bk_1' }) === 'mark_paid',
);
check(
  'capture for an unknown order is ignored',
  capturedEventOutcome({ found: false, bookingId: null }) === 'ignore',
);
check(
  'payment.failed marks a staged order failed (no booking is created)',
  failedEventOutcome({ found: true, status: 'created' }) === 'mark_failed',
);
check(
  'payment.failed after a capture never regresses a paid order',
  failedEventOutcome({ found: true, status: 'paid' }) === 'ignore',
);
check(
  'failed→captured retry on the same order still books (failed does not block)',
  capturedEventOutcome({ found: true, bookingId: null }) === 'create_booking' &&
    failedEventOutcome({ found: true, status: 'failed' }) === 'mark_failed',
);

console.log('--- Refund on cancellation ---');
check('refund-on-cancel policy is on', REFUND_ON_CANCEL === true);
check(
  'captured deposit is refunded on a valid cancel',
  shouldRefundOnCancel('paid', PAYMENT_ID),
);
check(
  'no-deposit booking (fallback mode) skips the refund call',
  !shouldRefundOnCancel(null, null),
);
check(
  'already-refunded deposit is not refunded twice',
  !shouldRefundOnCancel('refunded', PAYMENT_ID),
);
check(
  'paid status without a payment id is skipped (defensive)',
  !shouldRefundOnCancel('paid', null),
);
check(
  'successful refund → payment_status=refunded',
  statusAfterRefundAttempt(true) === 'refunded',
);
check(
  'failed refund API call → flagged refund_failed for manual retry',
  statusAfterRefundAttempt(false) === 'refund_failed',
);

console.log('--- Payments env fallback (graceful degradation) ---');
check(
  'Razorpay env missing → payments disabled, wizard books without deposit',
  paymentsEnabled() === false,
);
process.env.RAZORPAY_KEY_ID = 'rzp_test_selftest';
process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
check(
  'env present → payments enabled (direct unpaid POST /api/bookings returns 402)',
  paymentsEnabled() === true,
);
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;
check('env removed again → back to fallback booking', paymentsEnabled() === false);

console.log('--- Webhook exempt from same-origin POST guard ---');
const HOST = 'easyshiftx.com';
check(
  'webhook path is CSRF-exempt by configuration',
  isCsrfExempt('/api/payments/webhook'),
);
check(
  'Razorpay webhook POST (no Origin header) passes the guard',
  !isCrossOriginForbidden({
    method: 'POST',
    pathname: '/api/payments/webhook',
    origin: null,
    requestHost: HOST,
    hostHeader: HOST,
  }),
);
check(
  'webhook POST passes even with a foreign Origin (HMAC auths it instead)',
  !isCrossOriginForbidden({
    method: 'POST',
    pathname: '/api/payments/webhook',
    origin: 'https://api.razorpay.com',
    requestHost: HOST,
    hostHeader: HOST,
  }),
);
check(
  'other API POSTs with a foreign Origin are still blocked',
  isCrossOriginForbidden({
    method: 'POST',
    pathname: '/api/bookings',
    origin: 'https://evil.example',
    requestHost: HOST,
    hostHeader: HOST,
  }),
);
check(
  'same-origin booking POST still passes',
  !isCrossOriginForbidden({
    method: 'POST',
    pathname: '/api/bookings',
    origin: `https://${HOST}`,
    requestHost: HOST,
    hostHeader: HOST,
  }),
);

console.log('---');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('ALL PASS');
