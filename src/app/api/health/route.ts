import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { supabasePublicKey } from "@/lib/supabase/keys";

export const dynamic = "force-dynamic";

// Configuration diagnostic — reports presence of env vars (never values)
// and live database reachability. Safe to expose: booleans + hostnames only.
export async function GET() {
  let dbHost = null;
  try {
    dbHost = process.env.DATABASE_URL
      ? new URL(process.env.DATABASE_URL.replace(/^postgres(ql)?:\/\//, "https://")).hostname
      : null;
  } catch {
    dbHost = "(unparseable)";
  }

  const env = {
    SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_PUBLIC_KEY: Boolean(supabasePublicKey()),
    SUPABASE_SECRET_KEY: Boolean(
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DATABASE_URL_HOST: dbHost,
    AI_API_KEY: Boolean(process.env.AI_API_KEY),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    INNGEST_SIGNING_KEY: Boolean(process.env.INNGEST_SIGNING_KEY),
  };

  let dbResult: { ok: boolean; error?: string } = { ok: false, error: "not attempted" };
  if (env.DATABASE_URL) {
    try {
      await db.execute(sql`select 1`);
      dbResult = { ok: true };
    } catch (err) {
      dbResult = {
        ok: false,
        error: (err instanceof Error ? err.message : String(err)).slice(0, 200),
      };
    }
  }

  return Response.json({
    env,
    db: dbResult,
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
    },
  });
}
