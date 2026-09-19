import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — used ONLY by the signup/org bootstrap
// and staff invites (plan §3.1), where no profile row exists yet.
// NEVER import from client components. NEVER expose the key to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
