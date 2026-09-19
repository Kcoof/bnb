"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, propertyKnowledge } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { applyStatus } from "@/lib/status";
import { syncPropertyIcs } from "@/lib/ics";
import type { PropertyStatus } from "@/lib/db/schema";

export async function createPropertyAction(input: {
  name: string;
  address: string;
  timezone: string;
  checkinTime: string;
  checkoutTime: string;
}): Promise<{ error?: string; id?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };

  const prop = (
    await db
      .insert(properties)
      .values({
        orgId: member.profile.orgId,
        name: input.name.trim(),
        address: input.address.trim(),
        timezone: input.timezone || "UTC",
        checkinTime: input.checkinTime || "16:00",
        checkoutTime: input.checkoutTime || "10:00",
      })
      .returning({ id: properties.id })
  )[0];

  await db.insert(propertyKnowledge).values({ propertyId: prop.id });
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "property",
    entityId: prop.id,
    action: "property.created",
  });
  revalidatePath("/properties");
  return { id: prop.id };
}

export async function updatePropertyAction(
  propertyId: string,
  input: {
    name: string;
    address: string;
    timezone: string;
    checkinTime: string;
    checkoutTime: string;
    assistantName: string;
    active: boolean;
  },
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const owned = await scopedProperty(member.profile.orgId, propertyId);
  if (!owned) return { error: "not found" };

  await db
    .update(properties)
    .set({
      name: input.name.trim(),
      address: input.address.trim(),
      timezone: input.timezone || "UTC",
      checkinTime: input.checkinTime || "16:00",
      checkoutTime: input.checkoutTime || "10:00",
      assistantName: input.assistantName.trim() || "Alex",
      active: input.active,
    })
    .where(eq(properties.id, propertyId));
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "property",
    entityId: propertyId,
    action: "property.updated",
  });
  revalidatePath(`/properties/${propertyId}`);
  return {};
}

const KB_FIELDS = [
  "wifiNetwork",
  "wifiPassword",
  "doorCode",
  "checkinInstructions",
  "checkoutInstructions",
  "parking",
  "houseRules",
  "appliances",
  "emergencyInfo",
  "nearby",
  "lateCheckoutPolicy",
  "cleaningNotes",
] as const;

export async function saveKnowledgeAction(
  propertyId: string,
  kb: Record<string, string>,
  extras: { topic: string; content: string }[],
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const owned = await scopedProperty(member.profile.orgId, propertyId);
  if (!owned) return { error: "not found" };

  const values: Record<string, string> = {};
  for (const field of KB_FIELDS) values[field] = (kb[field] ?? "").trim();

  await db
    .update(propertyKnowledge)
    .set({
      ...values,
      extras: extras.filter((e) => e.topic.trim() && e.content.trim()),
      updatedAt: new Date(),
    })
    .where(eq(propertyKnowledge.propertyId, propertyId));
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "property",
    entityId: propertyId,
    action: "knowledge.saved",
  });
  revalidatePath(`/properties/${propertyId}`);
  return {};
}

export async function saveIcsUrlAction(
  propertyId: string,
  icsUrl: string,
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const owned = await scopedProperty(member.profile.orgId, propertyId);
  if (!owned) return { error: "not found" };

  await db
    .update(properties)
    .set({ icsUrl: icsUrl.trim() || null })
    .where(eq(properties.id, propertyId));
  revalidatePath(`/properties/${propertyId}`);
  return {};
}

export async function syncNowAction(
  propertyId: string,
): Promise<{ error?: string; result?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const owned = await scopedProperty(member.profile.orgId, propertyId);
  if (!owned) return { error: "not found" };
  const result = await syncPropertyIcs(propertyId);
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/reservations");
  return { result: `+${result.created} new, ~${result.updated} changed, ×${result.cancelled} cancelled` };
}

export async function changeStatusAction(
  propertyId: string,
  to: PropertyStatus,
  reason: string,
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const owned = await scopedProperty(member.profile.orgId, propertyId);
  if (!owned) return { error: "not found" };

  const ok = await applyStatus({
    propertyId,
    orgId: member.profile.orgId,
    to,
    actorType: "host",
    actorId: member.profile.id,
    reason: reason || "manual override",
  });
  revalidatePath("/board");
  revalidatePath(`/properties/${propertyId}`);
  return ok ? {} : { error: `cannot move ${owned.status} → ${to}` };
}

async function scopedProperty(
  orgId: string,
  propertyId: string,
): Promise<{ status: string } | null> {
  const rows = await db
    .select({ status: properties.status })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}
