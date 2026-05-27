import { notFound } from 'next/navigation';
import { BookingDetail } from '@/components/admin/BookingDetail';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service:services(name, slug)')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();

  return <BookingDetail booking={data} />;
}
