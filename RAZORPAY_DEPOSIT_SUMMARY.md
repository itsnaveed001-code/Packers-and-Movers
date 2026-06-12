# Razorpay Booking Deposit — Implementation Summary

**Branch:** `feat/razorpay-deposit` (off `feat/booking-otp-integrity` HEAD).
Nothing was merged, deployed, or run against the remote Supabase DB.

## What was built

| Capability | How |
|---|---|
| **A. ₹299 refundable deposit at booking** | After OTP + Review, the wizard calls `POST /api/payments/order` (full booking validation + OTP token, amount derived **server-side** from `lib/paymentsPolicy.ts`), opens Razorpay Checkout (drop-in script, name/email/phone prefilled), then `POST /api/payments/verify` checks the HMAC signature and only then creates the booking with `payment_status='paid'`. |
| **B. No booking without payment** | The validated payload is parked in the new `payment_orders` table — **no bookings row exists** until a verified payment confirms it. While Razorpay env vars are set, the old unpaid `POST /api/bookings` path returns **402** so it can't be used to dodge the deposit. |
| **C. Webhook as source of truth** | `POST /api/payments/webhook` (HMAC `X-Razorpay-Signature`) handles `payment.captured` / `payment.failed` / `refund.processed`. Checkout-callback-lost ⇄ webhook-lost races are idempotent: a **unique index on `bookings.razorpay_order_id`** guarantees exactly one booking per order; duplicate deliveries just re-sync status. Exempted from the middleware same-origin POST guard (verified in the self-test). |
| **D. Retry without re-OTP** | Payment failed/dismissed → nothing is booked, toast explains, and the 15-min verification token lets the customer pay again immediately. |
| **E. Auto-refund on cancellation** | The existing ≥ 12 h cancel flow now refunds a captured deposit in full via the Razorpay refund API. If the API call fails the booking still cancels with `payment_status='refund_failed'` (admin retries from the Razorpay dashboard; the `refund.processed` webhook then flips it to `refunded`). |
| **F. Graceful degradation** | Razorpay env vars missing → server logs one warning, the wizard books exactly as before (no payment step). Site never breaks. |
| **G. Surfaces** | Confirmation page + customer email: "Deposit paid ₹299 — refundable if cancelled ≥ 12 h before" (+ PDF receipt line). Track & manage: deposit/refund status per booking, refund-aware cancel toast. Admin booking detail: status / amount / payment / order / refund ids. Admin email: deposit row. New cancellation email mentions refund status. |

## Files

**New**
- `supabase/migrations/06_payments.sql` — idempotent: bookings columns (`deposit_amount_inr`, `razorpay_order_id`, `razorpay_payment_id`, `payment_status` + check, `refund_id`, `refunded_at`), unique order-id index, `payment_orders` table (RLS locked, service-role only)
- `lib/paymentsPolicy.ts` — `DEPOSIT_AMOUNT_INR = 299`, `REFUND_ON_CANCEL = true`, pure refund/webhook-outcome reducers
- `lib/razorpay.ts` — SDK client (lazy, env-gated), order create, full refund, checkout + webhook HMAC verification
- `lib/apiGuard.ts` — middleware CSRF guard extracted + `/api/payments/webhook` exemption (testable)
- `lib/bookingServer.ts` — shared validate → insert → emails pipeline (used by 4 routes)
- `lib/paymentsServer.ts` — `confirmPaidOrder()` shared by verify + webhook
- `app/api/payments/order|verify|webhook/route.ts`
- this file

**Modified (additively)**
- `types/database.ts`, `lib/validation.ts` (`storedBookingPayloadSchema`, `paymentVerifySchema`)
- `app/api/bookings/route.ts` (shared pipeline; 402 when payments on), `app/api/bookings/cancel/route.ts` (refund + email), `lookup` + `my` routes (deposit fields)
- `lib/email/templates.ts` (deposit rows, `DEPOSIT` Brevo param, `customerCancellationEmail`)
- `components/booking/BookingFlow.tsx` (checkout), `BookingConfirmedView.tsx`, `components/marketing/MyBookings.tsx`, `components/admin/BookingDetail.tsx`, `app/(marketing)/book/page.tsx`
- `middleware.ts` (uses `lib/apiGuard.ts`), `next.config.mjs` (COOP `same-origin-allow-popups`, Permissions-Policy allows `payment` for Razorpay — both required by Checkout)
- `scripts/booking-integrity-selftest.ts` (+24 payment checks), `package.json` (`razorpay`)

## Manual steps for you (in order)

1. **Run the migration** on Supabase (SQL editor or CLI): `supabase/migrations/06_payments.sql` (after `05_booking_integrity.sql`). Safe to re-run.
2. **Set env vars** (Vercel + `.env.local`) — use **test-mode keys first**:
   - `RAZORPAY_KEY_ID` (`rzp_test_…` to start)
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET` (you choose this string when creating the webhook)
   Until these exist, booking works exactly as today (no deposit).
3. **Create the webhook** in the Razorpay dashboard → Settings → Webhooks:
   - URL: `https://easyshiftx.com/api/payments/webhook`
   - Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.failed`, `refund.processed`
4. **Keep auto-capture on** (Razorpay default: Settings → Payment capture → automatic).
5. **Test-mode dry run**: book with test card `4111 1111 1111 1111` (any CVV/future expiry) → confirm booking appears with "Deposit paid", cancel it ≥ 12 h out → confirm the refund shows in the Razorpay test dashboard and the Track page says "refunded". Then swap to live keys.
6. *(Optional)* If you use the hosted Brevo admin template (`BREVO_ADMIN_TEMPLATE_ID`), add a row using the new `{{ params.DEPOSIT }}` token.

## Verification

- `npx tsx scripts/booking-integrity-selftest.ts` — **65/65 PASS** (order amount, signature valid/invalid/tampered, webhook idempotency + failed-never-regresses-paid, refund decisions incl. `refund_failed` flag, env-missing fallback, webhook CSRF exemption)
- `npm run lint` ✓ · `npx tsc --noEmit` ✓ · `npm run build` ✓
