import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { invoiceTokenSchema } from '@/lib/validation';
import { loadInvoiceByToken } from '@/lib/invoicesServer';
import { getRazorpayKeyId, paymentsEnabled } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/invoice/[token]
//
// Public read-only view for the customer payment page. Returns the
// minimum the page needs to render: invoice (status, amount, items,
// notes) + the booking summary (date, service, route). Razorpay public
// key id is included so the client can boot the Checkout modal without
// a second request. Customer email is intentionally NOT returned to
// avoid leaking the booking owner from a leaked link.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = invoiceTokenSchema.safeParse(token);
  if (!parsed.success) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const data = await loadInvoiceByToken(supabase, parsed.data);
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    invoice: {
      id: data.id,
      amount_paise: data.amount_paise,
      line_items: data.line_items,
      notes: data.notes,
      status: data.status,
      paid_at: data.paid_at,
      received_at: data.received_at,
    },
    booking: {
      reference_code: data.booking.reference_code,
      service_name: data.booking.service?.name ?? null,
      booking_date: data.booking.booking_date,
      booking_time: data.booking.booking_time,
      pickup_city: data.booking.pickup_city,
      dropoff_city: data.booking.dropoff_city,
      customer_name: data.booking.customer_name,
    },
    razorpay: paymentsEnabled()
      ? { enabled: true, key_id: getRazorpayKeyId() }
      : { enabled: false, key_id: null },
  });
}
