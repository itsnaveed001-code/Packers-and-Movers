import { createSupabaseAdminClient } from './supabase/admin';
import type {
  SiteSettings,
  ServiceArea,
  ContentBlock,
  HomeFeature,
  AboutValue,
  Testimonial,
  Faq,
  ServiceInclude,
  PricingTier,
  HomeFeatureSection,
} from '@/types/database';

// Server-side read helpers for CMS content. Mirrors the pattern in
// lib/queries.ts: every helper swallows errors and returns a safe
// fallback (empty list / null) so a transient DB hiccup never crashes
// the public site. Components that need a hard guarantee should fall
// back to lib/constants.ts.

// ---- site_settings ---------------------------------------------------

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('singleton', true)
      .maybeSingle();
    if (error) {
      console.error('[cms] getSiteSettings:', error);
      return null;
    }
    return data as SiteSettings | null;
  } catch (err) {
    console.error('[cms] getSiteSettings threw:', err);
    return null;
  }
}

// ---- service_areas ---------------------------------------------------

export async function getServiceAreas(): Promise<ServiceArea[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('service_areas')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) {
      console.error('[cms] getServiceAreas:', error);
      return [];
    }
    return (data ?? []) as ServiceArea[];
  } catch (err) {
    console.error('[cms] getServiceAreas threw:', err);
    return [];
  }
}

// ---- content_blocks --------------------------------------------------

export async function getContentBlock(
  page: string,
  key: string,
): Promise<ContentBlock | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('page', page)
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.error('[cms] getContentBlock:', error);
      return null;
    }
    return data as ContentBlock | null;
  } catch (err) {
    console.error('[cms] getContentBlock threw:', err);
    return null;
  }
}

export async function getContentBlocksForPage(
  page: string,
): Promise<Record<string, unknown>> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('content_blocks')
      .select('key, value')
      .eq('page', page);
    if (error) {
      console.error('[cms] getContentBlocksForPage:', error);
      return {};
    }
    const map: Record<string, unknown> = {};
    for (const row of data ?? []) {
      map[row.key as string] = (row as { value: unknown }).value;
    }
    return map;
  } catch (err) {
    console.error('[cms] getContentBlocksForPage threw:', err);
    return {};
  }
}

// ---- home_features ---------------------------------------------------

export async function getHomeFeatures(
  section: HomeFeatureSection,
): Promise<HomeFeature[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('home_features')
      .select('*')
      .eq('section', section)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) {
      console.error('[cms] getHomeFeatures:', error);
      return [];
    }
    return (data ?? []) as HomeFeature[];
  } catch (err) {
    console.error('[cms] getHomeFeatures threw:', err);
    return [];
  }
}

// ---- about_values ----------------------------------------------------

export async function getAboutValues(): Promise<AboutValue[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('about_values')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) {
      console.error('[cms] getAboutValues:', error);
      return [];
    }
    return (data ?? []) as AboutValue[];
  } catch (err) {
    console.error('[cms] getAboutValues threw:', err);
    return [];
  }
}

// ---- testimonials ---------------------------------------------------

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) {
      console.error('[cms] getTestimonials:', error);
      return [];
    }
    return (data ?? []) as Testimonial[];
  } catch (err) {
    console.error('[cms] getTestimonials threw:', err);
    return [];
  }
}

// ---- faqs (per service) ---------------------------------------------

export async function getServiceFaqs(serviceId: string): Promise<Faq[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) {
      console.error('[cms] getServiceFaqs:', error);
      return [];
    }
    return (data ?? []) as Faq[];
  } catch (err) {
    console.error('[cms] getServiceFaqs threw:', err);
    return [];
  }
}

// ---- service_includes -----------------------------------------------

export async function getServiceIncludes(
  serviceId: string,
): Promise<ServiceInclude[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('service_includes')
      .select('*')
      .eq('service_id', serviceId)
      .order('display_order', { ascending: true });
    if (error) {
      console.error('[cms] getServiceIncludes:', error);
      return [];
    }
    return (data ?? []) as ServiceInclude[];
  } catch (err) {
    console.error('[cms] getServiceIncludes threw:', err);
    return [];
  }
}

// ---- pricing_tiers ---------------------------------------------------

export async function getServicePricingTiers(
  serviceId: string,
): Promise<PricingTier[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('service_id', serviceId)
      .order('display_order', { ascending: true });
    if (error) {
      console.error('[cms] getServicePricingTiers:', error);
      return [];
    }
    return (data ?? []) as PricingTier[];
  } catch (err) {
    console.error('[cms] getServicePricingTiers threw:', err);
    return [];
  }
}

/**
 * Single source of truth for the "from ₹X" headline on a service.
 * Returns the lowest pricing-tier price (paise) for the service, or null
 * if the service has no tiers. Fixes the home-shifting pricing
 * contradiction (bug #2 in Six Phase Delivery Plan).
 */
export async function getServiceFromPrice(
  serviceId: string,
): Promise<number | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('price')
      .eq('service_id', serviceId)
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[cms] getServiceFromPrice:', error);
      return null;
    }
    return data?.price ?? null;
  } catch (err) {
    console.error('[cms] getServiceFromPrice threw:', err);
    return null;
  }
}
