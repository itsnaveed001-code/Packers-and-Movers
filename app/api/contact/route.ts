import { NextResponse, type NextRequest } from 'next/server';
import { contactFormSchema } from '@/lib/validation';
import { sendEmail } from '@/lib/email/send';
import { contactFormEmail } from '@/lib/email/templates';

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

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('[contact] ADMIN_EMAIL not set — message dropped');
    return NextResponse.json({ ok: true }); // don't leak config to user
  }

  const t = contactFormEmail(parsed.data);
  const sent = await sendEmail({
    to: adminEmail,
    subject: t.subject,
    html: t.html,
    replyTo: parsed.data.email,
  });

  if (!sent) {
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
