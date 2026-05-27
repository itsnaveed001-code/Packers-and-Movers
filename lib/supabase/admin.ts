import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Service-role client. NEVER import this from client components.
// Bypasses RLS — only use from trusted server routes that have already validated their own auth/inputs.

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  cached = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
