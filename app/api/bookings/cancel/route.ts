import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { cancelBookingSchema } from '@/lib/validation';
import { verifyVerificationToken } from '@/lib/otp';
import { verifyAndConsumeOtp } from '@/lib/otpServer';
import {
  CANCEL_MIN_HOURS_BEFORE,
  CANCELLABLE_STATUSES,
  isCancellable,
} from '@/lib/bookingPolicy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Self-service cancellation. Requires proof of email ownership (a manage
// token from /api/bookings/my, or a fresh cancel/manage OTP), the booking
// email to match, a cancellable status, and >= 12 h before the slot.
// Cancelled bookings free their slot automatically: both /api/slots and
// the capacity check in POST /api/bookings exclude status='cancelled'.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = cancelBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { booking_id, reference_code, email, code, token, reason } = parsed.data;
  const supabase = createSupabaseAdminClient();

  // Prove email ownership before touching the booking.
  let verified = false;
  if (token && verifyVerificationToken(token, email, ['cancel', 'manage'])) {
    verified = true;
  } else if (code) {
    const result = await verifyAndConsumeOtp(supabase, email, code, [
      'cancel',
      'manage',
    ]);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    verified = true;
  }
  if (!verified) {
    return NextResponse.json({ error: 'verification_required' }, { status: 401 });
  }

  let query = supabase
    .from('bookings')
    .select('id, reference_code, booking_date, booking_time, status, customer_email');
  query = booking_id
    ? query.eq('id', booking_id)
    : query.eq('reference_code', reference_code!);
  const { data: booking, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  // Same response for "no such booking" and "email doesn't match" — don't
  // leak which references exist.
  if (!booking || booking.customer_email.toLowerCase() !== email) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(booking.status)) {
    return NextResponse.json(
      { error: 'not_cancellable', status: booking.status },
      { status: 409 },
    );
  }
  if (!isCancellable(booking.status, booking.booking_date, booking.booking_time)) {
    return NextResponse.json(
      { error: 'too_late_to_cancel', windowHours: CANCEL_MIN_HOURS_BEFORE },
      { status: 409 },
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason?.trim() || 'Cancelled by customer',
    })
    .eq('id', booking.id)
    .in('status', [...CANCELLABLE_STATUSES])
    .select('id, reference_code, status, cancelled_at')
    .maybeSingle();

  if (updateErr || !updated) {
    console.error('[bookings/cancel] update failed:', updateErr);
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    booking: {
      id: updated.id,
      reference_code: updated.reference_code,
      status: updated.status,
      cancelled_at: updated.cancelled_at,
    },
  });
}
