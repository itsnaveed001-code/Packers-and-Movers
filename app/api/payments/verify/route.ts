import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { paymentVerifySchema } from '@/lib/validation';
import { verifyCheckoutSignature } from '@/lib/razorpay';
import { confirmPaidOrder } from '@/lib/paymentsServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Step 2 of the paid booking flow: Razorpay Checkout hands the browser
// {order_id, payment_id, signature} on success; we accept it only when
// the HMAC signature (keyed by our secret) proves Razorpay produced it.
// The booking is then created from the payload parked at order time.
// The payment.captured webhook performs the same confirmation server-to-
// server, so a lost browser callback still results in a booking.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = paymentVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'payments_disabled' }, { status: 503 });
  }

  if (
    !verifyCheckoutSignature(
      {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
      secret,
    )
  ) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const result = await confirmPaidOrder(supabase, {
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { ok: true, reference_code: result.referenceCode },
    { status: result.created ? 201 : 200 },
  );
}
