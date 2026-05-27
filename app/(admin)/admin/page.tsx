import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookingsTable } from '@/components/admin/BookingsTable';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function getStats() {
  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [todayRes, pendingRes, weekRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('booking_date', today)
      .neq('status', 'cancelled'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('booking_date', today)
      .lte('booking_date', weekFromNow)
      .neq('status', 'cancelled'),
  ]);

  return {
    today: todayRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    week: weekRes.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div className="container max-w-6xl py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          All bookings — newest first. Confirm pending ones by phone.
        </p>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Today" value={stats.today} />
        <Stat label="Pending" value={stats.pending} variant="amber" />
        <Stat label="Next 7 days" value={stats.week} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <BookingsTable initialFilter="today" />
        </TabsContent>
        <TabsContent value="upcoming">
          <BookingsTable initialFilter="upcoming" />
        </TabsContent>
        <TabsContent value="all">
          <BookingsTable initialFilter="all" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: 'amber';
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          variant === 'amber'
            ? 'mt-1 text-3xl font-bold text-amber-600'
            : 'mt-1 text-3xl font-bold text-foreground'
        }
      >
        {value}
      </p>
    </div>
  );
}
