import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  messages,
  properties,
  reservations,
  scheduledMessages,
} from "@/lib/db/schema";
import { localAt } from "@/lib/time";

// Conversation bootstrap + scheduled-message guarantees — plan §1.4/§5.2.

/** Ensure a conversation + greeting assistant message exist for a reservation. */
export async function ensureConversation(reservationId: string): Promise<void> {
  const rows = await db
    .select({ reservation: reservations, property: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);
  const r = rows[0];
  if (!r || r.reservation.isHold) return;

  const existing = (
    await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.reservationId, reservationId))
      .limit(1)
  )[0];

  if (existing) return;

  const first = (r.reservation.guestName ?? "").split(" ")[0];
  const greeting = `Hi ${first || "there"}! I'm ${r.property.assistantName}, the assistant for ${r.property.name}. Ask me anything about your stay — wifi, parking, checkout, the neighborhood. I'm here 24/7.`;

  await db.transaction(async (tx) => {
    const conv = await tx
      .insert(conversations)
      .values({
        orgId: r.reservation.orgId,
        reservationId,
        lastMessageAt: new Date(),
      })
      .returning({ id: conversations.id });
    await tx.insert(messages).values({
      orgId: r.reservation.orgId,
      conversationId: conv[0].id,
      role: "assistant",
      content: greeting,
    });
  });
}

type GuestMessageType = "welcome" | "checkin" | "checkout";

/**
 * Ensure welcome/checkin/checkout scheduled rows exist (idempotent via the
 * (reservation_id, type) unique). Date edits recompute send_at only while
 * still pending — sent/skipped/failed rows are never reopened (plan §1.4).
 */
export async function ensureScheduledMessages(
  reservationId: string,
): Promise<void> {
  const rows = await db
    .select({ reservation: reservations, property: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);
  const r = rows[0];
  if (!r || r.reservation.isHold) return;
  if (r.reservation.status === "cancelled") return;

  const { reservation: resv, property: prop } = r;

  // welcome: at creation time
  // check-in email: check_in − 2d @ 09:00 property-local
  // checkout email: check_out − 1d @ 09:00 property-local
  const ci = new Date(resv.checkIn + "T00:00:00Z");
  ci.setUTCDate(ci.getUTCDate() - 2);
  const co = new Date(resv.checkOut + "T00:00:00Z");
  co.setUTCDate(co.getUTCDate() - 1);

  const plan: { type: GuestMessageType; sendAt: Date }[] = [
    { type: "welcome", sendAt: new Date() },
    {
      type: "checkin",
      sendAt: localAt(ci.toISOString().slice(0, 10), "09:00", prop.timezone),
    },
    {
      type: "checkout",
      sendAt: localAt(co.toISOString().slice(0, 10), "09:00", prop.timezone),
    },
  ];

  for (const row of plan) {
    await db
      .insert(scheduledMessages)
      .values({
        orgId: resv.orgId,
        reservationId,
        type: row.type,
        sendAt: row.sendAt,
      })
      .onConflictDoNothing({
        target: [scheduledMessages.reservationId, scheduledMessages.type],
      });

    await db
      .update(scheduledMessages)
      .set({ sendAt: row.sendAt })
      .where(
        and(
          eq(scheduledMessages.reservationId, reservationId),
          eq(scheduledMessages.type, row.type),
          eq(scheduledMessages.status, "pending"),
        ),
      );
  }
}
