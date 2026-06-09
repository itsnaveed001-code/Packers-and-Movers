import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateSettingsSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('availability_settings')
    .select('*')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const p = parsed.data;
  // Time sanity: start must be strictly before end.
  if (p.working_hours_start >= p.working_hours_end) {
    return NextResponse.json(
      { error: 'invalid_hours', message: 'Start time must be before end time' },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  // availability_settings is a singleton (one row). Find the existing id first.
  const existing = await supabase
    .from('availability_settings')
    .select('id')
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from('availability_settings')
      .update({
        working_days: p.working_days,
        working_hours_start: p.working_hours_start,
        working_hours_end: p.working_hours_end,
        slot_duration_minutes: p.slot_duration_minutes,
        max_concurrent_bookings_per_slot: p.max_concurrent_bookings_per_slot,
        advance_booking_days: p.advance_booking_days,
        minimum_notice_hours: p.minimum_notice_hours,
      })
      .eq('id', existing.data.id)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ settings: data });
  }

  const { data, error } = await supabase
    .from('availability_settings')
    .insert({
      working_days: p.working_days,
      working_hours_start: p.working_hours_start,
      working_hours_end: p.working_hours_end,
      slot_duration_minutes: p.slot_duration_minutes,
      max_concurrent_bookings_per_slot: p.max_concurrent_bookings_per_slot,
      advance_booking_days: p.advance_booking_days,
      minimum_notice_hours: p.minimum_notice_hours,
    })
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}
