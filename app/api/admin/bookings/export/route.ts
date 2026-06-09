import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // RFC 4180-style escape: wrap if contains comma, quote, newline.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('bookings')
    .select(
      'reference_code, status, booking_date, booking_time, duration_hours, customer_name, customer_phone, customer_email, pickup_address, pickup_city, pickup_pincode, dropoff_address, dropoff_city, dropoff_pincode, notes, admin_notes, final_price, payment_received, payment_method, paid_at, created_at, service:services(name)',
    )
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })
    .limit(5000);

  if (from && dateRegex.test(from)) query = query.gte('booking_date', from);
  if (to && dateRegex.test(to)) query = query.lte('booking_date', to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const rows = data ?? [];
  const headers = [
    'reference',
    'status',
    'date',
    'time',
    'duration_hours',
    'service',
    'customer_name',
    'customer_phone',
    'customer_email',
    'pickup_address',
    'pickup_city',
    'pickup_pincode',
    'dropoff_address',
    'dropoff_city',
    'dropoff_pincode',
    'notes',
    'admin_notes',
    'final_price_inr',
    'payment_received',
    'payment_method',
    'paid_at',
    'created_at',
  ];

  const lines = [headers.join(',')];
  for (const r of rows) {
    const service = Array.isArray(r.service)
      ? (r.service[0]?.name ?? '')
      : (r.service?.name ?? '');
    const priceInr = r.final_price == null ? '' : (r.final_price / 100).toFixed(2);
    lines.push(
      [
        r.reference_code,
        r.status,
        r.booking_date,
        r.booking_time,
        r.duration_hours,
        service,
        r.customer_name,
        r.customer_phone,
        r.customer_email,
        r.pickup_address,
        r.pickup_city,
        r.pickup_pincode,
        r.dropoff_address,
        r.dropoff_city,
        r.dropoff_pincode,
        r.notes,
        r.admin_notes,
        priceInr,
        r.payment_received,
        r.payment_method,
        r.paid_at,
        r.created_at,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  const body = lines.join('\r\n');

  const today = new Date().toISOString().slice(0, 10);
  const filename = `bookings_${from ?? 'all'}_${to ?? today}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
