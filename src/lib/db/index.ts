import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Direct Postgres connection (Supabase session mode). Service-role semantics:
// bypasses RLS. Only import from server code that has authenticated the caller
// by other means — token-validated public routes and Inngest jobs (plan §1.1).
const client = postgres(process.env.DATABASE_URL ?? "", {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
