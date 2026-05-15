import { createClient } from "@supabase/supabase-js";

// Service-role client. Only import from server-side code in admin API routes
// or server-side coach message writes — bypasses RLS by design.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );
}
