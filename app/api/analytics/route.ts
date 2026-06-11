import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { FunnelEventType } from '@/types/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FUNNEL_TYPES: readonly FunnelEventType[] = [
  'site_visit',
  'service_viewed',
  'booking_started',
  'booking_step_completed',
  'booking_submitted',
  'booking_abandoned',
] as const;

const eventSchema = z.object({
  event_type: z.enum(FUNNEL_TYPES as unknown as [FunnelEventType, ...FunnelEventType[]]),
  session_id: z.string().min(8).max(64),
  service_slug: z.string().trim().max(60).optional().nullable(),
  step: z.number().int().min(1).max(20).optional().nullable(),
  payload: z.record(z.unknown()).optional(),
});

// Derive a coarse UA bucket (no fingerprinting, no version).
function uaSummary(ua: string | null): string | null {
  if (!ua) return null;
  const lower = ua.toLowerCase();
  if (lower.includes('android')) return 'android';
  if (lower.includes('iphone') || lower.includes('ipad')) return 'ios';
  if (lower.includes('mobile')) return 'mobile';
  if (lower.includes('windows')) return 'desktop-windows';
  if (lower.includes('mac os')) return 'desktop-mac';
  if (lower.includes('linux')) return 'desktop-linux';
  return 'other';
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ua = req.headers.get('user-agent');
  const country = req.headers.get('x-vercel-ip-country');

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('analytics_events').insert({
      event_type: parsed.data.event_type,
      session_id: parsed.data.session_id,
      service_slug: parsed.data.service_slug ?? null,
      step: parsed.data.step ?? null,
      payload: parsed.data.payload ?? {},
      ua_summary: uaSummary(ua),
      country: country ?? null,
    });
    if (error) {
      // Don't bubble — analytics never breaks a user flow.
      console.error('[analytics] insert failed:', error);
    }
  } catch (err) {
    console.error('[analytics] insert threw:', err);
  }

  // Always 204 — the client doesn't care about the result.
  return new NextResponse(null, { status: 204 });
}
