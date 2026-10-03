import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// OAuth/OTP landing: exchange code (if present), ensure org+profile exist,
// then route to onboarding (no properties) or dashboard.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return Response.redirect(
        new URL("/login?error=" + encodeURIComponent(error.message), url.origin),
      );
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.redirect(new URL("/login", url.origin));
  }

  // ensureOrgForUser needs DB + service context; inline the same logic here
  // using the supabase (RLS) client would fail pre-profile. Import lazily.
  const { ensureOrgForUser } = await import("@/app/actions/auth");
  await ensureOrgForUser(user.id, user.email, user.user_metadata?.full_name);

  const { data: props } = await supabase.from("properties").select("id").limit(1);
  const hasProperties = (props?.length ?? 0) > 0;

  return Response.redirect(new URL(hasProperties ? "/dashboard" : "/onboarding", url.origin));
}
