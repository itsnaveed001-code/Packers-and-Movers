import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/admin/Sidebar';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already protects /admin/*, but defense-in-depth: re-check.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 bg-secondary/30">{children}</main>
    </div>
  );
}
