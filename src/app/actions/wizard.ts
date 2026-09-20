"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { properties, propertyKnowledge, reservations } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { ensureConversation } from "@/lib/schedule";

function conciergeToken(): string {
  return "cnc_" + randomBytes(32).toString("base64url");
}

export type WizardInput = {
  // step 1
  name: string;
  type: string;
  address: string;
  description: string;
  timezone: string;
  // step 2
  checkinTime: string;
  checkoutTime: string;
  checkinInstructions: string;
  doorCode: string;
  // step 3
  wifiNetwork: string;
  wifiPassword: string;
  parking: string;
  houseRules: string;
  appliances: string;
  // step 4
  nearby: string;
  // step 5
  emergencyInfo: string;
};

/**
 * One-action property onboarding (Automi wizard): creates the property,
 * its knowledge base, and the property-level concierge QR — a synthetic
 * always-on "stay" whose chat token is the printed QR.
 */
export async function createPropertyWizardAction(
  input: WizardInput,
): Promise<{ error?: string; propertyId?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  if (!input.name.trim()) return { error: "property name is required" };

  const token = conciergeToken();

  const prop = (
    await db
      .insert(properties)
      .values({
        orgId: member.profile.orgId,
        name: input.name.trim(),
        type: input.type || "apartment",
        description: input.description.trim(),
        address: input.address.trim(),
        timezone: input.timezone || "UTC",
        checkinTime: input.checkinTime || "16:00",
        checkoutTime: input.checkoutTime || "10:00",
        conciergeToken: token,
      })
      .returning({ id: properties.id })
  )[0];

  await db.insert(propertyKnowledge).values({
    propertyId: prop.id,
    doorCode: input.doorCode.trim(),
    checkinInstructions: input.checkinInstructions.trim(),
    wifiNetwork: input.wifiNetwork.trim(),
    wifiPassword: input.wifiPassword.trim(),
    parking: input.parking.trim(),
    houseRules: input.houseRules.trim(),
    appliances: input.appliances.trim(),
    nearby: input.nearby.trim(),
    emergencyInfo: input.emergencyInfo.trim(),
  });

  // synthetic always-on stay backing the property QR
  const today = new Date();
  const yearAhead = new Date(today);
  yearAhead.setUTCFullYear(yearAhead.getUTCFullYear() + 1);
  const stay = (
    await db
      .insert(reservations)
      .values({
        orgId: member.profile.orgId,
        propertyId: prop.id,
        guestName: null,
        guestEmail: null,
        checkIn: today.toISOString().slice(0, 10),
        checkOut: yearAhead.toISOString().slice(0, 10),
        channel: "other" as const,
        isConcierge: true,
        status: "upcoming" as const,
        chatToken: token,
        notes: "Property concierge QR (always-on chat) — created by setup wizard",
      })
      .returning({ id: reservations.id })
  )[0];

  await ensureConversation(stay.id);
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "property",
    entityId: prop.id,
    action: "property.created",
    metadata: { via: "wizard", concierge: true },
  });

  revalidatePath("/properties");
  return { propertyId: prop.id };
}
