import { Resend } from 'resend';
import { BUSINESS } from '@/lib/constants';

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  /**
   * Brevo transactional template id. When set (and Brevo is the active
   * provider), Brevo renders the hosted template with `params` instead of
   * using `subject` / `html`. The Resend fallback always uses `html`.
   */
  templateId?: number;
  /** Variables exposed to the Brevo template as {{ params.KEY }}. */
  params?: Record<string, unknown>;
};

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Brevo API keys come in a few shapes depending on where they're copied from:
 *  - raw:            "xkeysib-abc...".
 *  - base64-wrapped: base64 of {"api_key":"xkeysib-abc..."} (what the
 *                    Brevo dashboard "copy" button sometimes produces).
 *  - quoted / padded: surrounded by quotes or stray whitespace.
 * Normalise all of these down to the bare "xkeysib-..." string Brevo expects.
 */
function resolveBrevoKey(): string | null {
  let raw = process.env.BREVO_API_KEY?.trim();
  if (!raw) return null;
  // Strip a single layer of surrounding quotes, then re-trim.
  raw = raw.replace(/^["']|["']$/g, '').trim();
  if (!raw) return null;

  if (raw.startsWith('xkeysib-')) return raw;

  // Try to decode a base64-wrapped {"api_key":"..."} payload.
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as { api_key?: string };
    if (parsed?.api_key && parsed.api_key.startsWith('xkeysib-')) {
      return parsed.api_key.trim();
    }
  } catch {
    // not base64/JSON — fall through
  }

  // Last resort: hand back whatever non-empty string we have and let Brevo
  // reject it with a clear 401 (logged below) rather than silently no-op'ing.
  return raw;
}

let resendInstance: Resend | null = null;
function getResend(): Resend | null {
  if (resendInstance) return resendInstance;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendInstance = new Resend(key);
  return resendInstance;
}

function toRecipients(to: string | string[]): { email: string }[] {
  return (Array.isArray(to) ? to : [to])
    .map((e) => e.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

async function sendViaBrevo(payload: EmailPayload, apiKey: string): Promise<boolean> {
  // Sender must be a verified sender in your Brevo account. Defaults to the
  // business inbox; override with BREVO_SENDER_EMAIL / BREVO_SENDER_NAME.
  const senderEmail = process.env.BREVO_SENDER_EMAIL || BUSINESS.email;
  const senderName = process.env.BREVO_SENDER_NAME || BUSINESS.name;

  const useTemplate =
    typeof payload.templateId === 'number' && Number.isFinite(payload.templateId);

  // Template mode: Brevo supplies the subject + content from the hosted
  // template and fills {{ params.* }}. The sender comes from the template
  // config, so we don't override it. Raw mode: send our own subject + HTML.
  const body = useTemplate
    ? {
        templateId: payload.templateId,
        to: toRecipients(payload.to),
        ...(payload.params ? { params: payload.params } : {}),
        ...(payload.replyTo ? { replyTo: { email: payload.replyTo } } : {}),
      }
    : {
        sender: { name: senderName, email: senderEmail },
        to: toRecipients(payload.to),
        subject: payload.subject,
        htmlContent: payload.html,
        ...(payload.replyTo ? { replyTo: { email: payload.replyTo } } : {}),
      };

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[email] brevo error:', res.status, detail);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] brevo request failed:', err);
    return false;
  }
}

async function sendViaResend(payload: EmailPayload, resend: Resend): Promise<boolean> {
  const from = process.env.RESEND_FROM_EMAIL || `${BUSINESS.name} <onboarding@resend.dev>`;
  try {
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo,
    });
    if (error) {
      console.error('[email] resend error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] resend unexpected error:', err);
    return false;
  }
}

/**
 * Send a transactional email. Prefers Brevo (BREVO_API_KEY); falls back to
 * Resend (RESEND_API_KEY) if Brevo isn't configured.
 *
 * Returns true if sent (or no-op'd in dev); false on hard failure.
 * Never throws — callers should not fail their primary flow on email errors.
 *
 * Extension point: to add SMS later, wrap this function (e.g. sendNotification)
 * and dispatch to both the email provider + a Twilio/MSG91 sender.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const brevoKey = resolveBrevoKey();
  if (brevoKey) {
    return sendViaBrevo(payload, brevoKey);
  }

  const resend = getResend();
  if (resend) {
    return sendViaResend(payload, resend);
  }

  // No provider configured.
  if (process.env.NODE_ENV === 'production') {
    console.error('[email] no email provider configured (BREVO_API_KEY / RESEND_API_KEY) — email not sent', {
      to: payload.to,
      subject: payload.subject,
    });
    return false;
  }
  // Dev: just log so local flows don't fail.
  console.log('[email] (dev) would send:', {
    to: payload.to,
    subject: payload.subject,
  });
  return true;
}
