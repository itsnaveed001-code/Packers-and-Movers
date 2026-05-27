import { AvailabilityManager } from '@/components/admin/AvailabilityManager';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AvailabilityPage() {
  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('blocked_dates')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true });

  return (
    <div className="container max-w-5xl py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground">
          Block dates when you're closed for holidays or capacity-out days.
        </p>
      </header>
      <AvailabilityManager initialBlocked={data ?? []} />
    </div>
  );
}
