import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { siteSettingsUpdateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('singleton', true)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
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

  const parsed = siteSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const p = parsed.data;

  // Map nullable empty strings → null for cleaner DB storage.
  const norm = <T>(v: T | '' | null | undefined): T | null =>
    v === '' || v == null ? null : v;

  const payload = {
    company_name: p.company_name,
    tagline: p.tagline,
    phone: p.phone,
    whatsapp: p.whatsapp,
    email: p.email,
    address: p.address,
    footer_text: norm(p.footer_text),
    business_hours: p.business_hours,
    social_links: p.social_links ?? {},
    map_mode: p.map_mode,
    map_query: norm(p.map_query),
    map_lat: p.map_lat ?? null,
    map_lng: p.map_lng ?? null,
    google_rating: p.google_rating ?? null,
    google_reviews_url: norm(p.google_reviews_url),
    insurance_badge_url: norm(p.insurance_badge_url),
    stat_moves_completed: norm(p.stat_moves_completed),
    stat_years_service: norm(p.stat_years_service),
  };

  const supabase = createSupabaseAdminClient();
  // site_settings is a singleton — find the existing row first.
  const existing = await supabase
    .from('site_settings')
    .select('id')
    .eq('singleton', true)
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from('site_settings')
      .update(payload)
      .eq('id', existing.data.id)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ settings: data });
  }

  const { data, error } = await supabase
    .from('site_settings')
    .insert({ ...payload, singleton: true })
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}
