import { NextResponse, type NextRequest } from 'next/server';
import { contactFormSchema } from '@/lib/validation';
import { BUSINESS } from '@/lib/constants';
import { sendEmail } from '@/lib/email/send';
import { contactFormEmail } from '@/lib/email/templates';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Persist to contact_submissions so the admin inbox always has the
  // message — even if email delivery later fails. We do this BEFORE
  // sending email so a row exists even on email outage.
  try {
    const supabase = createSupabaseAdminClient();
    const { error: insertErr } = await supabase
      .from('contact_submissions')
      .insert({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message: parsed.data.message,
      });
    if (insertErr) {
      console.error('[contact] supabase insert failed:', insertErr);
      // Don't fail the request — email is the customer-visible path.
      // Log and continue.
    }
  } catch (err) {
    console.error('[contact] supabase insert threw:', err);
  }

  const adminEmail = process.env.ADMIN_EMAIL || BUSINESS.email;

  const t = contactFormEmail(parsed.data);
  const sent = await sendEmail({
    to: adminEmail,
    subject: t.subject,
    html: t.html,
    replyTo: parsed.data.email,
  });

  // Email might fail in dev (no SMTP) — but the row is already saved, so
  // the admin can still see the submission. Only treat as hard error if
  // email AND insert both broke. (Simplest: surface email failure to the
  // user so they know their message may not have arrived.)
  if (!sent) {
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
