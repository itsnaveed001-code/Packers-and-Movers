import { Resend } from 'resend';
import { BUSINESS } from '@/lib/constants';

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

let resendInstance: Resend | null = null;
function getResend(): Resend | null {
  if (resendInstance) return resendInstance;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendInstance = new Resend(key);
  return resendInstance;
}

/**
 * Send a transactional email via Resend.
 * Returns true if sent (or no-op'd in dev); false on hard failure.
 * Never throws — callers should not fail their primary flow on email errors.
 *
 * Extension point: to add SMS later, wrap this function (e.g. sendNotification) and
 * dispatch to both Resend + a Twilio sender.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL || `${BUSINESS.name} <noreply@${BUSINESS.domain}>`;

  if (!resend) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[email] RESEND_API_KEY missing in production — email not sent', {
        to: payload.to,
        subject: payload.subject,
      });
      return false;
    }
    // Dev: just log
    console.log('[email] (dev) would send:', {
      from,
      to: payload.to,
      subject: payload.subject,
    });
    return true;
  }

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
    console.error('[email] unexpected error:', err);
    return false;
  }
}
