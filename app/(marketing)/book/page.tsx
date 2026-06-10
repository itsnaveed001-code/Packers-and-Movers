import { Suspense } from 'react';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getActiveServices } from '@/lib/queries';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Book your move',
  description:
    'Book your packers and movers slot online. Choose your service, date, time, and we will call you within 2 hours to confirm.',
  path: '/book',
});

export const dynamic = 'force-dynamic';

type Availability = {
  workingDays: number[];
  advanceBookingDays: number;
  blockedDates: string[];
};

const DEFAULT_AVAILABILITY: Availability = {
  workingDays: [1, 2, 3, 4, 5, 6],
  advanceBookingDays: 60,
  blockedDates: [],
};

async function getAvailability(): Promise<Availability> {
  // Never let a Supabase/env failure crash the whole /book route. If the
  // database is unreachable we fall back to sensible defaults; the page then
  // degrades gracefully instead of throwing a server-side exception.
  try {
    const supabase = createSupabaseAdminClient();
    const [settingsRes, blockedRes] = await Promise.all([
      supabase.from('availability_settings').select('*').maybeSingle(),
      supabase
        .from('blocked_dates')
        .select('date')
        .gte('date', new Date().toISOString().slice(0, 10)),
    ]);
    return {
      workingDays: settingsRes.data?.working_days ?? DEFAULT_AVAILABILITY.workingDays,
      advanceBookingDays:
        settingsRes.data?.advance_booking_days ?? DEFAULT_AVAILABILITY.advanceBookingDays,
      blockedDates: (blockedRes.data ?? []).map((b) => b.date),
    };
  } catch (err) {
    console.error('[book] getAvailability failed, using defaults:', err);
    return DEFAULT_AVAILABILITY;
  }
}

export default async function BookPage() {
  const [services, availability] = await Promise.all([
    getActiveServices(),
    getAvailability(),
  ]);

  return (
    <section className="bg-secondary/40 py-8 sm:py-12">
      <div className="container">
        <div className="mx-auto mb-6 max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book your move</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Five quick steps. No payment now — pay on the day of service.
          </p>
        </div>
        {services.length === 0 ? (
          <p className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Booking is temporarily unavailable. Please call or WhatsApp us instead.
          </p>
        ) : (
          <Suspense
            fallback={
              <p className="mx-auto max-w-3xl text-center text-sm text-muted-foreground">
                Loading…
              </p>
            }
          >
            <BookingFlow services={services} availability={availability} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
