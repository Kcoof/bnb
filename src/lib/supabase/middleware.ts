import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicKey } from "@/lib/supabase/keys";

// Session refresh in middleware (Supabase SSR pattern, plan §3.4).
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Guest / cleaner / QR routes never carry a host session — skip the auth
  // round trip entirely (saves one Supabase call per guest page load).
  if (
    path.startsWith("/chat/") ||
    path.startsWith("/c/") ||
    path.startsWith("/q/")
  ) {
    return NextResponse.next({ request });
  }

  // Unconfigured (env vars missing): pass through instead of
  // crashing every request — pages that need Supabase surface the error.
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

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    request.nextUrl.pathname !== "/" && // landing page is public
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/chat/") &&
    !request.nextUrl.pathname.startsWith("/q/") && // printed QR resolver — guests
    !request.nextUrl.pathname.startsWith("/c/") &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
