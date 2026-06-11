import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { InboxManager } from '@/components/admin/InboxManager';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const submissions = data ?? [];
  const unreadCount = submissions.filter((s) => !s.is_read).length;

  return (
    <div className="container max-w-5xl py-6 sm:py-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Messages from the contact form. New messages are also emailed to you;
            this is the authoritative record.
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {unreadCount} unread
          </div>
        )}
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Couldn&apos;t load messages — {error.message}.
        </p>
      ) : (
        <InboxManager initial={submissions} />
      )}
    </div>
  );
}
