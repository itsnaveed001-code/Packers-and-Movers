import { DepositSettings } from '@/components/admin/DepositSettings';
import { SettingsManager } from '@/components/admin/SettingsManager';
import { getDepositAmountInr } from '@/lib/appSettings';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AvailabilitySettings } from '@/types/database';

export const dynamic = 'force-dynamic';

const DEFAULTS: Omit<AvailabilitySettings, 'id' | 'updated_at'> = {
  working_days: [1, 2, 3, 4, 5, 6],
  working_hours_start: '09:00',
  working_hours_end: '19:00',
  slot_duration_minutes: 60,
  max_concurrent_bookings_per_slot: 1,
  advance_booking_days: 60,
  minimum_notice_hours: 24,
};

export default async function AdminSettingsPage() {
  const supabase = createSupabaseAdminClient();
  const [{ data }, depositInr] = await Promise.all([
    supabase.from('availability_settings').select('*').maybeSingle(),
    getDepositAmountInr(supabase),
  ]);

  const initial: AvailabilitySettings =
    data ?? { id: '', updated_at: new Date().toISOString(), ...DEFAULTS };

  return (
    <div className="container max-w-3xl space-y-6 py-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Operational knobs the booking flow reads at runtime — working
          hours, slot capacity, and the booking deposit shown to customers.
        </p>
      </header>
      <DepositSettings initialInr={depositInr} />
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Working hours &amp; slots
        </h2>
        <SettingsManager initial={initial} />
      </div>
    </div>
  );
}
