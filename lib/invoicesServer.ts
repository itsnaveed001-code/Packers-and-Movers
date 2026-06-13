// Invoice helpers — server-only. Token generation, line-item total math,
// insert + email orchestration, and webhook → status reducers. The
// admin routes call createOrResendInvoice; the public-pay route calls
// loadInvoiceForPayment + recordRazorpayOrder; the webhook calls
// markInvoicePaid.

import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Booking,
  Database,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
} from '@/types/database';
import type { CreateInvoiceInput } from '@/lib/validation';
import { BUSINESS } from '@/lib/constants';
import { sendEmail } from '@/lib/email/send';
import {
  invoiceEmail,
  invoiceTemplateParams,
  type InvoiceEmailData,
} from '@/lib/email/templates';

type Supabase = SupabaseClient<Database>;

/** 32 random bytes → 64 hex chars. Cryptographically unguessable. */
export function generateInvoiceToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Authoritative total in paise. Always derived from the parsed line items
 * server-side — never from anything the client supplied separately.
 */
export function computeInvoiceTotalPaise(items: InvoiceLineItem[]): number {
  return items.reduce((sum, item) => sum + item.amount_inr * 100, 0);
}

export type InvoiceWriteError =
  | 'booking_not_found'
  | 'booking_cancelled'
  | 'paid_invoice_exists'
  | 'insert_failed'
  | 'update_failed';

export type InvoiceWriteResult =
  | { ok: true; invoice: Invoice; resent: boolean }
  | { ok: false; error: InvoiceWriteError };

/**
 * Idempotently create-or-replace the active invoice for a booking.
 * If a sent (not-yet-paid) invoice exists, its line_items / amount /
 * notes are updated in place and `resent` is true. If the existing
 * invoice is paid or cash_received, the call is rejected — invoices
 * are not editable after money has been recorded.
 */
export async function createOrUpdateInvoice(
  supabase: Supabase,
  bookingId: string,
  data: CreateInvoiceInput,
): Promise<InvoiceWriteResult> {
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: 'booking_not_found' };
  if (booking.status === 'cancelled') {
    return { ok: false, error: 'booking_cancelled' };
  }

  const { data: existing } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .in('status', ['sent', 'paid', 'cash_received'])
    .maybeSingle();

  if (existing && (existing.status === 'paid' || existing.status === 'cash_received')) {
    return { ok: false, error: 'paid_invoice_exists' };
  }

  const amount_paise = computeInvoiceTotalPaise(data.line_items);
  const notes = data.notes && data.notes.trim() ? data.notes.trim() : null;

  if (existing) {
    const { data: updated, error } = await supabase
      .from('invoices')
      .update({
        line_items: data.line_items,
        notes,
        amount_paise,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error || !updated) return { ok: false, error: 'update_failed' };
    return { ok: true, invoice: updated as Invoice, resent: true };
  }

  const { data: inserted, error } = await supabase
    .from('invoices')
    .insert({
      booking_id: bookingId,
      amount_paise,
      line_items: data.line_items,
      notes,
      status: 'sent',
      payment_token: generateInvoiceToken(),
      sent_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error || !inserted) return { ok: false, error: 'insert_failed' };
  return { ok: true, invoice: inserted as Invoice, resent: false };
}

/** Bumps sent_at for the resend-email action. */
export async function touchInvoiceSentAt(
  supabase: Supabase,
  invoiceId: string,
): Promise<void> {
  await supabase
    .from('invoices')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', invoiceId);
}

/**
 * Admin override: mark the invoice as paid by cash. Idempotent — calling
 * twice doesn't move received_at backwards and won't overwrite a real
 * Razorpay paid status.
 */
export async function markInvoiceCashReceived(
  supabase: Supabase,
  invoiceId: string,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'cash_received', received_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .in('status', ['sent', 'cash_received']);
  return { ok: !error };
}

/**
 * Webhook side: mark the invoice paid in one update. Status guard so a
 * late payment.captured can't downgrade a cash_received → paid (admins
 * have already booked the offline payment) — that's a manual reconcile.
 */
export async function markInvoicePaidByOrder(
  supabase: Supabase,
  opts: { orderId: string; paymentId: string },
): Promise<{ ok: boolean; created: boolean }> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('razorpay_order_id', opts.orderId)
    .maybeSingle();
  if (!invoice) return { ok: false, created: false };
  if (invoice.status === 'paid') return { ok: true, created: false };
  if (invoice.status === 'cash_received') {
    console.warn(
      '[invoices] payment.captured for already cash_received invoice',
      invoice.id,
      '— reconcile manually',
    );
    return { ok: true, created: false };
  }
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      razorpay_payment_id: opts.paymentId,
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)
    .in('status', ['sent', 'draft']);
  return { ok: !error, created: !error };
}

/** Stamp the razorpay order on an invoice when /api/invoice/[token]/pay creates one. */
export async function recordRazorpayOrderOnInvoice(
  supabase: Supabase,
  invoiceId: string,
  orderId: string,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from('invoices')
    .update({ razorpay_order_id: orderId })
    .eq('id', invoiceId);
  return { ok: !error };
}

export type InvoiceWithBooking = Invoice & {
  booking: Pick<
    Booking,
    | 'id'
    | 'reference_code'
    | 'booking_date'
    | 'booking_time'
    | 'customer_name'
    | 'customer_email'
    | 'pickup_city'
    | 'dropoff_city'
  > & { service: { name: string } | null };
};

/**
 * Public payment-page lookup. Returns null on any missing piece — the
 * route then 404s without leaking why.
 */
export async function loadInvoiceByToken(
  supabase: Supabase,
  token: string,
): Promise<InvoiceWithBooking | null> {
  const { data, error } = await supabase
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
    .eq('payment_token', token)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as InvoiceWithBooking;
}

/** Status badge label shared by the admin UI and the customer page. */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Awaiting payment',
  paid: 'Paid online',
  cash_received: 'Cash received',
};

/**
 * Build the absolute payment-page URL the customer email links to.
 * Honors NEXT_PUBLIC_SITE_URL so previews/local dev hit the right host.
 */
export function buildPayUrl(token: string): string {
  const base = BUSINESS.siteUrl.replace(/\/$/, '');
  return `${base}/invoice/${token}`;
}

/**
 * Fire-and-forget invoice email. Never blocks or throws — failures are
 * logged. Mirrors sendBookingEmails (lib/bookingServer.ts): Brevo
 * template first when BREVO_INVOICE_TEMPLATE_ID is set, inline HTML
 * fallback otherwise.
 */
export function sendInvoiceEmail(
  invoice: Invoice,
  booking: InvoiceWithBooking['booking'],
): void {
  const data: InvoiceEmailData = {
    reference_code: booking.reference_code,
    service_name: booking.service?.name ?? null,
    booking_date: booking.booking_date,
    booking_time: booking.booking_time,
    customer_name: booking.customer_name,
    line_items: invoice.line_items,
    amount_paise: invoice.amount_paise,
    notes: invoice.notes,
    pay_url: buildPayUrl(invoice.payment_token),
  };
  void (async () => {
    try {
      const t = invoiceEmail(data);
      const templateIdRaw = process.env.BREVO_INVOICE_TEMPLATE_ID;
      const templateId = templateIdRaw ? Number.parseInt(templateIdRaw, 10) : NaN;
      await sendEmail({
        to: booking.customer_email,
        subject: t.subject,
        html: t.html,
        replyTo: process.env.ADMIN_EMAIL || BUSINESS.email,
        templateId: Number.isFinite(templateId) ? templateId : undefined,
        params: invoiceTemplateParams(data),
      });
    } catch (err) {
      console.error('[invoices] email dispatch failed:', err);
    }
  })();
}

/**
 * Re-fetch the joined invoice + booking after create/update so the email
 * helper has the customer name, service, etc. without the route having
 * to do a second round trip.
 */
export async function loadInvoiceWithBookingById(
  supabase: Supabase,
  invoiceId: string,
): Promise<InvoiceWithBooking | null> {
  const { data } = await supabase
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
    .eq('id', invoiceId)
    .maybeSingle();
  return (data as unknown as InvoiceWithBooking) ?? null;
}
