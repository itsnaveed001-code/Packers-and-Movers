// Razorpay server wrapper — SDK client, order/refund calls, and HMAC
// signature checks. Server-only (node:crypto + secret keys); never
// import from client components. Policy knobs live in lib/paymentsPolicy.ts.
//
// Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
// When the key pair is missing the feature degrades gracefully: the
// wizard books without a deposit, exactly as before the feature.

import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID?.trim() || null;
}

function getRazorpayKeySecret(): string | null {
  return process.env.RAZORPAY_KEY_SECRET?.trim() || null;
}

export function getWebhookSecret(): string | null {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null;
}

let warnedDisabled = false;

/**
 * True when the Razorpay key pair is configured. False → deposit flow is
 * skipped and bookings are created directly (pre-payments behaviour).
 */
export function paymentsEnabled(): boolean {
  const enabled = Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
  if (!enabled && !warnedDisabled) {
    warnedDisabled = true;
    console.warn(
      '[payments] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — booking deposits are disabled; bookings are created without payment.',
    );
  }
  return enabled;
}

let cachedClient: Razorpay | null = null;

/** SDK client, or null when keys are missing. */
export function getRazorpayClient(): Razorpay | null {
  if (cachedClient) return cachedClient;
  const key_id = getRazorpayKeyId();
  const key_secret = getRazorpayKeySecret();
  if (!key_id || !key_secret) return null;
  cachedClient = new Razorpay({ key_id, key_secret });
  return cachedClient;
}

// ---------------------------------------------------------------------
// Signature verification. Pure w.r.t. the secret (passed in explicitly)
// so the self-test can assert valid/invalid signatures without env; the
// routes pass the env secrets.
// ---------------------------------------------------------------------

function hmacHex(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Checkout success handback: signature = HMAC_SHA256(order_id|payment_id,
 * key secret). Proves the payment Razorpay reported belongs to our order
 * and wasn't fabricated by the client.
 */
export function verifyCheckoutSignature(
  params: { orderId: string; paymentId: string; signature: string },
  secret: string,
): boolean {
  if (!params.orderId || !params.paymentId || !params.signature || !secret) {
    return false;
  }
  return safeEqualHex(
    hmacHex(`${params.orderId}|${params.paymentId}`, secret),
    params.signature,
  );
}

/** Webhook: X-Razorpay-Signature = HMAC_SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!rawBody || !signature || !secret) return false;
  return safeEqualHex(hmacHex(rawBody, secret), signature);
}

// ---------------------------------------------------------------------
// API calls. Thin wrappers that never throw — routes branch on null.
// ---------------------------------------------------------------------

/**
 * Creates the deposit order. `amountPaise` must come from
 * getDepositAmountPaise() — never from the client.
 */
export async function createDepositOrder(opts: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ orderId: string } | null> {
  const client = getRazorpayClient();
  if (!client) return null;
  try {
    const order = await client.orders.create({
      amount: opts.amountPaise,
      currency: 'INR',
      receipt: opts.receipt,
      ...(opts.notes ? { notes: opts.notes } : {}),
    });
    return { orderId: order.id };
  } catch (err) {
    console.error('[payments] order create failed:', err);
    return null;
  }
}

/**
 * Full refund of a captured payment. Omitting `amountPaise` refunds the
 * whole captured amount (Razorpay default). Returns the refund id, or
 * null on failure — callers flag refund_failed and keep going.
 */
export async function refundPaymentFull(opts: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
}): Promise<{ refundId: string } | null> {
  const client = getRazorpayClient();
  if (!client) return null;
  try {
    const refund = await client.payments.refund(opts.paymentId, {
      ...(opts.amountPaise ? { amount: opts.amountPaise } : {}),
      speed: 'normal',
      ...(opts.notes ? { notes: opts.notes } : {}),
    });
    return { refundId: refund.id };
  } catch (err) {
    console.error('[payments] refund failed:', err);
    return null;
  }
}
