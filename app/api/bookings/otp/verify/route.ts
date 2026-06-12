import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { otpVerifySchema } from '@/lib/validation';
import {
  codeMatches,
  hasAttemptsLeft,
  isOtpExpired,
  issueVerificationToken,
  OTP_CONFIG,
} from '@/lib/otp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Verifies a 6-digit OTP against the newest unconsumed row for the
// email+purpose. On success the row is consumed and a short-lived signed
// token (bound to email + purpose) is returned.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { email, code, purpose } = parsed.data;

  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from('email_otps')
    .select('id, attempts, expires_at, consumed_at, created_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'no_code' }, { status: 400 });
  }
  if (isOtpExpired(row)) {
    return NextResponse.json({ error: 'code_expired' }, { status: 400 });
  }
  if (!hasAttemptsLeft(row)) {
    return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
  }

  // Re-fetch the stored hash only now (kept out of the first select so a
  // typo'd request never sees it — defense in depth, not strictly needed).
  const { data: hashRow, error: hashErr } = await supabase
    .from('email_otps')
    .select('code_hash')
    .eq('id', row.id)
    .single();
  if (hashErr || !hashRow) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }

  if (!codeMatches(code, email, hashRow.code_hash)) {
    const attempts = row.attempts + 1;
    await supabase.from('email_otps').update({ attempts }).eq('id', row.id);
    const remaining = Math.max(0, OTP_CONFIG.maxAttempts - attempts);
    return NextResponse.json(
      { error: 'invalid_code', attemptsRemaining: remaining },
      { status: remaining === 0 ? 429 : 400 },
    );
  }

  const { error: consumeErr } = await supabase
    .from('email_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('consumed_at', null);
  if (consumeErr) {
    return NextResponse.json({ error: 'verify_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    token: issueVerificationToken(email, purpose),
    tokenExpiresInMinutes: OTP_CONFIG.tokenTtlMinutes,
  });
}
