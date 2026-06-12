// Server-side OTP verification against the email_otps table. Shared by
// /api/bookings/my and /api/bookings/cancel (the dedicated verify route
// inlines the same flow to return richer attempt feedback).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { OtpPurpose } from '@/lib/otp';
import {
  codeMatches,
  hasAttemptsLeft,
  isOtpExpired,
  OTP_CONFIG,
} from '@/lib/otp';

export type OtpCheckResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Validates `code` against the newest unconsumed OTP for (email, any of
 * `purposes`) and consumes it on success. Wrong codes burn an attempt.
 */
export async function verifyAndConsumeOtp(
  supabase: SupabaseClient<Database>,
  email: string,
  code: string,
  purposes: OtpPurpose[],
): Promise<OtpCheckResult> {
  const { data: row, error } = await supabase
    .from('email_otps')
    .select('id, attempts, expires_at, consumed_at, created_at, code_hash')
    .eq('email', email)
    .in('purpose', purposes)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: 'lookup_failed' };
  if (!row) return { ok: false, status: 400, error: 'no_code' };
  if (isOtpExpired(row)) return { ok: false, status: 400, error: 'code_expired' };
  if (!hasAttemptsLeft(row)) {
    return { ok: false, status: 429, error: 'too_many_attempts' };
  }

  if (!codeMatches(code, email, row.code_hash)) {
    const attempts = row.attempts + 1;
    await supabase.from('email_otps').update({ attempts }).eq('id', row.id);
    return {
      ok: false,
      status: attempts >= OTP_CONFIG.maxAttempts ? 429 : 400,
      error: 'invalid_code',
    };
  }

  const { error: consumeErr } = await supabase
    .from('email_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('consumed_at', null);
  if (consumeErr) return { ok: false, status: 500, error: 'verify_failed' };

  return { ok: true };
}
