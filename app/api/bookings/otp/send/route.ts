import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { otpSendSchema } from '@/lib/validation';
import {
  OTP_CONFIG,
  generateCode,
  hashCode,
  resendWaitSeconds,
  underSendCap,
} from '@/lib/otp';
import { sendEmail } from '@/lib/email/send';
import { otpEmail, otpTemplateParams } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

// Sends a 6-digit OTP to the given email. Responses never reveal whether
// an email "exists" — every well-formed address gets the same treatment.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = otpSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { email, name, purpose } = parsed.data;
  const ip = clientIp(req);

  const supabase = createSupabaseAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Rate limits: resend cooldown + per-email and per-IP hourly caps.
  const [emailRows, ipCount] = await Promise.all([
    supabase
      .from('email_otps')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false }),
    ip
      ? supabase
          .from('email_otps')
          .select('id', { count: 'exact', head: true })
          .eq('ip', ip)
          .gte('created_at', oneHourAgo)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  if (emailRows.error || ipCount.error) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }

  const wait = resendWaitSeconds(emailRows.data?.[0]?.created_at ?? null);
  if (wait > 0) {
    return NextResponse.json(
      { error: 'cooldown', resendInSeconds: wait },
      { status: 429 },
    );
  }
  if (
    !underSendCap(emailRows.data?.length ?? 0, OTP_CONFIG.maxSendsPerEmailPerHour) ||
    !underSendCap(ipCount.count ?? 0, OTP_CONFIG.maxSendsPerIpPerHour)
  ) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterMinutes: 60 },
      { status: 429 },
    );
  }

  const code = generateCode();
  const expiresAt = new Date(
    Date.now() + OTP_CONFIG.expiryMinutes * 60 * 1000,
  ).toISOString();

  const { error: insertErr } = await supabase.from('email_otps').insert({
    email,
    code_hash: hashCode(code, email),
    purpose,
    expires_at: expiresAt,
    ip,
  });
  if (insertErr) {
    console.error('[otp/send] insert failed:', insertErr);
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }

  // Hosted Brevo template when configured; inline shell() fallback so OTP
  // still works without the env var (and on the Resend fallback provider).
  const displayName = name?.trim() || 'there';
  const fallback = otpEmail({
    name: displayName,
    code,
    expiryMinutes: OTP_CONFIG.expiryMinutes,
  });
  const templateIdRaw = process.env.BREVO_OTP_TEMPLATE_ID;
  const templateId = templateIdRaw ? Number.parseInt(templateIdRaw, 10) : NaN;

  const sent = await sendEmail({
    to: email,
    subject: fallback.subject,
    html: fallback.html,
    templateId: Number.isFinite(templateId) ? templateId : undefined,
    params: otpTemplateParams({
      name: displayName,
      code,
      expiryMinutes: OTP_CONFIG.expiryMinutes,
    }),
  });

  if (!sent) {
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    resendInSeconds: OTP_CONFIG.resendCooldownSeconds,
    expiresInMinutes: OTP_CONFIG.expiryMinutes,
  });
}
