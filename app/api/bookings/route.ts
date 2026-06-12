import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createVerifiedBookingSchema } from '@/lib/validation';
import { verifyVerificationToken } from '@/lib/otp';
import {
  insertBooking,
  sendBookingEmails,
  validateBookingRequest,
} from '@/lib/bookingServer';
import { paymentsEnabled } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Direct (no-deposit) booking creation. Active only while Razorpay env
// vars are missing — once payments are configured, bookings must go
// through /api/payments/order → checkout → /api/payments/verify, and
// this route refuses to create unpaid bookings.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = createVerifiedBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Email ownership proof: a token issued by /api/bookings/otp/verify,
  // bound to this exact email, within the last 15 minutes.
  if (
    !verifyVerificationToken(data.verification_token, data.customer_email, [
      'booking',
    ])
  ) {
    return NextResponse.json({ error: 'email_not_verified' }, { status: 401 });
  }

  // Deposits configured → a booking may only be created after a verified
  // payment. Refuse the unpaid path so it can't be used to dodge the fee.
  if (paymentsEnabled()) {
    return NextResponse.json({ error: 'payment_required' }, { status: 402 });
  }

  const supabase = createSupabaseAdminClient();

  const validated = await validateBookingRequest(supabase, data);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, ...(validated.extra ?? {}) },
      { status: validated.status },
    );
  }

  const inserted = await insertBooking(supabase, validated.payload, null);
  if (!inserted.ok) {
    return NextResponse.json({ error: inserted.error }, { status: inserted.status });
  }

  sendBookingEmails(validated.payload, inserted.booking.reference_code, null);

  return NextResponse.json(
    { reference_code: inserted.booking.reference_code },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  // Admin only — checked via Supabase session cookie.
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const validStatuses = new Set([
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ] as const);
  type BookingStatusValue = typeof validStatuses extends Set<infer T> ? T : never;

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('bookings')
    .select('*, service:services(name, slug)')
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })
    .limit(200);

  if (status && validStatuses.has(status as BookingStatusValue)) {
    query = query.eq('status', status as BookingStatusValue);
  }
  if (from) query = query.gte('booking_date', from);
  if (to) query = query.lte('booking_date', to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  return NextResponse.json({ bookings: data ?? [] });
}
