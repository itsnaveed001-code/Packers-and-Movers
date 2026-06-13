import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { markInvoiceCashReceived } from '@/lib/invoicesServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

// POST /api/admin/bookings/[id]/invoice/cash-received
//
// Admin override for offline payment. Sets status=cash_received and
// stamps received_at. Idempotent — calling twice on an already
// cash_received invoice succeeds without changing the timestamp
// monotonically backwards (the .in('status', […]) guard in the helper
// makes the SQL update a no-op on the second call).
//
// Does NOT call the Razorpay refund API — there's no online payment to
// touch. If the customer later pays online too, the webhook is rejected
// (status guard) and the duplicate has to be reconciled manually.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id: bookingId } = await params;
  if (!uuidRegex.test(bookingId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('booking_id', bookingId)
    .in('status', ['sent', 'cash_received'])
    .maybeSingle();
  if (!invoice) {
    return NextResponse.json({ error: 'no_sent_invoice' }, { status: 404 });
  }

  const result = await markInvoiceCashReceived(supabase, invoice.id);
  if (!result.ok) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
