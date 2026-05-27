import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { slotsQuerySchema } from '@/lib/validation';
import { formatTimeLabel } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Slot = {
  time: string;        // 'HH:MM'
  label: string;       // '9:00 AM'
  available: boolean;
  tooSoon: boolean;
};

type EmptyResponse = {
  slots: [];
  reason: 'past' | 'non_working' | 'blocked';
};
type ListResponse = { slots: Slot[] };

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function parseDateUTC(yyyyMmDd: string): Date {
  const [y, mo, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

function todayIST(): string {
  // Return today's date as YYYY-MM-DD in IST.
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = slotsQuerySchema.safeParse({
    date: searchParams.get('date'),
    service_id: searchParams.get('service_id') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  }
  const { date } = parsed.data;

  const supabase = createSupabaseAdminClient();

  // Load availability settings (single row)
  const { data: avail, error: availErr } = await supabase
    .from('availability_settings')
    .select('*')
    .maybeSingle();

  if (availErr || !avail) {
    return NextResponse.json({ error: 'no_settings' }, { status: 500 });
  }

  // Past dates
  if (date < todayIST()) {
    const body: EmptyResponse = { slots: [], reason: 'past' };
    return NextResponse.json(body);
  }

  // Blocked dates
  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('date', date)
    .maybeSingle();
  if (blocked) {
    const body: EmptyResponse = { slots: [], reason: 'blocked' };
    return NextResponse.json(body);
  }

  // Non-working day?
  const dow = parseDateUTC(date).getUTCDay();
  if (!avail.working_days.includes(dow)) {
    const body: EmptyResponse = { slots: [], reason: 'non_working' };
    return NextResponse.json(body);
  }

  // Build candidate slots
  const start = toMinutes(avail.working_hours_start);
  const end = toMinutes(avail.working_hours_end);
  const step = avail.slot_duration_minutes;
  const capacity = avail.max_concurrent_bookings_per_slot;
  const noticeMs = avail.minimum_notice_hours * 60 * 60 * 1000;

  const candidates: string[] = [];
  for (let t = start; t + step <= end; t += step) {
    candidates.push(fromMinutes(t));
  }

  // Load bookings for the date (non-cancelled only)
  const { data: existing, error: bookingsErr } = await supabase
    .from('bookings')
    .select('booking_time, status')
    .eq('booking_date', date)
    .neq('status', 'cancelled');

  if (bookingsErr) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }

  const counts = new Map<string, number>();
  for (const b of existing ?? []) {
    const key = b.booking_time.slice(0, 5);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const now = Date.now();
  const slots: Slot[] = candidates.map((time) => {
    const slotMs = new Date(`${date}T${time}:00+05:30`).getTime();
    const tooSoon = slotMs - now < noticeMs;
    const count = counts.get(time) ?? 0;
    const atCapacity = count >= capacity;
    return {
      time,
      label: formatTimeLabel(time),
      available: !atCapacity && !tooSoon,
      tooSoon,
    };
  });

  const body: ListResponse = { slots };
  return NextResponse.json(body);
}
