import { and, eq, sql } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import {
  escalations,
  events,
  organizations,
  profiles,
  properties,
  reservations,
  scheduledMessages,
  tasks,
} from "@/lib/db/schema";
import { localDateStr, localHHMM } from "@/lib/time";
import { escapeHtml, sendEmail } from "@/lib/mail";

// Daily digest #7 — plan §5.2. One per (org, local date), guarded by an
// events row (action='digest.sent', metadata.date).

export const digest = inngest.createFunction(
  { id: "digest", triggers: [{ cron: "0 * * * *" }] },
  async () => {
    const orgs = await db.select().from(organizations);
    let sent = 0;

    for (const org of orgs) {
      const hour = parseInt(localHHMM(org.timezone).slice(0, 2), 10);
      if (hour !== org.digestHour) continue;

      const today = localDateStr(org.timezone);
      const already = await db
        .select({ id: events.id })
        .from(events)
        .where(
          and(
            eq(events.orgId, org.id),
            eq(events.action, "digest.sent"),
            sql`${events.metadata}->>'date' = ${today}`,
          ),
        )
        .limit(1);
      if (already[0]) continue;

      const owner = (
        await db
          .select({ email: profiles.email })
          .from(profiles)
          .where(and(eq(profiles.orgId, org.id), eq(profiles.role, "owner")))
          .limit(1)
      )[0];
      if (!owner?.email) continue;

      const arrivals = await db
        .select({ r: reservations, p: properties })
        .from(reservations)
        .innerJoin(properties, eq(reservations.propertyId, properties.id))
        .where(and(eq(reservations.orgId, org.id), eq(reservations.checkIn, today)));
      const departures = await db
        .select({ r: reservations, p: properties })
        .from(reservations)
        .innerJoin(properties, eq(reservations.propertyId, properties.id))
        .where(and(eq(reservations.orgId, org.id), eq(reservations.checkOut, today)));
      const openEscalations = await db
        .select()
        .from(escalations)
        .where(and(eq(escalations.orgId, org.id), eq(escalations.status, "open")));
      const tasksDue = await db
        .select({ t: tasks, p: properties })
        .from(tasks)
        .innerJoin(properties, eq(tasks.propertyId, properties.id))
        .where(and(eq(tasks.orgId, org.id), eq(tasks.status, "pending")));
      const syncIssues = (
        await db
          .select({ name: properties.name, err: properties.icsLastError })
          .from(properties)
          .where(and(eq(properties.orgId, org.id), sql`ics_last_error is not null`))
      ).filter((r) => r.err);
      const failedMessages = await db
        .select()
        .from(scheduledMessages)
        .where(and(eq(scheduledMessages.orgId, org.id), eq(scheduledMessages.status, "failed")));

      const escCount = openEscalations.length;
      const subject = `${org.name} — ${today}: ${arrivals.length} arrivals, ${departures.length} departures${escCount ? `, ⚠ ${escCount} open escalation(s)` : ""}`;

      const lines: string[] = [];
      lines.push(`<h2>${org.name} — ${today}</h2>`);
      lines.push(`<h3>Arrivals today</h3><ul>`);
      for (const a of arrivals)
        lines.push(`<li>${escapeHtml(a.r.guestName ?? "(no guest name)")} — ${escapeHtml(a.p.name)}</li>`);
      lines.push(`</ul><h3>Departures today</h3><ul>`);
      for (const d of departures)
        lines.push(`<li>${escapeHtml(d.r.guestName ?? "(no guest name)")} — ${escapeHtml(d.p.name)}</li>`);
      lines.push(`</ul>`);
      if (escCount) {
        lines.push(`<h3>⚠ Open escalations</h3><ul>`);
        for (const e of openEscalations)
          lines.push(`<li>${escapeHtml(e.reason)} — ${escapeHtml(e.summary)}</li>`);
        lines.push(`</ul>`);
      }
      if (tasksDue.length) {
        lines.push(`<h3>Tasks due</h3><ul>`);
        for (const t of tasksDue)
          lines.push(`<li>${escapeHtml(t.p.name)} — ${escapeHtml(t.t.status)}</li>`);
        lines.push(`</ul>`);
      }
      if (syncIssues.length) {
        lines.push(`<h3>Sync issues</h3><ul>`);
        for (const s of syncIssues)
          lines.push(`<li>${escapeHtml(s.name)} — ${escapeHtml(s.err ?? "")}</li>`);
        lines.push(`</ul>`);
      }
      if (failedMessages.length) {
        lines.push(`<h3>Failed emails</h3><ul>`);
        for (const m of failedMessages)
          lines.push(`<li>${escapeHtml(m.type)} — ${escapeHtml(m.error ?? "unknown error")}</li>`);
        lines.push(`</ul>`);
      }

      const result = await sendEmail({
        to: owner.email,
        subject,
        html: lines.join("\n"),
      });
      if (!("error" in result)) {
        await db.insert(events).values({
          orgId: org.id,
          actorType: "system",
          actorId: "digest",
          entity: "org",
          entityId: null,
          action: "digest.sent",
          metadata: { date: today },
        });
        sent++;
      }
    }
    return { sent };
  },
);
