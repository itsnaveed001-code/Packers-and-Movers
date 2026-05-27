import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, and dashes only'),
  description: z.string().trim().min(10).max(2000),
  short_description: z.string().trim().min(10).max(200),
  base_price: z.number().int().nonnegative().nullable(),
  duration_hours: z.number().int().positive().max(72),
  icon_name: z.string().trim().min(1).max(40),
  display_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('services')
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      short_description: parsed.data.short_description,
      base_price: parsed.data.base_price,
      duration_hours: parsed.data.duration_hours,
      icon_name: parsed.data.icon_name,
      display_order: parsed.data.display_order ?? 0,
      is_active: parsed.data.is_active ?? true,
    })
    .select('*')
    .single();
  if (error) {
    const status = error.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ service: data }, { status: 201 });
}
