import { notFound } from 'next/navigation';
import { AdminInvoiceSection } from '@/components/admin/AdminInvoiceSection';
import { BookingDetail } from '@/components/admin/BookingDetail';
import { BookingTimeline } from '@/components/admin/BookingTimeline';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildPayUrl } from '@/lib/invoicesServer';
import type { BookingEvent, Invoice } from '@/types/database';

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
  const [bookingRes, eventsRes, invoiceRes] = await Promise.all([
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
    supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (bookingRes.error || !bookingRes.data) notFound();

  const events = (eventsRes.data ?? []) as BookingEvent[];
  const invoice = (invoiceRes.data ?? null) as Invoice | null;
  const payUrl = invoice ? buildPayUrl(invoice.payment_token) : null;

  return (
    <>
      <BookingDetail booking={bookingRes.data} />
      <div className="container max-w-4xl space-y-6 pb-12">
        <AdminInvoiceSection bookingId={id} invoice={invoice} payUrl={payUrl} />
        <BookingTimeline events={events} />
      </div>
    </>
  );
}
