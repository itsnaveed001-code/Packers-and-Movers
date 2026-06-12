# Booking Integrity — Implementation Summary

**Branch:** `feat/booking-otp-integrity` (6 commits, off `feat/phase3-admin-editors` HEAD).
Ready for review + merge. Nothing was merged, deployed, or run against the remote Supabase DB.

## What was built

| Capability | How |
|---|---|
| **A. Email OTP before booking** | 6-digit code emailed (Brevo hosted template, inline fallback) → verify → 15-min signed token → `POST /api/bookings` rejects without a valid token bound to the booking email. |
| **B. Self-service cancellation** | `POST /api/bookings/cancel` — email-ownership proof + status `pending/confirmed` + ≥ 12 h before the slot. Sets `cancelled` / `cancelled_at` / `cancel_reason`. Freed slots become bookable again (both `/api/slots` and the capacity check already exclude `cancelled` — verified explicitly in the self-test). |
| **C. Multiple bookings, soft cap** | No hard block. Past **5 active** (pending/confirmed) bookings per email → friendly 429 linking to `/booking-status`. OTP + send rate limits are the real anti-abuse guard. |
| **D. Custom move** | Seeded `custom` service (`services.is_custom`). Wizard shows workers (2–8), vehicle (Tata Ace / 14ft / 17ft / 19ft), estimated hours, with a **live indicative price** (labor = workers × half/full-day rate + vehicle rate). Stored in `bookings.custom_resources` jsonb incl. `indicative_price_paise`. Reads `estimator_settings` if that table exists, else constants. |
| **E. Account-less "My bookings"** | `/booking-status`: email → manage OTP → **all** bookings for that email with status badges + per-booking Cancel (reuses the verified session — no second code). Quick `reference_code` + `email` read-only single lookup too. Links added in header, footer, and the booking-confirmed page. |

## Files

**New**
- `supabase/migrations/05_booking_integrity.sql` — idempotent: `email_otps` (RLS locked, hashed codes only), bookings columns (`email_verified`, `cancelled_at`, `cancel_reason`, `custom_resources`), `services.is_custom` + Custom move seed, defensive status-check handling
- `lib/otp.ts` — codes, hashing, HMAC tokens, rate-limit helpers (**all OTP knobs in `OTP_CONFIG`**)
- `lib/otpServer.ts` — verify-and-consume against `email_otps`
- `lib/bookingPolicy.ts` — `CANCEL_MIN_HOURS_BEFORE = 12`, `MAX_ACTIVE_BOOKINGS_PER_EMAIL = 5`
- `lib/customPricing.ts` — `DEFAULT_RATE_CARD` + `computeCustomPrice()` + `loadRateCard()`
- `app/api/bookings/otp/send|otp/verify|my|cancel/route.ts`
- `components/booking/EmailVerification.tsx`, `components/booking/CustomMoveSelector.tsx`
- `components/marketing/MyBookings.tsx`, `app/(marketing)/booking-status/page.tsx`
- `scripts/booking-integrity-selftest.ts`, `.gitattributes` (was missing), this file

**Modified (additively)**
- `types/database.ts`, `lib/validation.ts` (new Zod schemas), `lib/email/templates.ts` (`otpTemplateParams` + `otpEmail`)
- `app/api/bookings/route.ts` (token required, soft cap, custom pricing, `email_verified=true`)
- `components/booking/BookingFlow.tsx`, `BookingConfirmedView.tsx`, `app/(marketing)/book/page.tsx`
- `components/marketing/Header.tsx` / `Footer.tsx` (Track links)

## Manual steps for you (in order)

1. **Run the migration** on Supabase (SQL editor or CLI): `supabase/migrations/05_booking_integrity.sql`. Safe to re-run. ⚠️ The new booking flow **requires** this — until it runs, `POST /api/bookings` will fail (it selects `services.is_custom`).
2. **Set env vars** (Vercel + `.env.local`):
   - `BOOKING_OTP_SECRET` — any long random string (falls back to `NEXTAUTH_SECRET` → `SUPABASE_SERVICE_ROLE_KEY` if unset, but set it explicitly).
   - `BREVO_OTP_TEMPLATE_ID=2` — your hosted OTP template (params `OTP`, `NAME`, `EXPIRY`). If unset, the inline fallback email still sends the OTP.
3. Merge the branch when happy. (Your untracked `brevo-otp-template.yaml` was left untouched.)

## Defaults & where to change them

| Setting | Default | File |
|---|---|---|
| OTP length / expiry / attempts | 6 digits / 10 min / 5 tries | `lib/otp.ts` → `OTP_CONFIG` |
| Resend cooldown / hourly caps | 60 s / 5 per email / 5 per IP | `lib/otp.ts` → `OTP_CONFIG` |
| Verified-token lifetime | 15 min | `lib/otp.ts` → `OTP_CONFIG.tokenTtlMinutes` |
| Cancellation window | 12 h before slot | `lib/bookingPolicy.ts` |
| Active-bookings soft cap | 5 | `lib/bookingPolicy.ts` |
| Custom rates (labor ₹800/₹1,400 per worker; vehicles ₹1,800–₹5,500) | placeholders | `lib/customPricing.ts` → `DEFAULT_RATE_CARD` (or later via an `estimator_settings` table) |
| Workers / hours bounds | 2–8 / 2–12 | `lib/customPricing.ts` |

## Verification results

- `npx tsc --noEmit` — clean. `npm run lint` — clean. `npm run build` — succeeds, all new routes registered.
- `npx tsx scripts/booking-integrity-selftest.ts` — **35/35 PASS** (OTP expiry / >5 attempts / consume-once, send cooldown + hourly caps, token bound to email & dead after 15 min, 2nd–5th booking allowed / 6th active 429'd, custom pricing + persistence, cancel blocked <12 h / allowed ≥12 h, slot counted free after cancel).

## Security notes

- Raw OTP codes are never stored — salted SHA-256 only; comparisons are constant-time.
- `email_otps` has RLS enabled with **zero policies**: only the service-role server client can touch it.
- Responses never reveal whether an email exists; cancel returns the same 404 for "no booking" and "email mismatch".
- All new endpoints validate bodies with Zod; minimal PII in `/my` responses (no addresses/phone/email echoed).

## Future work (intentionally not built)

**Live map / package tracking.** Suggested shape when ready: nullable `tracking_url` on bookings, plus driver fields (`driver_name`, `driver_phone`) and a `booking_locations` table (booking_id, lat, lng, recorded_at) fed by a driver app/WhatsApp-location bridge; the existing `/booking-status` page then gains a live-map panel per in-progress booking. The `custom_resources` jsonb and the booking_events timeline are ready anchor points.
