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
  const invoiceStatusParam = searchParams.get('invoice_status');

  const validStatuses = new Set([
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ] as const);
  type BookingStatusValue = typeof validStatuses extends Set<infer T> ? T : never;

  const validInvoiceStatuses = new Set([
    'none',
    'sent',
    'paid',
    'cash_received',
  ] as const);
  type InvoiceStatusFilter = typeof validInvoiceStatuses extends Set<infer T> ? T : never;
  const invoiceStatusFilter =
    invoiceStatusParam &&
    validInvoiceStatuses.has(invoiceStatusParam as InvoiceStatusFilter)
      ? (invoiceStatusParam as InvoiceStatusFilter)
      : null;

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

  // Stitch the latest active invoice onto each booking. The partial
  // unique index `invoices_one_per_booking` guarantees at most one
  // sent/paid/cash_received invoice per booking, so a single batch
  // lookup keyed on booking_id is enough.
  const bookings = data ?? [];
  const bookingIds = bookings.map((b) => b.id);
  let invoiceByBookingId = new Map<
    string,
    { status: string; amount_paise: number }
  >();
  if (bookingIds.length > 0) {
    const { data: invoiceRows } = await supabase
      .from('invoices')
      .select('booking_id, status, amount_paise')
      .in('booking_id', bookingIds)
      .in('status', ['sent', 'paid', 'cash_received']);
    invoiceByBookingId = new Map(
      (invoiceRows ?? []).map((row) => [
        row.booking_id,
        { status: row.status, amount_paise: row.amount_paise },
      ]),
    );
  }

  const enriched = bookings.map((b) => {
    const inv = invoiceByBookingId.get(b.id);
    return {
      ...b,
      invoice_status: inv?.status ?? null,
      invoice_amount_paise: inv?.amount_paise ?? null,
    };
  });

  const filtered = invoiceStatusFilter
    ? enriched.filter((b) =>
        invoiceStatusFilter === 'none'
          ? b.invoice_status == null
          : b.invoice_status === invoiceStatusFilter,
      )
    : enriched;

  return NextResponse.json({ bookings: filtered });
}
