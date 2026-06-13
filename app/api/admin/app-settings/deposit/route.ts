import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  DEPOSIT_MAX_INR,
  DEPOSIT_MIN_INR,
  getDepositAmountInr,
  setDepositAmountInr,
} from '@/lib/appSettings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Admin-only knob: the refundable deposit collected at booking time, in
// rupees. The DB stores the value in paise (app_settings table); this
// route is the only place rupees ↔ paise conversion happens at write
// time. The booking page SSR and POST /api/payments/order read the
// value via lib/appSettings.ts — clients never supply the amount.

async function requireAdmin() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

const bodySchema = z.object({
  deposit_inr: z
    .number()
    .int()
    .min(DEPOSIT_MIN_INR)
    .max(DEPOSIT_MAX_INR),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const deposit_inr = await getDepositAmountInr(supabase);
  return NextResponse.json({ deposit_inr });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const result = await setDepositAmountInr(supabase, parsed.data.deposit_inr);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === 'invalid_amount' ? 400 : 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    deposit_inr: Math.round(result.paise / 100),
  });
}
