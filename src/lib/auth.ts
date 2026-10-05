import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// requireOrgMember — the security boundary for all host data access
// (PERF-PLAN §1.2). React cache() dedupes the getUser() + profiles lookup
// across layout + page + nested components within ONE request; server
// actions are separate requests and keep their own call.
export type OrgMember = {
  userId: string;
  email: string;
  profile: {
    id: string;
    orgId: string;
    fullName: string;
    role: "owner" | "admin" | "staff";
  };
};

export const requireOrgMember = cache(async (): Promise<OrgMember | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, full_name, role")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email,
    profile: {
      id: profile.id,
      orgId: profile.org_id,
      fullName: profile.full_name,
      role: profile.role,
    },
  };
});
