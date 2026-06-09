import { format, parseISO, startOfWeek, addWeeks, isBefore } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { ReportsToolbar } from '@/components/admin/ReportsToolbar';
import { WeeklyBarChart } from '@/components/admin/WeeklyBarChart';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type BookingRow = {
  id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  booking_date: string;
  final_price: number | null;
  payment_received: boolean;
  service: { name: string } | null;
};

function isValidDate(s: string | undefined): s is string {
  return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}

function defaultRange() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}

function bucketByWeek(rows: BookingRow[], from: string, to: string) {
  const start = startOfWeek(parseISO(from), { weekStartsOn: 1 });
  const end = parseISO(to);
  const buckets: { label: string; count: number; revenue: number; startISO: string }[] = [];
  let cursor = start;
  while (isBefore(cursor, end) || cursor.getTime() === end.getTime()) {
    const startISO = cursor.toISOString().slice(0, 10);
    const next = addWeeks(cursor, 1);
    const inWeek = rows.filter((r) => {
      const d = parseISO(r.booking_date);
      return d.getTime() >= cursor.getTime() && d.getTime() < next.getTime();
    });
    const revenue = inWeek
      .filter((r) => r.status === 'completed' && r.final_price != null)
      .reduce((s, r) => s + (r.final_price ?? 0), 0);
    buckets.push({
      label: format(cursor, 'd MMM'),
      count: inWeek.length,
      revenue,
      startISO,
    });
    cursor = next;
  }
  return buckets;
}

function topServices(rows: BookingRow[]) {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const r of rows) {
    const key = r.service?.name ?? 'Unknown';
    const cur = map.get(key) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    if (r.status === 'completed' && r.final_price != null) {
      cur.revenue += r.final_price;
    }
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, 6);
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const fallback = defaultRange();
  const from = isValidDate(sp.from) ? sp.from : fallback.from;
  const to = isValidDate(sp.to) ? sp.to : fallback.to;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('bookings')
    .select(
      'id, status, booking_date, final_price, payment_received, service:services(name)',
    )
    .gte('booking_date', from)
    .lte('booking_date', to)
    .order('booking_date', { ascending: true });

  const rows = (data ?? []) as BookingRow[];

  const completed = rows.filter((r) => r.status === 'completed');
  const revenue = completed
    .filter((r) => r.final_price != null)
    .reduce((s, r) => s + (r.final_price ?? 0), 0);
  const completedWithPrice = completed.filter((r) => r.final_price != null);
  const avgTicket =
    completedWithPrice.length > 0
      ? Math.round(revenue / completedWithPrice.length)
      : 0;
  const completedCount = completed.length;
  const paidCount = completed.filter((r) => r.payment_received).length;
  const paidPct =
    completedCount > 0 ? Math.round((paidCount / completedCount) * 100) : 0;
  const cancelledCount = rows.filter((r) => r.status === 'cancelled').length;

  const weeks = bucketByWeek(rows, from, to);
  const topByService = topServices(rows);
  const totalRevenueAllServices = topByService.reduce((s, x) => s + x.revenue, 0);

  return (
    <div className="container max-w-6xl py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          {format(parseISO(from), 'd MMM yyyy')} – {format(parseISO(to), 'd MMM yyyy')} ·{' '}
          {rows.length} booking{rows.length === 1 ? '' : 's'} in range
        </p>
      </header>

      <ReportsToolbar from={from} to={to} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Bookings (completed)"
          value={String(completedCount)}
          sub={cancelledCount > 0 ? `${cancelledCount} cancelled` : undefined}
        />
        <Stat label="Revenue" value={formatINR(revenue)} sub="From completed jobs" />
        <Stat
          label="Average ticket"
          value={avgTicket > 0 ? formatINR(avgTicket) : '—'}
          sub={
            completedWithPrice.length > 0
              ? `Across ${completedWithPrice.length} priced jobs`
              : 'No prices recorded yet'
          }
        />
        <Stat
          label="Payment received"
          value={`${paidPct}%`}
          sub={`${paidCount} of ${completedCount} completed`}
          variant={paidPct >= 80 ? 'emerald' : paidPct >= 50 ? 'amber' : 'rose'}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Bookings per week</h2>
            <p className="text-xs text-muted-foreground">
              Bars sized to highest week in range
            </p>
          </div>
          <WeeklyBarChart weeks={weeks} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Top services</h2>
          {topByService.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bookings in this range.
            </p>
          ) : (
            <ul className="space-y-3">
              {topByService.map((s) => {
                const pct =
                  totalRevenueAllServices > 0
                    ? Math.round((s.revenue / totalRevenueAllServices) * 100)
                    : 0;
                return (
                  <li key={s.name}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">
                        {s.count} job{s.count === 1 ? '' : 's'} ·{' '}
                        {formatINR(s.revenue)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-brand-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  variant,
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: 'emerald' | 'amber' | 'rose';
}) {
  const valueColor =
    variant === 'emerald'
      ? 'text-emerald-700'
      : variant === 'amber'
        ? 'text-amber-700'
        : variant === 'rose'
          ? 'text-rose-700'
          : 'text-foreground';
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
