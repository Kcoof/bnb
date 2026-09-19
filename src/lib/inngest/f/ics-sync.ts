import { inngest } from "@/lib/inngest/client";
import { syncPropertyIcs } from "@/lib/ics";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { isNotNull } from "drizzle-orm";

export const icsSync = inngest.createFunction(
  { id: "ics-sync", triggers: [{ cron: "0 */2 * * *" }] },
  async () => {
    const props = await db
      .select({ id: properties.id })
      .from(properties)
      .where(isNotNull(properties.icsUrl));
    for (const p of props) {
      await syncPropertyIcs(p.id);
    }
    return { synced: props.length };
  },
);
