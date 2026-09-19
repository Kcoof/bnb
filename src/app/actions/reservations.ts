"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, reservations } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { generateGuestToken } from "@/lib/tokens";
import { inngest } from "@/lib/inngest/client";

export async function createReservationAction(input: {
  propertyId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guestsCount: string;
  channel: string;
  notes: string;
}): Promise<{ error?: string; id?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };

  const prop = (
    await db
      .select({ id: properties.id })
      .from(properties)
      .where(
        and(
          eq(properties.id, input.propertyId),
          eq(properties.orgId, member.profile.orgId),
        ),
      )
      .limit(1)
  )[0];
  if (!prop) return { error: "property not found" };
  if (!input.checkIn || !input.checkOut || input.checkIn >= input.checkOut)
    return { error: "invalid dates" };

  const inserted = (
    await db
      .insert(reservations)
      .values({
        orgId: member.profile.orgId,
        propertyId: input.propertyId,
        guestName: input.guestName.trim() || null,
        guestEmail: input.guestEmail.trim() || null,
        guestPhone: input.guestPhone.trim() || null,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guestsCount: input.guestsCount ? parseInt(input.guestsCount, 10) : null,
        channel: (input.channel || "manual") as "manual",
        chatToken: generateGuestToken(),
        notes: input.notes.trim() || null,
      })
      .returning({ id: reservations.id })
  )[0];

  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "reservation",
    entityId: inserted.id,
    action: "reservation.created",
  });
  await inngest.send({
    name: "reservation/created",
    data: { reservationId: inserted.id },
  });

  revalidatePath("/reservations");
  return { id: inserted.id };
}

export async function updateReservationAction(
  reservationId: string,
  input: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    checkIn: string;
    checkOut: string;
    notes: string;
  },
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const existing = await scoped(member.profile.orgId, reservationId);
  if (!existing) return { error: "not found" };

  const datesChanged =
    existing.checkIn !== input.checkIn || existing.checkOut !== input.checkOut;

  await db
    .update(reservations)
    .set({
      guestName: input.guestName.trim() || null,
      guestEmail: input.guestEmail.trim() || null,
      guestPhone: input.guestPhone.trim() || null,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      notes: input.notes.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, reservationId));

  if (datesChanged && existing.status === "upcoming") {
    await inngest.send({
      name: "reservation/created",
      data: { reservationId },
    });
  }

  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "reservation",
    entityId: reservationId,
    action: "reservation.updated",
  });
  revalidatePath(`/reservations/${reservationId}`);
  return {};
}

export async function rotateChatTokenAction(
  reservationId: string,
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const existing = await scoped(member.profile.orgId, reservationId);
  if (!existing) return { error: "not found" };

  await db
    .update(reservations)
    .set({ chatToken: generateGuestToken(), updatedAt: new Date() })
    .where(eq(reservations.id, reservationId));
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "reservation",
    entityId: reservationId,
    action: "chat_token.rotated",
  });
  revalidatePath(`/reservations/${reservationId}`);
  return {};
}

async function scoped(
  orgId: string,
  reservationId: string,
): Promise<{ checkIn: string; checkOut: string; status: string } | null> {
  const rows = await db
    .select({
      checkIn: reservations.checkIn,
      checkOut: reservations.checkOut,
      status: reservations.status,
    })
    .from(reservations)
    .where(and(eq(reservations.id, reservationId), eq(reservations.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}
