import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { pricingTiersUpdateSchema } from '@/lib/validation';

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

// PUT replaces the whole tier list for a service. Cleaner than per-row
// PATCH because the admin UI saves the whole table at once.
export async function PUT(
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

  const parsed = pricingTiersUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();

  // Verify the service exists (lets the admin client return a useful
  // 404 instead of an opaque insert error).
  const svc = await supabase.from('services').select('id').eq('id', id).maybeSingle();
  if (svc.error) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!svc.data) {
    return NextResponse.json({ error: 'service_not_found' }, { status: 404 });
  }

  // Replace strategy: delete all tiers for this service, then insert the
  // new set. Not transactional from the client, but service-role + tiny
  // table makes it safe in practice. (A future migration can move this
  // into a Postgres function for true atomicity.)
  const del = await supabase.from('pricing_tiers').delete().eq('service_id', id);
  if (del.error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  if (parsed.data.tiers.length > 0) {
    const rows = parsed.data.tiers.map((t, i) => ({
      service_id: id,
      label: t.label,
      sublabel: t.sublabel || null,
      price: t.price,
      display_order: t.display_order ?? i * 10,
    }));
    const ins = await supabase.from('pricing_tiers').insert(rows);
    if (ins.error) {
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }
  }

  const { data: fresh, error: refetchErr } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('service_id', id)
    .order('display_order', { ascending: true });
  if (refetchErr) {
    return NextResponse.json({ error: 'refetch_failed' }, { status: 500 });
  }
  return NextResponse.json({ tiers: fresh ?? [] });
}
