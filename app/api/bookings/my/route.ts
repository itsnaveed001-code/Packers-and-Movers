import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { myBookingsSchema } from '@/lib/validation';
import { issueVerificationToken, verifyVerificationToken } from '@/lib/otp';
import { verifyAndConsumeOtp } from '@/lib/otpServer';
import { isCancellable } from '@/lib/bookingPolicy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUMMARY_COLUMNS =
  'id, reference_code, booking_date, booking_time, duration_hours, status, pickup_city, dropoff_city, custom_resources, deposit_amount_inr, payment_status, created_at, service:services(name, slug)';

type SummaryRow = {
  id: string;
  reference_code: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number | null;
  status: string;
  pickup_city: string;
  dropoff_city: string;
  custom_resources: Record<string, unknown> | null;
  deposit_amount_inr: number | null;
  payment_status: string | null;
  created_at: string;
  service: { name: string; slug: string } | null;
};

// Minimal PII: no addresses, phone, email, or admin notes.
function toSummary(b: SummaryRow) {
  return {
    id: b.id,
    reference_code: b.reference_code,
    booking_date: b.booking_date,
    booking_time: b.booking_time,
    duration_hours: b.duration_hours,
    status: b.status,
    pickup_city: b.pickup_city,
    dropoff_city: b.dropoff_city,
    custom_resources: b.custom_resources,
    deposit_amount_inr: b.deposit_amount_inr,
    payment_status: b.payment_status,
    created_at: b.created_at,
    service: b.service,
    cancellable: isCancellable(b.status, b.booking_date, b.booking_time),
  };
}

// Account-less "My bookings": a manage OTP (or a still-valid manage token)
// returns every booking tied to the email. Alternatively, reference_code +
// email returns that single booking read-only — no OTP needed.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = myBookingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { email, code, token, reference_code } = parsed.data;
  const supabase = createSupabaseAdminClient();

  // Quick read-only lookup: both the reference code AND the email must
  // match — knowing only one reveals nothing.
  if (reference_code && !code && !token) {
    const { data, error } = await supabase
      .from('bookings')
      .select(SUMMARY_COLUMNS)
      .eq('reference_code', reference_code)
      .maybeSingle<SummaryRow & { customer_email?: string }>();
    if (error) {
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }
    // Email comparison happens via a second filtered query to avoid ever
    // selecting customer_email into the response path.
    const { data: match, error: matchErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('reference_code', reference_code)
      .ilike('customer_email', email)
      .maybeSingle();
    if (matchErr) {
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }
    if (!data || !match) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ mode: 'single', booking: toSummary(data) });
  }

  // Full list requires a verified email: manage token or fresh manage OTP.
  let verified = false;
  if (token && verifyVerificationToken(token, email, ['manage'])) {
    verified = true;
  } else if (code) {
    const result = await verifyAndConsumeOtp(supabase, email, code, ['manage']);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    verified = true;
  }
  if (!verified) {
    return NextResponse.json({ error: 'verification_required' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(SUMMARY_COLUMNS)
    .ilike('customer_email', email)
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })
    .limit(50)
    .returns<SummaryRow[]>();

  if (error) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }

  return NextResponse.json({
    mode: 'list',
    bookings: (data ?? []).map(toSummary),
    // Fresh token so the page can cancel without asking for another code.
    token: issueVerificationToken(email, 'manage'),
  });
}
