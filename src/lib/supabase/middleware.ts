import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicKey } from "@/lib/supabase/keys";

// Session refresh + route protection (Supabase SSR pattern).
// PERF-PLAN §1.1: the redirect decision uses the LOCAL session cookie
// (getSession — no network); a network getUser() runs only when the token is
// missing or ~60s from expiry, preserving refresh-in-middleware. Data access
// is unaffected: every host page/action independently verifies via
// requireOrgMember() → getUser() + profiles before touching the drizzle
// (service-role) client — a forged cookie buys nothing but a redirect.
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Guest / cleaner / QR / API routes authenticate themselves (guest tokens,
  // requireOrgMember, or webhook signatures) — skip host-session work here.
  // This removes an auth round trip from every guest message and 15s poll.
  if (
    path.startsWith("/chat/") ||
    path.startsWith("/c/") ||
    path.startsWith("/q/") ||
    path.startsWith("/api/")
  ) {
    return NextResponse.next({ request });
  }

  // Unconfigured (env vars missing): pass through instead of crashing.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabasePublicKey()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabasePublicKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { session } } = await supabase.auth.getSession();
  const expiresSoon =
    !session?.expires_at || session.expires_at * 1000 - Date.now() < 60_000;

  if (session && expiresSoon) {
    // network refresh + persist refreshed cookies (keeps sessions alive >1h)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  const publicPath =
    path === "/" || // landing
    path.startsWith("/login") ||
    path.startsWith("/pricing") ||
    path.startsWith("/auth/") ||
    path.startsWith("/admin"); // admin gates itself via ADMIN_EMAILS

  if (!session && !publicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
