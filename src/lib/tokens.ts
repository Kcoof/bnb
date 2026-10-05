import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, reservations, subscriptions, tasks, propertyKnowledge, conversations } from "@/lib/db/schema";

// Token design — plan §3.3.
export const TOKEN_PRE_DAYS = 3; // guest link live from check-in − 3 days
export const TOKEN_POST_DAYS = 2; // …until check-out + 2 days

export function generateGuestToken(): string {
  return "gst_" + randomBytes(32).toString("base64url");
}

export function generateTaskToken(): string {
  return "cln_" + randomBytes(32).toString("base64url");
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export type GuestTokenContext = {
  reservation: typeof reservations.$inferSelect;
  property: typeof properties.$inferSelect;
};

/**
 * Look up a reservation by exact chat token and enforce the validity window:
 * check-in − TOKEN_PRE_DAYS → check-out + TOKEN_POST_DAYS, status upcoming|arrived.
 * Property-QR concierge tokens (cnc_…) skip the window — they are always-on.
 * Returns null for any miss (caller renders the "link no longer active" page).
 */
export async function validateGuestToken(
  token: string,
): Promise<GuestTokenContext | null> {
  if (!token.startsWith("gst_") && !token.startsWith("cnc_")) return null;
  const rows = await db
    .select({ reservation: reservations, property: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(eq(reservations.chatToken, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const { reservation, property } = row;
  if (reservation.isHold) return null;

  if (reservation.isConcierge) return { reservation, property };

  if (reservation.status !== "upcoming" && reservation.status !== "arrived")
    return null;

  const now = new Date();
  if (now < addDays(reservation.checkIn, -TOKEN_PRE_DAYS)) return null;
  if (now > addDays(reservation.checkOut, TOKEN_POST_DAYS)) return null;

  return { reservation, property };
}

export type TaskTokenContext = {
  task: typeof tasks.$inferSelect;
};

/** Look up a cleaning task by token; valid until done/skipped/cancelled + 7 days. */
export async function validateTaskToken(
  token: string,
): Promise<TaskTokenContext | null> {
  if (!token.startsWith("cln_")) return null;
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.token, token)))
    .limit(1);
  const task = rows[0];
  if (!task) return null;

  if (task.status === "pending" || task.status === "in_progress") return { task };

  const closedAt = task.completedAt ?? task.createdAt;
  const expires = new Date(closedAt);
  expires.setUTCDate(expires.getUTCDate() + 7);
  if (new Date() > expires) return null;
  return { task };
}

// ── PERF-PLAN §1.4: one joined query that answers everything the chat
// routes need — token validity, billing state, and the full AI context.
export type GuestChatContext = {
  reservation: typeof reservations.$inferSelect;
  property: typeof properties.$inferSelect;
  kb: typeof propertyKnowledge.$inferSelect | null;
  conversationId: string | null;
  chatEnabled: boolean;
};

export async function loadGuestChatContext(
  token: string,
): Promise<GuestChatContext | null> {
  if (!token.startsWith("gst_") && !token.startsWith("cnc_")) return null;

  const rows = await db
    .select({
      reservation: reservations,
      property: properties,
      kb: propertyKnowledge,
      conversationId: conversations.id,
      subStatus: subscriptions.status,
      subPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .leftJoin(propertyKnowledge, eq(propertyKnowledge.propertyId, properties.id))
    .leftJoin(conversations, eq(conversations.reservationId, reservations.id))
    .leftJoin(subscriptions, eq(subscriptions.orgId, reservations.orgId))
    .where(eq(reservations.chatToken, token))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  const { reservation, property } = row;
  if (reservation.isHold) return null;

  if (!reservation.isConcierge) {
    if (reservation.status !== "upcoming" && reservation.status !== "arrived")
      return null;
    const now = new Date();
    if (now < addDays(reservation.checkIn, -TOKEN_PRE_DAYS)) return null;
    if (now > addDays(reservation.checkOut, TOKEN_POST_DAYS)) return null;
  }

  // billing gate — same policy as chatEnabledForOrg (plans.ts)
  let chatEnabled = true;
  if (row.subStatus) {
    if (row.subStatus === "active" || row.subStatus === "trialing") {
      chatEnabled = true;
    } else if (row.subStatus === "past_due") {
      const cutoff = row.subPeriodEnd
        ? new Date(row.subPeriodEnd).getTime() + 7 * 86400_000
        : Infinity;
      chatEnabled = Date.now() < cutoff;
    } else {
      chatEnabled = false;
    }
  }

  return {
    reservation,
    property,
    kb: row.kb ?? null,
    conversationId: row.conversationId ?? null,
    chatEnabled,
  };
}
