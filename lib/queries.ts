import { createSupabaseAdminClient } from './supabase/admin';
import type { Service } from '@/types/database';

// These are public read queries called from server components and the
// sitemap/generateStaticParams (which run outside a request scope at build
// time, so the cookies()-based server client doesn't work). Service-role
// is fine here because we filter to is_active = true anyway.

export async function getActiveServices(): Promise<Service[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) {
      console.error('[queries] getActiveServices:', error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('[queries] getActiveServices threw:', err);
    return [];
  }
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) {
      console.error('[queries] getServiceBySlug:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[queries] getServiceBySlug threw:', err);
    return null;
  }
}
