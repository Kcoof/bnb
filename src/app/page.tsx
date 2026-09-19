import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabasePublicKey } from "@/lib/supabase/keys";

export default async function Home() {
  // Unconfigured (missing env vars): land on the static login page rather
  // than crashing — the login form itself still renders.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabasePublicKey()) {
    redirect("/login");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
