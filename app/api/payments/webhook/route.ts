import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getWebhookSecret, verifyWebhookSignature } from '@/lib/razorpay';
import { confirmPaidOrder } from '@/lib/paymentsServer';
import { failedEventOutcome } from '@/lib/paymentsPolicy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Razorpay webhook — the source of truth for payment state. Exempt from
// the middleware same-origin POST guard (lib/apiGuard.ts): authenticity
// comes from the X-Razorpay-Signature HMAC over the raw body instead.
//
// Handled events (configure exactly these in the Razorpay dashboard):
//   payment.captured  → ensure the booking exists & is marked paid
//   payment.failed    → mark the staged order failed (never regresses paid)
//   refund.processed  → mark the booking refunded
// All handlers are idempotent — duplicate deliveries are safe — and we
// answer 200 for anything understood so Razorpay stops retrying.

const paymentEntitySchema = z.object({
  id: z.string().min(1),
  order_id: z.string().min(1),
});

const refundEntitySchema = z.object({
  id: z.string().min(1),
  payment_id: z.string().min(1),
});

const webhookEventSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({ entity: paymentEntitySchema }).optional(),
    refund: z.object({ entity: refundEntitySchema }).optional(),
  }),
});

export async function POST(req: NextRequest) {
  const secret = getWebhookSecret();
  if (!secret) {
    console.error(
      '[payments/webhook] RAZORPAY_WEBHOOK_SECRET not set — webhook rejected',
    );
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  // Signature is computed over the raw bytes — read before JSON parsing.
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = webhookEventSchema.safeParse(parsedJson);
  if (!parsed.success) {
    // Signed by Razorpay but not a shape we handle — acknowledge it.
    return NextResponse.json({ ok: true, ignored: true });
  }
  const { event, payload } = parsed.data;
  const supabase = createSupabaseAdminClient();

  if (event === 'payment.captured' && payload.payment) {
    const { id: paymentId, order_id: orderId } = payload.payment.entity;
    const result = await confirmPaidOrder(supabase, { orderId, paymentId });
    if (!result.ok && result.error !== 'order_not_found') {
      // Transient failure (e.g. DB hiccup): non-2xx makes Razorpay retry.
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      ...(result.ok
        ? { reference_code: result.referenceCode, created: result.created }
        : { ignored: true }),
    });
  }

  if (event === 'payment.failed' && payload.payment) {
    const { order_id: orderId } = payload.payment.entity;
    const { data: order } = await supabase
      .from('payment_orders')
      .select('id, status')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();
    const outcome = failedEventOutcome({
      found: Boolean(order),
      status: order?.status ?? 'created',
    });
    if (outcome === 'mark_failed' && order) {
      await supabase
        .from('payment_orders')
        .update({ status: 'failed' })
        .eq('id', order.id)
        .neq('status', 'paid');
    }
    return NextResponse.json({ ok: true, outcome });
  }

  if (event === 'refund.processed' && payload.refund) {
    const { id: refundId, payment_id: paymentId } = payload.refund.entity;
    // Authoritative: a processed refund marks the booking refunded even
    // if our cancel-time API call had failed (admin/manual refunds too).
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        payment_status: 'refunded',
        refund_id: refundId,
        refunded_at: new Date().toISOString(),
      })
      .eq('razorpay_payment_id', paymentId)
      .in('payment_status', ['paid', 'refund_failed', 'refunded']);
    if (updateErr) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Signed, valid, but an event type we don't act on.
  return NextResponse.json({ ok: true, ignored: true });
}
