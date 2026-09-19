import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, properties } from "@/lib/db/schema";
import type { PropertyStatus } from "@/lib/db/schema";
import { logEvent } from "@/lib/audit";

// property_status state machine — plan §2.2.
const TRANSITIONS: Record<string, PropertyStatus[]> = {
  ready: ["occupied", "blocked"],
  occupied: ["needs_cleaning", "ready", "blocked"],
  needs_cleaning: ["cleaning", "ready", "blocked"],
  cleaning: ["ready", "needs_cleaning", "blocked"],
  blocked: ["ready", "occupied"],
};

export function allowedTransitions(current: string): PropertyStatus[] {
  return TRANSITIONS[current] ?? ["blocked", "ready"];
}

export function isTransitionAllowed(from: string, to: string): boolean {
  return allowedTransitions(from).includes(to as PropertyStatus);
}

/**
 * Apply a status transition with precondition + audit event (plan §2.2).
 * Returns false when the transition is not allowed (no throw — jobs and
 * manual actions both pre-check and tolerate races).
 */
export async function applyStatus(opts: {
  propertyId: string;
  orgId: string;
  to: PropertyStatus;
  actorType: (typeof events.$inferInsert)["actorType"];
  actorId?: string;
  reason?: string;
}): Promise<boolean> {
  const rows = await db
    .select({ status: properties.status, name: properties.name })
    .from(properties)
    .where(eq(properties.id, opts.propertyId))
    .limit(1);
  const property = rows[0];
  if (!property) return false;
  if (property.status === opts.to) return true; // idempotent
  if (!isTransitionAllowed(property.status, opts.to)) return false;

  await db
    .update(properties)
    .set({ status: opts.to })
    // conditional on the state we read — concurrent transitions can't apply
    // an illegal move (review: TOCTOU)
    .where(and(eq(properties.id, opts.propertyId), eq(properties.status, property.status)));

  await logEvent({
    orgId: opts.orgId,
    actorType: opts.actorType,
    actorId: opts.actorId,
    entity: "property",
    entityId: opts.propertyId,
    action: "status.changed",
    metadata: { from: property.status, to: opts.to, reason: opts.reason ?? null },
  });
  return true;
}
