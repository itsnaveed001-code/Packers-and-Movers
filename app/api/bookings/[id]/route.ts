import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateBookingSchema } from '@/lib/validation';
import type { Database } from '@/types/database';

type BookingUpdate = Database['public']['Tables']['bookings']['Update'];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseDateUTC(yyyyMmDd: string): Date {
  const [y, mo, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  // Admin check
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = updateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload: BookingUpdate = {};
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.admin_notes !== undefined)
    payload.admin_notes = parsed.data.admin_notes || null;
  if (parsed.data.final_price !== undefined)
    payload.final_price = parsed.data.final_price;
  if (parsed.data.payment_method !== undefined) {
    payload.payment_method = parsed.data.payment_method || null;
  }
  if (parsed.data.payment_received !== undefined) {
    payload.payment_received = parsed.data.payment_received;
    // Stamp paid_at when payment_received flips on; clear it when flipped off.
    payload.paid_at = parsed.data.payment_received
      ? new Date().toISOString()
      : null;
  }

  const isReschedule =
    parsed.data.booking_date !== undefined ||
    parsed.data.booking_time !== undefined;

  const supabase = createSupabaseAdminClient();

  if (isReschedule) {
    // For reschedule, both date and time must be present.
    if (!parsed.data.booking_date || !parsed.data.booking_time) {
      return NextResponse.json(
        { error: 'incomplete_reschedule', message: 'Both date and time are required.' },
        { status: 400 },
      );
    }
    const newDate = parsed.data.booking_date;
    const newTime = parsed.data.booking_time;

    // Validate against availability rules. We skip minimum-notice on the
    // admin side: the admin is usually on the phone with the customer and
    // we don't want their convenience to be blocked by a "too soon" gate.
    const [availRes, blockedRes, currentRes] = await Promise.all([
      supabase.from('availability_settings').select('*').maybeSingle(),
      supabase
        .from('blocked_dates')
        .select('date')
        .eq('date', newDate)
        .maybeSingle(),
      supabase.from('bookings').select('id, status').eq('id', id).maybeSingle(),
    ]);

    if (availRes.error || !availRes.data) {
      return NextResponse.json({ error: 'no_settings' }, { status: 500 });
    }
    if (!currentRes.data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const avail = availRes.data;

    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const bookingDate = parseDateUTC(newDate);
    const maxDate = new Date(
      todayUTC.getTime() + avail.advance_booking_days * 24 * 60 * 60 * 1000,
    );

    if (bookingDate.getTime() < todayUTC.getTime()) {
      return NextResponse.json({ error: 'date_in_past' }, { status: 400 });
    }
    if (bookingDate.getTime() > maxDate.getTime()) {
      return NextResponse.json({ error: 'date_too_far' }, { status: 400 });
    }
    if (blockedRes.data) {
      return NextResponse.json({ error: 'date_blocked' }, { status: 400 });
    }

    const dow = bookingDate.getUTCDay();
    if (!avail.working_days.includes(dow)) {
      return NextResponse.json({ error: 'non_working_day' }, { status: 400 });
    }

    const start = toMinutes(avail.working_hours_start);
    const end = toMinutes(avail.working_hours_end);
    const t = toMinutes(newTime);
    if (t < start || t + avail.slot_duration_minutes > end) {
      return NextResponse.json({ error: 'time_out_of_hours' }, { status: 400 });
    }

    // Capacity check — exclude THIS booking from the count (otherwise
    // rescheduling onto the same slot it already holds would falsely 409).
    const { data: existing, error: existingErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_date', newDate)
      .eq('booking_time', newTime)
      .neq('status', 'cancelled')
      .neq('id', id);
    if (existingErr) {
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }
    if ((existing?.length ?? 0) >= avail.max_concurrent_bookings_per_slot) {
      return NextResponse.json({ error: 'slot_taken' }, { status: 409 });
    }

    payload.booking_date = newDate;
    payload.booking_time = newTime;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  return NextResponse.json({ booking: data });
}
