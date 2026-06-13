import { BUSINESS } from '@/lib/constants';
import { formatTimeLabel } from '@/lib/utils';

const BRAND = '#21396a';
const BG = '#f1f5f9';
const TEXT = '#0f172a';
const MUTED = '#64748b';

function shell(inner: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px 12px;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <tr><td style="background:${BRAND};padding:20px 24px;color:#ffffff;font-size:18px;font-weight:600;">${BUSINESS.name}</td></tr>
    <tr><td style="padding:24px;">${inner}</td></tr>
    <tr><td style="padding:16px 24px;background:${BG};color:${MUTED};font-size:12px;text-align:center;">
      ${BUSINESS.name} · ${BUSINESS.phone} · <a href="${BUSINESS.siteUrl}" style="color:${BRAND};text-decoration:none;">${BUSINESS.domain}</a>
    </td></tr>
  </table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:8px 0;color:${MUTED};font-size:13px;width:140px;vertical-align:top;">${label}</td><td style="padding:8px 0;font-size:14px;color:${TEXT};">${value}</td></tr>`;
}

export type BookingEmailData = {
  reference_code: string;
  service_name: string;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  pickup_address: string;
  pickup_city: string;
  pickup_pincode: string;
  dropoff_address: string;
  dropoff_city: string;
  dropoff_pincode: string;
  notes?: string | null;
  /** Online deposit captured via Razorpay; null/absent = no deposit taken. */
  deposit?: { amountInr: number; paymentId: string } | null;
};

function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Variables for the Brevo "new booking" admin template. Keys map to
 * {{ params.KEY }} tokens in the hosted template — keep them in sync with
 * the template content in Brevo.
 */
export function bookingTemplateParams(data: BookingEmailData): Record<string, string> {
  return {
    REFERENCE: data.reference_code,
    SERVICE: data.service_name,
    DATE: formatDate(data.booking_date),
    TIME: formatTimeLabel(data.booking_time),
    CUSTOMER_NAME: data.customer_name,
    CUSTOMER_PHONE: data.customer_phone,
    CUSTOMER_EMAIL: data.customer_email,
    PICKUP: `${data.pickup_address}, ${data.pickup_city} - ${data.pickup_pincode}`,
    DROPOFF: `${data.dropoff_address}, ${data.dropoff_city} - ${data.dropoff_pincode}`,
    NOTES: data.notes && data.notes.trim() ? data.notes : '—',
    DEPOSIT: data.deposit
      ? `₹${data.deposit.amountInr} paid online (${data.deposit.paymentId})`
      : 'Not collected',
    ADMIN_URL: `${BUSINESS.siteUrl}/admin`,
  };
}

export function adminNotificationEmail(data: BookingEmailData): { subject: string; html: string } {
  const subject = `New booking — ${data.reference_code} — ${data.service_name} on ${formatDate(data.booking_date)}`;
  const adminUrl = `${BUSINESS.siteUrl}/admin`;
  const inner = `
    <h2 style="margin:0 0 4px;font-size:18px;color:${TEXT};">New booking received</h2>
    <p style="margin:0 0 16px;color:${MUTED};font-size:14px;">Reference <strong style="color:${TEXT};">${data.reference_code}</strong></p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e2e8f0;margin-top:8px;">
      ${row('Service', data.service_name)}
      ${row('Date', formatDate(data.booking_date))}
      ${row('Time', formatTimeLabel(data.booking_time))}
      ${row('Customer', data.customer_name)}
      ${row('Phone', `<a href="tel:${data.customer_phone}" style="color:${BRAND};">${data.customer_phone}</a>`)}
      ${row('Email', `<a href="mailto:${data.customer_email}" style="color:${BRAND};">${data.customer_email}</a>`)}
      ${row('Pickup', `${data.pickup_address}, ${data.pickup_city} – ${data.pickup_pincode}`)}
      ${row('Drop-off', `${data.dropoff_address}, ${data.dropoff_city} – ${data.dropoff_pincode}`)}
      ${data.notes ? row('Notes', data.notes) : ''}
      ${
        data.deposit
          ? row(
              'Deposit',
              `<strong>₹${data.deposit.amountInr} paid online</strong> · Razorpay payment <span style="font-family:'SF Mono',Menlo,monospace;">${data.deposit.paymentId}</span>`,
            )
          : ''
      }
    </table>

    <p style="margin:20px 0 0;">
      <a href="${adminUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:500;">View in admin</a>
    </p>
    <p style="margin:16px 0 0;color:${MUTED};font-size:13px;">Please call the customer within 2 hours to confirm.</p>
  `;
  return { subject, html: shell(inner) };
}

export function customerConfirmationEmail(data: BookingEmailData): {
  subject: string;
  html: string;
} {
  const subject = `Booking received — ${BUSINESS.name} (${data.reference_code})`;
  const inner = `
    <h2 style="margin:0 0 6px;font-size:18px;color:${TEXT};">Thank you, ${data.customer_name.split(' ')[0]}!</h2>
    <p style="margin:0 0 16px;color:${MUTED};font-size:14px;">We've received your booking request. Your reference code is:</p>

    <div style="text-align:center;background:${BG};border:1px dashed ${BRAND};border-radius:10px;padding:18px;margin:0 0 18px;">
      <div style="font-family:'SF Mono',Menlo,monospace;font-size:24px;font-weight:700;color:${BRAND};letter-spacing:1px;">${data.reference_code}</div>
    </div>

    <p style="margin:0 0 12px;font-size:14px;">
      <strong>What happens next:</strong> Our team will call you within 2 hours on
      <a href="tel:${data.customer_phone}" style="color:${BRAND};">${data.customer_phone}</a>
      to confirm your booking and walk you through the details.
    </p>

    ${
      data.deposit
        ? `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:12px 14px;margin:0 0 16px;font-size:14px;color:#065f46;">
      <strong>Deposit paid: ₹${data.deposit.amountInr}</strong> (Razorpay payment <span style="font-family:'SF Mono',Menlo,monospace;">${data.deposit.paymentId}</span>).<br/>
      Fully refundable if you cancel at least 12 hours before your slot.
    </div>`
        : ''
    }

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e2e8f0;margin-top:8px;">
      ${row('Service', data.service_name)}
      ${row('Date', formatDate(data.booking_date))}
      ${row('Time', formatTimeLabel(data.booking_time))}
      ${row('Pickup', `${data.pickup_city} – ${data.pickup_pincode}`)}
      ${row('Drop-off', `${data.dropoff_city} – ${data.dropoff_pincode}`)}
      ${data.deposit ? row('Deposit', `₹${data.deposit.amountInr} paid · refundable on cancellation ≥ 12 h before`) : ''}
    </table>

    <p style="margin:20px 0 0;font-size:14px;">
      Need to reach us sooner? Call
      <a href="tel:${BUSINESS.phone}" style="color:${BRAND};">${BUSINESS.phone}</a>
      or WhatsApp us at
      <a href="https://wa.me/${BUSINESS.whatsapp}" style="color:${BRAND};">+${BUSINESS.whatsapp}</a>.
    </p>
    <p style="margin:16px 0 0;color:${MUTED};font-size:12px;">Please save this email — we'll ask for your reference code.</p>
  `;
  return { subject, html: shell(inner) };
}

/**
 * Variables for the hosted Brevo OTP template (BREVO_OTP_TEMPLATE_ID).
 * Keys map to {{ params.KEY }} tokens — keep in sync with the template
 * content in Brevo. Mirrors bookingTemplateParams() above.
 */
export function otpTemplateParams(data: {
  name: string;
  code: string;
  expiryMinutes: number;
}): Record<string, string> {
  return {
    OTP: data.code,
    NAME: data.name?.trim() ? data.name.split(' ')[0] : 'there',
    EXPIRY: String(data.expiryMinutes),
  };
}

/**
 * Inline OTP email — fallback used when BREVO_OTP_TEMPLATE_ID is unset or
 * the Resend provider is active (Resend always sends raw HTML).
 */
export function otpEmail(data: {
  name: string;
  code: string;
  expiryMinutes: number;
}): { subject: string; html: string } {
  const firstName = data.name?.trim() ? data.name.split(' ')[0] : 'there';
  const subject = `Your ${BUSINESS.name} verification code is ${data.code}`;
  const inner = `
    <h2 style="margin:0 0 6px;font-size:18px;color:${TEXT};">Verify your booking</h2>
    <p style="margin:0 0 16px;color:${MUTED};font-size:14px;">Hi ${firstName}, use this code to confirm your move request. It keeps your slot reserved and lets our team reach you.</p>

    <div style="text-align:center;background:${BG};border:1px dashed ${BRAND};border-radius:10px;padding:18px;margin:0 0 18px;">
      <div style="font-family:'SF Mono',Menlo,monospace;font-size:30px;font-weight:700;color:${BRAND};letter-spacing:8px;">${data.code}</div>
    </div>

    <p style="margin:0 0 8px;font-size:14px;">This code expires in <strong>${data.expiryMinutes} minutes</strong>. Please don't share it with anyone.</p>
    <p style="margin:0;color:${MUTED};font-size:13px;">Didn't request this? You can safely ignore this email — no booking will be made.</p>
  `;
  return { subject, html: shell(inner) };
}

/**
 * Sent to the customer after a self-service cancellation. The refund
 * line reflects what actually happened to the deposit:
 *  - 'refunded'      → refund initiated, 5–7 working days
 *  - 'refund_failed' → we'll process it manually
 *  - null            → no deposit was taken, nothing to refund
 */
export function customerCancellationEmail(data: {
  reference_code: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  refund:
    | { status: 'refunded'; amountInr: number; refundId: string }
    | { status: 'refund_failed'; amountInr: number }
    | null;
}): { subject: string; html: string } {
  const subject = `Booking cancelled — ${BUSINESS.name} (${data.reference_code})`;
  const refundBlock =
    data.refund === null
      ? ''
      : data.refund.status === 'refunded'
        ? `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:12px 14px;margin:0 0 16px;font-size:14px;color:#065f46;">
      <strong>Deposit refund initiated: ₹${data.refund.amountInr}</strong><br/>
      Refund reference <span style="font-family:'SF Mono',Menlo,monospace;">${data.refund.refundId}</span>.
      It usually reaches your original payment method within 5–7 working days.
    </div>`
        : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;margin:0 0 16px;font-size:14px;color:#92400e;">
      <strong>Deposit refund (₹${data.refund.amountInr}) is being processed manually.</strong><br/>
      The automatic refund didn't go through, so our team will issue it by hand and
      confirm with you. No action is needed from your side.
    </div>`;

  const inner = `
    <h2 style="margin:0 0 6px;font-size:18px;color:${TEXT};">Booking cancelled</h2>
    <p style="margin:0 0 16px;color:${MUTED};font-size:14px;">
      Hi ${data.customer_name.split(' ')[0]}, your booking
      <strong style="color:${TEXT};">${data.reference_code}</strong> has been cancelled
      and the slot has been freed.
    </p>

    ${refundBlock}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e2e8f0;margin-top:8px;">
      ${row('Service', data.service_name)}
      ${row('Date', formatDate(data.booking_date))}
      ${row('Time', formatTimeLabel(data.booking_time))}
    </table>

    <p style="margin:20px 0 0;font-size:14px;">
      Plans changed again? You can always
      <a href="${BUSINESS.siteUrl}/book" style="color:${BRAND};">book a new move</a>
      or call us at <a href="tel:${BUSINESS.phone}" style="color:${BRAND};">${BUSINESS.phone}</a>.
    </p>
  `;
  return { subject, html: shell(inner) };
}

export type InvoiceEmailData = {
  reference_code: string;
  service_name: string | null;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM
  customer_name: string;
  /** Line items the admin entered, in rupees. */
  line_items: { description: string; amount_inr: number }[];
  /** Total in paise — authoritative; UI formats as ₹X. */
  amount_paise: number;
  notes: string | null;
  pay_url: string;
};

function formatRupeesFromPaise(paise: number): string {
  // Whole rupees with thousands separator. No decimal (admin enters
  // whole-rupee amounts; line totals are integer × 100).
  return Math.round(paise / 100).toLocaleString('en-IN');
}

/**
 * Variables for the Brevo "invoice" template. Keys map to {{ params.KEY }}
 * tokens — keep in sync with the hosted template. LINE_ITEMS is a single
 * pre-formatted HTML string to keep the template logic simple.
 */
export function invoiceTemplateParams(data: InvoiceEmailData): Record<string, string> {
  const itemsHtml = data.line_items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;font-size:14px;">${item.description}</td><td style="padding:6px 0;font-size:14px;text-align:right;">₹${item.amount_inr.toLocaleString('en-IN')}</td></tr>`,
    )
    .join('');
  return {
    REFERENCE: data.reference_code,
    SERVICE: data.service_name ?? '—',
    DATE: formatDate(data.booking_date),
    TIME: formatTimeLabel(data.booking_time),
    CUSTOMER_NAME: data.customer_name,
    TOTAL: `₹${formatRupeesFromPaise(data.amount_paise)}`,
    LINE_ITEMS_HTML: itemsHtml,
    NOTES: data.notes && data.notes.trim() ? data.notes : '',
    PAY_URL: data.pay_url,
  };
}

/**
 * Inline HTML fallback when BREVO_INVOICE_TEMPLATE_ID is unset. Same
 * shape as the booking confirmation email — line items table, total,
 * prominent Pay Now button. Resend always uses this (no template mode).
 */
export function invoiceEmail(data: InvoiceEmailData): { subject: string; html: string } {
  const firstName = data.customer_name?.trim() ? data.customer_name.split(' ')[0] : 'there';
  const subject = `Invoice for your move — ${data.reference_code}`;
  const itemsRows = data.line_items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:${TEXT};">${item.description}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:${TEXT};text-align:right;white-space:nowrap;">₹${item.amount_inr.toLocaleString('en-IN')}</td>
        </tr>`,
    )
    .join('');
  const inner = `
    <h2 style="margin:0 0 6px;font-size:18px;color:${TEXT};">Hi ${firstName},</h2>
    <p style="margin:0 0 16px;color:${MUTED};font-size:14px;">
      Here's the invoice for your move (reference
      <strong style="color:${TEXT};">${data.reference_code}</strong>).
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px;border-top:1px solid #e2e8f0;">
      ${row('Service', data.service_name ?? '—')}
      ${row('Date', formatDate(data.booking_date))}
      ${row('Time', formatTimeLabel(data.booking_time))}
    </table>

    <h3 style="margin:18px 0 8px;font-size:14px;color:${TEXT};text-transform:uppercase;letter-spacing:0.04em;">Items</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e2e8f0;">
      ${itemsRows}
      <tr>
        <td style="padding:12px 0 0;font-size:15px;color:${TEXT};font-weight:600;">Total</td>
        <td style="padding:12px 0 0;font-size:18px;color:${BRAND};font-weight:700;text-align:right;">₹${formatRupeesFromPaise(data.amount_paise)}</td>
      </tr>
    </table>

    ${
      data.notes && data.notes.trim()
        ? `<div style="margin:18px 0 0;background:${BG};border-radius:10px;padding:12px 14px;font-size:14px;color:${TEXT};white-space:pre-wrap;">${data.notes}</div>`
        : ''
    }

    <p style="margin:24px 0 0;text-align:center;">
      <a href="${data.pay_url}" style="display:inline-block;background:${BRAND};color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Pay ₹${formatRupeesFromPaise(data.amount_paise)} now</a>
    </p>
    <p style="margin:14px 0 0;color:${MUTED};font-size:12px;text-align:center;">
      Or open this link in your browser:<br/>
      <a href="${data.pay_url}" style="color:${BRAND};word-break:break-all;">${data.pay_url}</a>
    </p>
    <p style="margin:18px 0 0;color:${MUTED};font-size:13px;">
      Questions? Just reply to this email or call ${BUSINESS.phone}.
    </p>
  `;
  return { subject, html: shell(inner) };
}

export function contactFormEmail(data: {
  name: string;
  email: string;
  phone: string;
  message: string;
}): { subject: string; html: string } {
  const subject = `New enquiry from ${data.name}`;
  const inner = `
    <h2 style="margin:0 0 12px;font-size:18px;color:${TEXT};">New contact form submission</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${row('Name', data.name)}
      ${row('Phone', `<a href="tel:${data.phone}" style="color:${BRAND};">${data.phone}</a>`)}
      ${row('Email', `<a href="mailto:${data.email}" style="color:${BRAND};">${data.email}</a>`)}
      ${row('Message', data.message.replace(/\n/g, '<br/>'))}
    </table>
  `;
  return { subject, html: shell(inner) };
}
