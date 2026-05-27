import { ServicesManager } from '@/components/admin/ServicesManager';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('services')
    .select('*')
    .order('display_order', { ascending: true });

  return (
    <div className="container max-w-6xl py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Services</h1>
        <p className="text-sm text-muted-foreground">
          Enable, disable, and edit the services shown on the public site.
        </p>
      </header>
      <ServicesManager initialServices={data ?? []} />
    </div>
  );
}
