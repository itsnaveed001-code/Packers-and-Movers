import { SettingsManager } from '@/components/admin/SettingsManager';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AvailabilitySettings } from '@/types/database';

export const dynamic = 'force-dynamic';

const DEFAULTS: Omit<AvailabilitySettings, 'id'> = {
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
  const { data } = await supabase
    .from('availability_settings')
    .select('*')
    .maybeSingle();

  const initial = data ?? { id: '', ...DEFAULTS };

  return (
    <div className="container max-w-3xl py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Working hours &amp; slots</h1>
        <p className="text-sm text-muted-foreground">
          Controls the days, hours, and slot length customers see on the booking form.
        </p>
      </header>
      <SettingsManager initial={initial} />
    </div>
  );
}
