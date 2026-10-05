"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cleaners, properties, tasks } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { applyStatus } from "@/lib/status";
import { generateTaskToken } from "@/lib/tokens";
import { sendEvent } from "@/lib/inngest/client";
import { localAt } from "@/lib/time";

export async function assignCleanerAction(
  taskId: string,
  cleanerId: string,
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const task = await scopedTask(member.profile.orgId, taskId);
  if (!task) return { error: "not found" };

  const cleaner = (
    await db
      .select({ id: cleaners.id, email: cleaners.email })
      .from(cleaners)
      .where(
        and(eq(cleaners.id, cleanerId), eq(cleaners.orgId, member.profile.orgId)),
      )
      .limit(1)
  )[0];
  if (!cleaner) return { error: "cleaner not found" };

  await db
    .update(tasks)
    .set({ cleanerId: cleaner.id })
    .where(eq(tasks.id, taskId));
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "task",
    entityId: taskId,
    action: "task.cleaner_assigned",
  });
  if (cleaner.email) {
    await sendEvent("cleaner/assigned", { taskId });
  }
  revalidatePath("/tasks");
  return {};
}

export async function hostMarkCleanedAction(
  taskId: string,
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const task = await scopedTask(member.profile.orgId, taskId);
  if (!task) return { error: "not found" };
  if (task.status === "done") return {};

  await db
    .update(tasks)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(tasks.id, taskId));
  await applyStatus({
    propertyId: task.propertyId,
    orgId: member.profile.orgId,
    to: "ready",
    actorType: "host",
    actorId: member.profile.id,
    reason: "host marked cleaned",
  });
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "task",
    entityId: taskId,
    action: "task.completed",
    metadata: { actor: "host" },
  });
  revalidatePath("/tasks");
  revalidatePath("/board");
  return {};
}

export async function cancelTaskAction(taskId: string): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const task = await scopedTask(member.profile.orgId, taskId);
  if (!task) return { error: "not found" };

  await db
    .update(tasks)
    .set({ status: "cancelled" })
    .where(eq(tasks.id, taskId));
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "task",
    entityId: taskId,
    action: "task.cancelled",
  });
  revalidatePath("/tasks");
  return {};
}

export async function createAdHocTaskAction(input: {
  propertyId: string;
  cleanerId: string;
  dueDate: string;
  notes: string;
}): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };

  const prop = (
    await db
      .select({ id: properties.id, timezone: properties.timezone })
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

  // cleaner must belong to the same org (review M5 — cross-org leak)
  let cleaner: { id: string } | null = null;
  if (input.cleanerId) {
    cleaner =
      (
        await db
          .select({ id: cleaners.id })
          .from(cleaners)
          .where(
            and(
              eq(cleaners.id, input.cleanerId),
              eq(cleaners.orgId, member.profile.orgId),
            ),
          )
          .limit(1)
      )[0] ?? null;
    if (!cleaner) return { error: "cleaner not found" };
  }

  const inserted = (
    await db
      .insert(tasks)
      .values({
        orgId: member.profile.orgId,
        propertyId: input.propertyId,
        cleanerId: cleaner?.id ?? null,
        status: "pending",
        dueAt: input.dueDate
          ? localAt(input.dueDate, "12:00", prop.timezone)
          : null,
        token: generateTaskToken(),
        notes: input.notes.trim() || null,
      })
      .returning({ id: tasks.id })
  )[0];

  if (cleaner) {
    await sendEvent("cleaner/assigned", { taskId: inserted.id });
  }
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "task",
    entityId: inserted.id,
    action: "task.created",
    metadata: { adhoc: true },
  });
  revalidatePath("/tasks");
  return {};
}

export async function createCleanerAction(input: {
  name: string;
  email: string;
  phone: string;
}): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  if (!input.name.trim()) return { error: "name required" };

  await db.insert(cleaners).values({
    orgId: member.profile.orgId,
    name: input.name.trim(),
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
  });
  revalidatePath("/tasks");
  return {};
}

async function scopedTask(
  orgId: string,
  taskId: string,
): Promise<{ propertyId: string; status: string } | null> {
  const rows = await db
    .select({ propertyId: tasks.propertyId, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}
