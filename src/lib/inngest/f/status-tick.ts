import { and, eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { cleaners, properties, reservations, tasks } from "@/lib/db/schema";
import { applyStatus } from "@/lib/status";
import { localAt, localDateStr, localHHMM } from "@/lib/time";
import { generateTaskToken } from "@/lib/tokens";

// The operational heartbeat — plan §5.5. Derives state (self-healing):
// ready→occupied at check-in time, occupied→needs_cleaning at checkout time,
// ensures the cleaning task after departure. `blocked` is never auto-touched.

export const statusTick = inngest.createFunction(
  { id: "status-tick", triggers: [{ cron: "0 * * * *" }] },
  async () => {
    const changes: Record<string, number> = {};
    const props = await db
      .select()
      .from(properties)
      .where(eq(properties.active, true));

    for (const prop of props) {
      const today = localDateStr(prop.timezone);
      const hhmm = localHHMM(prop.timezone);

      // 1) arrival: live reservation covers today, past check-in time, still ready
      //    (concierge QR stays never count as arrivals)
      if (prop.status === "ready") {
        const arriving = (
          await db
            .select()
            .from(reservations)
            .where(
              and(
                eq(reservations.propertyId, prop.id),
                eq(reservations.status, "upcoming"),
                eq(reservations.isConcierge, false),
              ),
            )
        ).find((r) => r.checkIn <= today && today < r.checkOut);
        if (arriving && hhmm >= prop.checkinTime) {
          const ok = await applyStatus({
            propertyId: prop.id,
            orgId: prop.orgId,
            to: "occupied",
            actorType: "system",
            actorId: "status-tick",
            reason: "check-in time reached",
          });
          if (ok) {
            await db
              .update(reservations)
              .set({ status: "arrived", updatedAt: new Date() })
              .where(eq(reservations.id, arriving.id));
            changes.occupied = (changes.occupied ?? 0) + 1;
          }
        }
      }

      // 2) departure: any arrived reservation whose checkout day has passed
      //    (<= today, so a missed day self-heals — review M4). Reservation
      //    → departed + task always; property → needs_cleaning only from
      //    'occupied' (host/cleaner may already have moved it on).
      if (prop.status === "occupied" || prop.status === "needs_cleaning" || prop.status === "cleaning") {
        const departing = (
          await db
            .select()
            .from(reservations)
            .where(
              and(
                eq(reservations.propertyId, prop.id),
                eq(reservations.status, "arrived"),
                eq(reservations.isConcierge, false),
              ),
            )
        // past checkout time on the departure day, or any earlier day
        // (missed days self-heal — review M4)
        ).find(
          (r) =>
            r.checkOut < today ||
            (r.checkOut === today && hhmm >= prop.checkoutTime),
        );
        if (departing) {
          await db
            .update(reservations)
            .set({ status: "departed", updatedAt: new Date() })
            .where(eq(reservations.id, departing.id));
          await ensureCleaningTask(departing.id);
          if (prop.status === "occupied") {
            const ok = await applyStatus({
              propertyId: prop.id,
              orgId: prop.orgId,
              to: "needs_cleaning",
              actorType: "system",
              actorId: "status-tick",
              reason: "checkout time reached",
            });
            if (ok) changes.needs_cleaning = (changes.needs_cleaning ?? 0) + 1;
          }
        }
      }
    }
    return changes;
  },
);

/** One task per reservation (unique); auto-assign the org's single active cleaner. */
export async function ensureCleaningTask(reservationId: string): Promise<string | null> {
  const rows = await db
    .select({ reservation: reservations, property: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;

  const existing = (
    await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.reservationId, reservationId))
      .limit(1)
  )[0];
  if (existing) return existing.id;

  const dueAt = new Date(
    localAt(r.reservation.checkOut, r.property.checkoutTime, r.property.timezone),
  );
  dueAt.setUTCMinutes(dueAt.getUTCMinutes() + 30);

  const activeCleaners = await db
    .select({ id: cleaners.id, email: cleaners.email })
    .from(cleaners)
    .where(and(eq(cleaners.orgId, r.reservation.orgId), eq(cleaners.active, true)));
  // Auto-assign only when unambiguous (single active cleaner in the org).
  const cleaner = activeCleaners.length === 1 ? activeCleaners[0] : null;

  const inserted = await db
    .insert(tasks)
    .values({
      orgId: r.reservation.orgId,
      propertyId: r.property.id,
      reservationId,
      cleanerId: cleaner?.id ?? null,
      status: "pending",
      dueAt,
      token: generateTaskToken(),
    })
    .onConflictDoNothing()
    .returning({ id: tasks.id });

  if (!inserted[0]) return null;

  if (cleaner?.email) {
    await inngest.send({
      name: "cleaner/assigned",
      data: { taskId: inserted[0].id },
    });
  }
  return inserted[0].id;
}
