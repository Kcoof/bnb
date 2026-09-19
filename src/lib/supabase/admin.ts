import "server-only";
import { createClient } from "@supabase/supabase-js";

// Secret-key client (new sb_secret_… or legacy service_role). Bypasses RLS —
// used ONLY by the signup/org bootstrap and staff invites (plan §3.1), where
// no profile row exists yet. NEVER import from client components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
