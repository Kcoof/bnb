// Supabase public key: newer projects expose a "publishable" key
// (sb_publishable_…), older ones the "anon" JWT — accept either name.
export function supabasePublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  );
}
