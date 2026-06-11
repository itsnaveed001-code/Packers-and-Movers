import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PricingManager } from '@/components/admin/PricingManager';
import type { PricingTier, Service } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const supabase = createSupabaseAdminClient();
  const [servicesRes, tiersRes] = await Promise.all([
    supabase.from('services').select('*').order('display_order', { ascending: true }),
    supabase.from('pricing_tiers').select('*').order('display_order', { ascending: true }),
  ]);

  const services = (servicesRes.data ?? []) as Service[];
  const allTiers = (tiersRes.data ?? []) as PricingTier[];

  // Group tiers by service_id once on the server.
  const tiersByService: Record<string, PricingTier[]> = {};
  for (const t of allTiers) {
    if (!tiersByService[t.service_id]) tiersByService[t.service_id] = [];
    tiersByService[t.service_id].push(t);
  }

  return (
    <div className="container max-w-4xl py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Per-service pricing tiers and the &ldquo;Coming soon&rdquo; switch. The
          public site shows &ldquo;from ₹X&rdquo; based on the cheapest tier.
        </p>
      </header>

      <PricingManager services={services} tiersByService={tiersByService} />
    </div>
  );
}
