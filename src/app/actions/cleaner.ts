"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { escalations, tasks } from "@/lib/db/schema";
import { validateTaskToken } from "@/lib/tokens";
import { applyStatus } from "@/lib/status";
import { logEvent } from "@/lib/audit";
import { sendEvent } from "@/lib/inngest/client";

// Public cleaner actions — authenticated by task token only (plan §1.4).

export async function cleanerStartAction(token: string): Promise<{ error?: string }> {
  const ctx = await validateTaskToken(token);
  if (!ctx) return { error: "link_not_active" };
  const { task } = ctx;
  if (task.status !== "pending") return {};

  await db
    .update(tasks)
    .set({ status: "in_progress", startedAt: new Date() })
    .where(eq(tasks.id, task.id));
  await applyStatus({
    propertyId: task.propertyId,
    orgId: task.orgId,
    to: "cleaning",
    actorType: "cleaner",
    actorId: task.id,
    reason: "cleaner started",
  });
  revalidatePath(`/c/${token}`);
  return {};
}

export async function cleanerDoneAction(
  token: string,
  notes: string,
): Promise<{ error?: string }> {
  const ctx = await validateTaskToken(token);
  if (!ctx) return { error: "link_not_active" };
  const { task } = ctx;
  if (task.status === "done") return {};

  await db
    .update(tasks)
    .set({
      status: "done",
      completedAt: new Date(),
      startedAt: task.startedAt ?? new Date(),
      notes: notes.trim() || task.notes,
    })
    .where(eq(tasks.id, task.id));
  await applyStatus({
    propertyId: task.propertyId,
    orgId: task.orgId,
    to: "ready",
    actorType: "cleaner",
    actorId: task.id,
    reason: "cleaning completed",
  });
  await logEvent({
    orgId: task.orgId,
    actorType: "cleaner",
    actorId: task.id,
    entity: "task",
    entityId: task.id,
    action: "task.completed",
    metadata: { actor: "cleaner" },
  });
  revalidatePath(`/c/${token}`);
  return {};
}

export async function cleanerReportProblemAction(
  token: string,
  text: string,
): Promise<{ error?: string }> {
  const ctx = await validateTaskToken(token);
  if (!ctx) return { error: "link_not_active" };
  const { task } = ctx;
  const problem = text.trim();
  if (!problem) return { error: "describe the problem" };

  const inserted = (
    await db
      .insert(escalations)
      .values({
        orgId: task.orgId,
        source: "cleaner",
        taskId: task.id,
        reason: "cleaner_issue",
        summary: problem,
        urgency: "normal",
      })
      .returning({ id: escalations.id })
  )[0];
  await sendEvent("escalation/created", { escalationId: inserted.id },);
  revalidatePath(`/c/${token}`);
  return {};
}
