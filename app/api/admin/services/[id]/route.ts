import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { Database } from '@/types/database';

type ServiceUpdate = Database['public']['Tables']['services']['Update'];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    description: z.string().trim().min(10).max(2000).optional(),
    short_description: z.string().trim().min(10).max(200).optional(),
    base_price: z.number().int().nonnegative().nullable().optional(),
    duration_hours: z.number().int().positive().max(72).optional(),
    icon_name: z.string().trim().min(1).max(40).optional(),
    display_order: z.number().int().nonnegative().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'nothing_to_update' });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data as ServiceUpdate;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('services')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ service: data });
}
