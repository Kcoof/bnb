import "server-only";
import { createClient } from "@/lib/supabase/server";

// requireOrgMember — plan §3.4. Every (dash) page and action calls this.
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

export async function requireOrgMember(): Promise<OrgMember | null> {
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
}
