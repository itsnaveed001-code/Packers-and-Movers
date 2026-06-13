import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { invoiceTokenSchema } from '@/lib/validation';
import {
  loadInvoiceByToken,
  recordRazorpayOrderOnInvoice,
} from '@/lib/invoicesServer';
import { createDepositOrder, paymentsEnabled } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/invoice/[token]/pay
//
// Creates a Razorpay order for the invoice amount and stamps the order
// id on the invoice row. The amount is the authoritative value in
// `invoices.amount_paise` — the client never supplies it, so a tampered
// caller can't get charged less.
//
// Idempotent for the customer: hitting the endpoint twice on a sent
// invoice creates a second order, but only one can ever succeed (the
// webhook flips status to 'paid' atomically). Paid / cash_received
// invoices return 409 so a stale tab can't accidentally double-charge.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!paymentsEnabled()) {
    return NextResponse.json({ error: 'payments_disabled' }, { status: 503 });
  }

  const { token } = await params;
  const tokenParse = invoiceTokenSchema.safeParse(token);
  if (!tokenParse.success) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const data = await loadInvoiceByToken(supabase, tokenParse.data);
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (data.status === 'paid') {
    return NextResponse.json({ error: 'already_paid' }, { status: 409 });
  }
  if (data.status === 'cash_received') {
    return NextResponse.json({ error: 'cash_received' }, { status: 409 });
  }
  if (data.amount_paise <= 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  // Razorpay receipts cap at 40 chars; same shape as deposits (dep_…) so
  // ops can tell deposits and invoices apart at a glance.
  const receipt = `inv_${randomUUID().replace(/-/g, '').slice(0, 32)}`;
  const order = await createDepositOrder({
    amountPaise: data.amount_paise,
    receipt,
    notes: {
      purpose: 'invoice_payment',
      invoice_id: data.id,
      booking_reference: data.booking.reference_code,
    },
  });
  if (!order) {
    return NextResponse.json({ error: 'order_create_failed' }, { status: 502 });
  }

  const stamp = await recordRazorpayOrderOnInvoice(supabase, data.id, order.orderId);
  if (!stamp.ok) {
    return NextResponse.json({ error: 'order_store_failed' }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      order_id: order.orderId,
      amount_paise: data.amount_paise,
      currency: 'INR',
    },
    { status: 201 },
  );
}
