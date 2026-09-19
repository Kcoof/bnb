// Applies drizzle/0002_rls.sql (auth FK + RLS) after drizzle-kit migrate.
// Usage: node scripts/apply-rls.mjs   (requires DATABASE_URL)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

try {
  const file = readFileSync(join(root, "drizzle", "0002_rls.sql"), "utf8");
  await sql.unsafe(file);
  console.log("0002_rls.sql applied (RLS enabled, policies created).");
} catch (err) {
  console.error("Failed to apply RLS migration:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
