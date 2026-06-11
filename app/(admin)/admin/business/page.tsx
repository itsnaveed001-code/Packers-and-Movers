import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SiteSettingsManager } from '@/components/admin/SiteSettingsManager';

export const dynamic = 'force-dynamic';

export default async function BusinessProfilePage() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('singleton', true)
    .maybeSingle();

  return (
    <div className="container max-w-3xl py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Business profile</h1>
        <p className="text-sm text-muted-foreground">
          Company identity, contact details, hours, map, social links, and trust
          hooks. Changes are reflected on the public site immediately.
        </p>
      </header>
      <SiteSettingsManager initial={data ?? null} />
    </div>
  );
}
