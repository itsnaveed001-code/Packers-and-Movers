import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createVerifiedBookingSchema } from '@/lib/validation';
import { verifyVerificationToken } from '@/lib/otp';
import { validateBookingRequest } from '@/lib/bookingServer';
import { getDepositAmountPaise } from '@/lib/appSettings';
import { createDepositOrder, getRazorpayKeyId, paymentsEnabled } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Step 1 of the paid booking flow: validate the full booking payload
// (same checks as a direct booking, including the OTP email token),
// create a Razorpay order for the deposit, and park the validated
// payload in payment_orders. No booking exists yet — that happens only
// after the payment is verified (checkout handback or webhook).
//
// The amount is derived server-side from lib/paymentsPolicy.ts; nothing
// the client sends can change it.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = createVerifiedBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Same email-ownership proof as POST /api/bookings. The token stays
  // valid 15 minutes, so a failed/dismissed payment can retry (new order)
  // without redoing the OTP.
  if (
    !verifyVerificationToken(data.verification_token, data.customer_email, [
      'booking',
    ])
  ) {
    return NextResponse.json({ error: 'email_not_verified' }, { status: 401 });
  }

  if (!paymentsEnabled()) {
    // Wizard should be booking directly via POST /api/bookings.
    return NextResponse.json({ error: 'payments_disabled' }, { status: 503 });
  }

  const supabase = createSupabaseAdminClient();

  const validated = await validateBookingRequest(supabase, data);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, ...(validated.extra ?? {}) },
      { status: validated.status },
    );
  }

  const amountPaise = await getDepositAmountPaise(supabase);
  // Receipt: internal reference, unique, ≤ 40 chars.
  const receipt = `dep_${randomUUID().replace(/-/g, '').slice(0, 32)}`;
  const order = await createDepositOrder({
    amountPaise,
    receipt,
    notes: {
      purpose: 'booking_deposit',
      customer_email: validated.payload.customer_email.toLowerCase().slice(0, 256),
      booking_date: validated.payload.booking_date,
    },
  });
  if (!order) {
    return NextResponse.json({ error: 'order_create_failed' }, { status: 502 });
  }

  const { error: insertErr } = await supabase.from('payment_orders').insert({
    razorpay_order_id: order.orderId,
    amount_paise: amountPaise,
    currency: 'INR',
    status: 'created',
    customer_email: validated.payload.customer_email.toLowerCase(),
    booking_payload: validated.payload,
  });
  if (insertErr) {
    // Without the parked payload the payment could never become a
    // booking — refuse before anyone pays.
    console.error('[payments/order] payment_orders insert failed:', insertErr);
    return NextResponse.json({ error: 'order_store_failed' }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      order_id: order.orderId,
      amount_paise: amountPaise,
      currency: 'INR',
      key_id: getRazorpayKeyId(),
      deposit_inr: Math.round(amountPaise / 100),
    },
    { status: 201 },
  );
}
