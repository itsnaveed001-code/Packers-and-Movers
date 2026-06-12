// OTP core — code generation, hashing, verification tokens, and the pure
// policy helpers the API routes use to enforce expiry / attempt / rate
// limits. Server-only (node:crypto); never import from client components.
//
// All knobs live in OTP_CONFIG below — change them there (or via the env
// vars noted inline).

import {
  createHash,
  createHmac,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

export const OTP_CONFIG = {
  /** Digits in the emailed code. */
  codeLength: 6,
  /** Minutes before an emailed code stops working. */
  expiryMinutes: 10,
  /** Wrong-code attempts allowed per issued code. */
  maxAttempts: 5,
  /** Seconds a customer must wait before requesting another code. */
  resendCooldownSeconds: 60,
  /** Max codes sent per email address per rolling hour. */
  maxSendsPerEmailPerHour: 5,
  /** Max codes sent per client IP per rolling hour. */
  maxSendsPerIpPerHour: 5,
  /** Minutes a verified-email token stays valid after OTP success. */
  tokenTtlMinutes: 15,
} as const;

export type OtpPurpose = 'booking' | 'cancel' | 'manage';

// ---------------------------------------------------------------------
// Secret resolution: BOOKING_OTP_SECRET, falling back to NEXTAUTH_SECRET
// then SUPABASE_SERVICE_ROLE_KEY so the feature works without new env.
// ---------------------------------------------------------------------
function getSecret(): string {
  const secret =
    process.env.BOOKING_OTP_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      'OTP secret missing: set BOOKING_OTP_SECRET (or NEXTAUTH_SECRET / SUPABASE_SERVICE_ROLE_KEY)',
    );
  }
  return secret;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** 6-digit numeric code from a CSPRNG, zero-padded ('042913'). */
export function generateCode(): string {
  const max = 10 ** OTP_CONFIG.codeLength;
  return randomInt(0, max).toString().padStart(OTP_CONFIG.codeLength, '0');
}

/** Salted SHA-256 of the code, bound to the email. Stored in email_otps.code_hash. */
export function hashCode(code: string, email: string): string {
  return createHash('sha256')
    .update(`${code}:${normalizeEmail(email)}:${getSecret()}`)
    .digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Constant-time check of a submitted code against a stored hash. */
export function codeMatches(code: string, email: string, storedHash: string): boolean {
  return safeEqualHex(hashCode(code, email), storedHash);
}

// ---------------------------------------------------------------------
// Verified-email token: base64url(payload).hmac — proves the holder
// completed an OTP for this email+purpose within the last 15 minutes.
// ---------------------------------------------------------------------
type TokenPayload = { e: string; p: OtpPurpose; x: number };

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function issueVerificationToken(
  email: string,
  purpose: OtpPurpose = 'booking',
  opts?: { now?: number; ttlMinutes?: number },
): string {
  const now = opts?.now ?? Date.now();
  const ttl = (opts?.ttlMinutes ?? OTP_CONFIG.tokenTtlMinutes) * 60_000;
  const payload: TokenPayload = {
    e: normalizeEmail(email),
    p: purpose,
    x: now + ttl,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Returns true only when the token's signature is valid, it has not
 * expired, the bound email matches, and the purpose is one of `purposes`.
 */
export function verifyVerificationToken(
  token: string,
  email: string,
  purposes: OtpPurpose[] = ['booking'],
  opts?: { now?: number },
): boolean {
  const now = opts?.now ?? Date.now();
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  if (!safeEqualHex(sign(encoded), sig)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as TokenPayload;
    if (typeof payload.x !== 'number' || payload.x < now) return false;
    if (payload.e !== normalizeEmail(email)) return false;
    return purposes.includes(payload.p);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// Pure policy helpers. The routes fetch rows; these decide. Kept pure so
// scripts/booking-integrity-selftest.ts can assert them without a DB.
// ---------------------------------------------------------------------
export type OtpRowLike = {
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export function isOtpExpired(row: OtpRowLike, now: number = Date.now()): boolean {
  return new Date(row.expires_at).getTime() <= now;
}

export function isOtpConsumed(row: OtpRowLike): boolean {
  return row.consumed_at !== null;
}

export function hasAttemptsLeft(row: OtpRowLike): boolean {
  return row.attempts < OTP_CONFIG.maxAttempts;
}

/** Seconds the caller must still wait before a resend (0 = can send now). */
export function resendWaitSeconds(
  lastCreatedAt: string | null,
  now: number = Date.now(),
): number {
  if (!lastCreatedAt) return 0;
  const elapsed = (now - new Date(lastCreatedAt).getTime()) / 1000;
  const wait = OTP_CONFIG.resendCooldownSeconds - elapsed;
  return wait > 0 ? Math.ceil(wait) : 0;
}

/** True when a send is allowed given how many went out in the last hour. */
export function underSendCap(recentCount: number, cap: number): boolean {
  return recentCount < cap;
}
