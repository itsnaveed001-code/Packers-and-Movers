import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { referenceCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public lookup by reference code. Returns ONLY safe summary fields —
// no full address, no admin_notes, no phone number, no email.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const refRaw = searchParams.get('ref') ?? '';
  const parsed = referenceCodeSchema.safeParse(refRaw.toUpperCase().trim());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_ref' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'reference_code, booking_date, booking_time, duration_hours, customer_name, status, pickup_city, dropoff_city, deposit_amount_inr, payment_status, service:services(name, slug)',
    )
    .eq('reference_code', parsed.data)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Return only first name — keep the rest private.
  const firstName = (data.customer_name ?? '').split(' ')[0] || 'Customer';

  return NextResponse.json({
    reference_code: data.reference_code,
    booking_date: data.booking_date,
    booking_time: data.booking_time,
    duration_hours: data.duration_hours,
    status: data.status,
    customer_first_name: firstName,
    pickup_city: data.pickup_city,
    dropoff_city: data.dropoff_city,
    deposit_amount_inr: data.deposit_amount_inr,
    payment_status: data.payment_status,
    service: data.service,
  });
}
