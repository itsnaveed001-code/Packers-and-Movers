import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarX, Coffee } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScheduleDateNav } from '@/components/admin/ScheduleDateNav';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatTimeLabel } from '@/lib/utils';
import type { BookingStatus } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  reference_code: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  customer_name: string;
  customer_phone: string;
  pickup_city: string;
  dropoff_city: string;
  status: BookingStatus;
  service: { name: string } | null;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function parseDateUTC(yyyyMmDd: string): Date {
  const [y, mo, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const date = d && isValidDate(d) ? d : todayISO();

  const supabase = createSupabaseAdminClient();
  const [bookingsRes, settingsRes, blockedRes] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        'id, reference_code, booking_date, booking_time, duration_hours, customer_name, customer_phone, pickup_city, dropoff_city, status, service:services(name)',
      )
      .eq('booking_date', date)
      .neq('status', 'cancelled')
      .order('booking_time', { ascending: true }),
    supabase.from('availability_settings').select('*').maybeSingle(),
    supabase
      .from('blocked_dates')
      .select('reason')
      .eq('date', date)
      .maybeSingle(),
  ]);

  const rows = (bookingsRes.data ?? []) as Row[];
  const settings = settingsRes.data;
  const blocked = blockedRes.data;

  const dow = parseDateUTC(date).getUTCDay();
  const isWorkingDay = settings ? settings.working_days.includes(dow) : true;
  const isBlocked = Boolean(blocked);

  // Build slot grid from working hours + slot duration. If we somehow don't
  // have settings yet, fall back to a 09–19 hourly grid so the page still works.
  const slotDuration = settings?.slot_duration_minutes ?? 60;
  const startMin = settings ? timeToMinutes(settings.working_hours_start) : 9 * 60;
  const endMin = settings ? timeToMinutes(settings.working_hours_end) : 19 * 60;
  const slots: string[] = [];
  for (let m = startMin; m + slotDuration <= endMin; m += slotDuration) {
    slots.push(minutesToTime(m));
  }

  // Bucket bookings into slots they START in.
  const bookingsBySlot = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.booking_time.slice(0, 5);
    const existing = bookingsBySlot.get(key) ?? [];
    existing.push(row);
    bookingsBySlot.set(key, existing);
  }

  return (
    <div className="container max-w-6xl py-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Day schedule</h1>
          <p className="text-sm text-muted-foreground">
            {format(parseDateUTC(date), 'EEEE, d MMMM yyyy')} ·{' '}
            {rows.length} booking{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <ScheduleDateNav date={date} />
      </header>

      {isBlocked && (
        <Card className="mb-4 border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <CalendarX className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="font-medium text-amber-900">This day is blocked.</p>
              <p className="text-amber-800/80">
                {blocked?.reason || 'Customers cannot place new bookings for this date.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isWorkingDay && !isBlocked && (
        <Card className="mb-4 border-slate-200 bg-slate-50/60">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <Coffee className="mt-0.5 h-5 w-5 text-slate-600" />
            <div>
              <p className="font-medium text-slate-900">Not a working day.</p>
              <p className="text-slate-700/80">
                This day of the week is off per Settings. Existing bookings (if any) are still shown.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {slots.map((slot) => {
              const slotBookings = bookingsBySlot.get(slot) ?? [];
              const endLabel = minutesToTime(timeToMinutes(slot) + slotDuration);
              return (
                <li key={slot} className="grid grid-cols-[120px_1fr] gap-4 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatTimeLabel(slot)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      to {formatTimeLabel(endLabel)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {slotBookings.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">Open</p>
                    ) : (
                      <ul className="space-y-2">
                        {slotBookings.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              className="block rounded-lg border bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                            >
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-mono text-xs font-semibold text-brand-700">
                                  {b.reference_code}
                                </span>
                                <StatusBadge status={b.status} />
                                <span className="text-sm font-medium">
                                  {b.customer_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {b.customer_phone}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-foreground/80">
                                {b.service?.name ?? '—'} · {b.pickup_city} → {b.dropoff_city}
                                <span className="text-xs text-muted-foreground">
                                  {' · '}
                                  {b.duration_hours}h
                                </span>
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
            {slots.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">
                Working hours have no slots in them. Check Settings.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
