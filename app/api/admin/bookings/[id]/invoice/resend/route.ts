import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendInvoiceEmail, touchInvoiceSentAt } from '@/lib/invoicesServer';

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

// POST /api/admin/bookings/[id]/invoice/resend
//
// Re-sends the existing invoice email without touching line items or
// status. Only operates on `sent` invoices — refusing on paid /
// cash_received avoids confusing the customer with a chase email for
// money they've already settled.
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
    .select(
      `
      *,
      booking:bookings!inner(
        id,
        reference_code,
        booking_date,
        booking_time,
        customer_name,
        customer_email,
        pickup_city,
        dropoff_city,
        service:services(name)
      )
      `,
    )
    .eq('booking_id', bookingId)
    .eq('status', 'sent')
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: 'no_sent_invoice' }, { status: 404 });
  }

  await touchInvoiceSentAt(supabase, invoice.id);
  // Drop the booking join nested key — sendInvoiceEmail takes it separately.
  const { booking, ...rest } = invoice as typeof invoice & {
    booking: Parameters<typeof sendInvoiceEmail>[1];
  };
  sendInvoiceEmail(rest as Parameters<typeof sendInvoiceEmail>[0], booking);

  return NextResponse.json({ ok: true });
}
