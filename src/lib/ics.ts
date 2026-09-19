import "server-only";
import { and, eq, gte } from "drizzle-orm";
import ical from "node-ical";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { properties, reservations, scheduledMessages, tasks } from "@/lib/db/schema";
import { logEvent } from "@/lib/audit";
import { generateGuestToken } from "@/lib/tokens";
import { inngest } from "@/lib/inngest/client";

// ICS fetch + parse + diff — plan §5.1/§1.4.

type IcsResult = { created: number; updated: number; cancelled: number };

function channelFromUrl(url: string): "airbnb" | "booking" | "vrbo" | "other" {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host.includes("airbnb")) return "airbnb";
  if (host.includes("booking")) return "booking";
  if (host.includes("vrbo") || host.includes("homeaway")) return "vrbo";
  return "other";
}

/**
 * Convert an ICS date/datetime to a YYYY-MM-DD date-only string, in the
 * PROPERTY's timezone — a TZ-qualified start must land on the guest's local
 * check-in day, not the UTC day (review M1).
 */
function toDateOnly(value: Date | string, timezone: string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return formatInTimeZone(value, timezone, "yyyy-MM-dd");
}

const HOLD_RE = /block|not available|unavailable/i;

/** Cancel pending guest emails + open cleaning task for a cancelled reservation (§1.4). */
async function cancelReservationSideEffects(reservationId: string): Promise<void> {
  await db
    .update(scheduledMessages)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(scheduledMessages.reservationId, reservationId),
        eq(scheduledMessages.status, "pending"),
      ),
    );
  await db
    .update(tasks)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(tasks.reservationId, reservationId),
        eq(tasks.status, "pending"),
      ),
    );
}

/** Sync one property's iCal feed. All writes keyed on (property_id, external_uid). */
export async function syncPropertyIcs(propertyId: string): Promise<IcsResult> {
  const rows = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);
  const property = rows[0];
  if (!property?.icsUrl) return { created: 0, updated: 0, cancelled: 0 };

  const result: IcsResult = { created: 0, updated: 0, cancelled: 0 };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(property.icsUrl, {
      signal: controller.signal,
      headers: { "user-agent": "bnb-ops-calendar-sync/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    const cal = ical.parseICS(body);

    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - 1);
    const windowEnd = new Date();
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 365);

    const seenUids = new Set<string>();
    for (const raw of Object.values(cal)) {
      if (!raw || raw.type !== "VEVENT") continue;
      const event = raw as unknown as {
        uid?: string;
        start?: Date | string;
        end?: Date | string;
        summary?: string;
        status?: string;
      };
      if (!event.uid) continue;
      const uid = event.uid;
      seenUids.add(uid);
      if (!event.start || !event.end) continue;
      if (new Date(event.end) < windowStart || new Date(event.start) > windowEnd)
        continue;

      const checkIn = toDateOnly(event.start, property.timezone);
      const checkOut = toDateOnly(event.end, property.timezone);
      const isHold =
        HOLD_RE.test(event.summary ?? "") || false;

      const existing = (
        await db
          .select()
          .from(reservations)
          .where(
            and(
              eq(reservations.propertyId, propertyId),
              eq(reservations.externalUid, uid),
            ),
          )
          .limit(1)
      )[0];

      if (event.status === "CANCELLED") {
        if (existing && existing.status !== "cancelled") {
          await db
            .update(reservations)
            .set({ status: "cancelled", chatToken: null, updatedAt: new Date() })
            .where(eq(reservations.id, existing.id));
          await cancelReservationSideEffects(existing.id);
          result.cancelled++;
        }
        continue;
      }

      if (!existing) {
        const inserted = await db
          .insert(reservations)
          .values({
            orgId: property.orgId,
            propertyId,
            guestName: null,
            guestEmail: null,
            checkIn,
            checkOut,
            channel: channelFromUrl(property.icsUrl ?? ""),
            externalUid: uid,
            isHold,
            status: "upcoming",
            chatToken: isHold ? null : generateGuestToken(),
          })
          .returning({ id: reservations.id });
        result.created++;
        if (!isHold && inserted[0]) {
          await inngest.send({
            name: "reservation/created",
            data: { reservationId: inserted[0].id },
          });
        }
      } else if (
        existing.checkIn !== checkIn ||
        existing.checkOut !== checkOut
      ) {
        await db
          .update(reservations)
          .set({ checkIn, checkOut, updatedAt: new Date() })
          .where(eq(reservations.id, existing.id));
        result.updated++;
        // date changes reschedule pending messages (plan §1.4)
        if (!existing.isHold && existing.status === "upcoming") {
          await inngest.send({
            name: "reservation/created",
            data: { reservationId: existing.id },
          });
        }
      }
    }

    // Events that vanished from the feed → cancelled
    const feed = (
      await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.propertyId, propertyId),
            eq(reservations.status, "upcoming"),
            gte(reservations.checkIn, windowStart.toISOString().slice(0, 10)),
          ),
        )
    ).filter((r) => r.externalUid !== null);
    for (const r of feed) {
      if (!seenUids.has(r.externalUid!)) {
        await db
          .update(reservations)
          .set({ status: "cancelled", chatToken: null, updatedAt: new Date() })
          .where(eq(reservations.id, r.id));
        await cancelReservationSideEffects(r.id);
        result.cancelled++;
      }
    }

    await db
      .update(properties)
      .set({ icsLastSyncedAt: new Date(), icsLastError: null })
      .where(eq(properties.id, propertyId));
    await logEvent({
      orgId: property.orgId,
      actorType: "system",
      actorId: "ics-sync",
      entity: "property",
      entityId: propertyId,
      action: "ics.synced",
      metadata: { ...result },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(properties)
      .set({ icsLastSyncedAt: new Date(), icsLastError: message })
      .where(eq(properties.id, propertyId));
  }
  return result;
}
