import { notFound } from 'next/navigation';
import { BookingDetail } from '@/components/admin/BookingDetail';
import { BookingTimeline } from '@/components/admin/BookingTimeline';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { BookingEvent } from '@/types/database';

export const dynamic = 'force-dynamic';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidRegex.test(id)) notFound();

  const supabase = createSupabaseAdminClient();
  const [bookingRes, eventsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, service:services(name, slug)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('booking_events')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (bookingRes.error || !bookingRes.data) notFound();

  const events = (eventsRes.data ?? []) as BookingEvent[];

  return (
    <>
      <BookingDetail booking={bookingRes.data} />
      <div className="container max-w-4xl pb-12">
        <BookingTimeline events={events} />
      </div>
    </>
  );
}
