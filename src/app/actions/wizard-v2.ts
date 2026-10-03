"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applianceTemplates,
  properties,
  propertyAppliances,
  propertyKnowledge,
  reservations,
  subscriptions,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { ensureConversation } from "@/lib/schedule";
import { parseMapsLink } from "@/lib/maps";

function conciergeToken(): string {
  return "cnc_" + randomBytes(32).toString("base64url");
}

/** Start wizard: create the property shell (spec §2 step 2) with limit check. */
export async function wizardStartAction(input: {
  name: string;
}): Promise<{ error?: string; propertyId?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  if (!input.name.trim()) return { error: "Please enter a name." };

  // property limit per plan (spec §13) — Stripe is truth, local row is mirror
  const sub = (
    await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, member.profile.orgId))
      .limit(1)
  )[0];
  const count = (
    await db
      .select({ n: sql<number>`count(*)::int` })
      .from(properties)
      .where(eq(properties.orgId, member.profile.orgId))
  )[0]?.n ?? 0;
  const limit = sub?.propertyLimit ?? 1;
  const billingOk = !sub || sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  if (!billingOk) return { error: "billing" };
  if (count >= limit) return { error: "limit" };

  const token = conciergeToken();
  const prop = (
    await db
      .insert(properties)
      .values({
        orgId: member.profile.orgId,
        name: input.name.trim(),
        conciergeToken: token,
      })
      .returning({ id: properties.id })
  )[0];

  await db.insert(propertyKnowledge).values({ propertyId: prop.id });

  // QR resolver needs an active stay to point at; create the placeholder
  // concierge stay (upgraded to real dates by ICS/manual later)
  const today = new Date();
  const ahead = new Date(today);
  ahead.setUTCFullYear(ahead.getUTCFullYear() + 1);
  const stay = (
    await db
      .insert(reservations)
      .values({
        orgId: member.profile.orgId,
        propertyId: prop.id,
        checkIn: today.toISOString().slice(0, 10),
        checkOut: ahead.toISOString().slice(0, 10),
        channel: "other" as const,
        isConcierge: true,
        status: "upcoming" as const,
        chatToken: token,
        notes: "Concierge QR stay — wizard v2",
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
    metadata: { via: "wizard-v2" },
  });
  revalidatePath("/properties");
  return { propertyId: prop.id };
}

/** Autosave a single field (spec §2: autosave, no Save buttons). */
export async function wizardSaveAction(
  propertyId: string,
  patch: Record<string, unknown>,
): Promise<{ error?: string; saved?: boolean; parsedCoords?: boolean }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const owned = await scoped(member.profile.orgId, propertyId);
  if (!owned) return { error: "not found" };

  const propPatch: Record<string, unknown> = {};
  const kbPatch: Record<string, unknown> = {};

  if (typeof patch.assistantName === "string")
    propPatch.assistantName = patch.assistantName.trim().slice(0, 40) || "Alex";
  if (typeof patch.timezone === "string") propPatch.timezone = patch.timezone;

  if (typeof patch.mapsUrl === "string") {
    propPatch.mapsUrl = patch.mapsUrl.trim() || null;
    if (patch.mapsUrl.trim()) {
      const coords = await parseMapsLink(patch.mapsUrl);
      if (coords) {
        propPatch.latitude = coords.latitude;
        propPatch.longitude = coords.longitude;
      }
    }
    const result = await apply(propertyId, propPatch, kbPatch);
    return { ...result, parsedCoords: propPatch.latitude !== undefined };
  }

  if (typeof patch.wifiNetwork === "string") kbPatch.wifiNetwork = patch.wifiNetwork.trim();
  if (typeof patch.wifiPassword === "string") kbPatch.wifiPassword = patch.wifiPassword.trim();

  return apply(propertyId, propPatch, kbPatch);

  async function apply(pid: string, pp: Record<string, unknown>, kp: Record<string, unknown>) {
    if (Object.keys(pp).length > 0) {
      await db.update(properties).set(pp).where(eq(properties.id, pid));
    }
    if (Object.keys(kp).length > 0) {
      await db
        .update(propertyKnowledge)
        .set({ ...kp, updatedAt: new Date() })
        .where(eq(propertyKnowledge.propertyId, pid));
    }
    return { saved: true };
  }
}

/** Save host phone (org-level SMS target, spec §2 step 9). */
export async function wizardSavePhoneAction(phone: string): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const clean = phone.replace(/[^\d+]/g, "");
  if (clean.replace(/\D/g, "").length < 8) return { error: "Enter a valid phone number." };
  const { organizations } = await import("@/lib/db/schema");
  await db
    .update(organizations)
    .set({ hostPhone: clean })
    .where(eq(organizations.id, member.profile.orgId));
  return {};
}

/** Amenities chips (spec §2 step 8). */
export async function wizardSaveAmenitiesAction(
  propertyId: string,
  amenities: string[],
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const owned = await scoped(member.profile.orgId, propertyId);
  if (!owned) return { error: "not found" };
  await db
    .update(properties)
    .set({ amenities: amenities.slice(0, 30) })
    .where(eq(properties.id, propertyId));
  return {};
}

/**
 * Appliance tick-boxes (spec §2 step 7): copy-on-select — the template text
 * is COPIED to the property's own row, never referenced live.
 */
export async function wizardSaveAppliancesAction(
  propertyId: string,
  selectedTypes: string[],
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const owned = await scoped(member.profile.orgId, propertyId);
  if (!owned) return { error: "not found" };

  const templates = await db.select().from(applianceTemplates);
  const existing = await db
    .select({ type: propertyAppliances.templateType })
    .from(propertyAppliances)
    .where(eq(propertyAppliances.propertyId, propertyId));
  const have = new Set(existing.map((e) => e.type));

  for (const type of selectedTypes) {
    const tpl = templates.find((t) => t.type === type);
    if (!tpl) continue;
    if (have.has(type)) continue; // never overwrite host edits
    await db.insert(propertyAppliances).values({
      orgId: member.profile.orgId,
      propertyId,
      templateType: tpl.type,
      label: tpl.label,
      instructions: tpl.defaultInstructions,
      troubleshooting: tpl.defaultTroubleshooting,
    });
  }
  // deselected: remove only untouched copies (no edits to protect in MVP —
  // if the row exists it was just copied, so removing is safe pre-launch)
  const keep = new Set(selectedTypes);
  for (const type of have) {
    if (!keep.has(type)) {
      await db
        .delete(propertyAppliances)
        .where(
          and(
            eq(propertyAppliances.propertyId, propertyId),
            eq(propertyAppliances.templateType, type),
          ),
        );
    }
  }
  return {};
}

async function scoped(orgId: string, propertyId: string) {
  const rows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}
