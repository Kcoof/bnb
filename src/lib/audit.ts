import "server-only";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

type EventActor = (typeof events.$inferInsert)["actorType"];

/** Append an audit row (plan §2.3 events; every mutation logs one). */
export async function logEvent(input: {
  orgId: string;
  actorType: EventActor;
  actorId?: string | null;
  entity: string;
  entityId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(events).values({
    orgId: input.orgId,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    entity: input.entity,
    entityId: input.entityId ?? null,
    action: input.action,
    metadata: input.metadata ?? {},
  });
}
