// Server-side reader for the public.app_settings key/value store. Used
// by the booking page SSR and the payments routes to fetch knobs the
// admin can edit without a redeploy (deposit amount today; more later).
//
// Server-only: instantiates the service-role client. Never import from
// a client component. The pure fallback constants live in
// lib/paymentsPolicy.ts so the wizard's client bundle stays env-free
// when the DB read fails or the row is missing.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { DEPOSIT_AMOUNT_PAISE_FALLBACK } from '@/lib/paymentsPolicy';

type Supabase = SupabaseClient<Database>;

const DEPOSIT_KEY = 'deposit_amount_paise';

/** Bounds enforced both client- and server-side for the admin input. */
export const DEPOSIT_MIN_INR = 0;
export const DEPOSIT_MAX_INR = 5000;

function parsePaise(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Live deposit amount in paise. Falls back to the policy constant when:
 *   - the app_settings row is missing (migration 07 not yet run)
 *   - the value is malformed
 *   - the DB call errors
 *
 * Always called server-side. Clients receive the amount via SSR props.
 */
export async function getDepositAmountPaise(
  supabase?: Supabase,
): Promise<number> {
  const db = supabase ?? createSupabaseAdminClient();
  try {
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', DEPOSIT_KEY)
      .maybeSingle();
    if (error || !data) return DEPOSIT_AMOUNT_PAISE_FALLBACK;
    const paise = parsePaise(data.value);
    if (paise == null || paise < 0) return DEPOSIT_AMOUNT_PAISE_FALLBACK;
    return paise;
  } catch (err) {
    console.error('[appSettings] deposit lookup failed:', err);
    return DEPOSIT_AMOUNT_PAISE_FALLBACK;
  }
}

/**
 * Same lookup, converted to whole rupees for display in UI copy and
 * email subject lines. The DB stores paise so the math stays integer.
 */
export async function getDepositAmountInr(
  supabase?: Supabase,
): Promise<number> {
  return Math.round((await getDepositAmountPaise(supabase)) / 100);
}

/**
 * Admin save path: validates the new rupee value and upserts the row.
 * Returns the new paise value or an error code the route maps to 400/500.
 */
export async function setDepositAmountInr(
  supabase: Supabase,
  rupees: number,
): Promise<
  { ok: true; paise: number } | { ok: false; error: 'invalid_amount' | 'save_failed' }
> {
  if (!Number.isFinite(rupees) || !Number.isInteger(rupees)) {
    return { ok: false, error: 'invalid_amount' };
  }
  if (rupees < DEPOSIT_MIN_INR || rupees > DEPOSIT_MAX_INR) {
    return { ok: false, error: 'invalid_amount' };
  }
  const paise = rupees * 100;
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      { key: DEPOSIT_KEY, value: paise, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  if (error) {
    console.error('[appSettings] deposit save failed:', error);
    return { ok: false, error: 'save_failed' };
  }
  return { ok: true, paise };
}
