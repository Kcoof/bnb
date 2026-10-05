"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, escalations, messages } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { sendEvent } from "@/lib/inngest/client";

export async function hostReplyAction(
  conversationId: string,
  content: string,
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const text = content.trim();
  if (!text) return { error: "empty reply" };

  const conv = (
    await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.orgId, member.profile.orgId),
        ),
      )
      .limit(1)
  )[0];
  if (!conv) return { error: "not found" };

  await db.insert(messages).values({
    orgId: member.profile.orgId,
    conversationId,
    role: "host",
    content: text,
  });
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date(), hostUnreadCount: 0 })
    .where(eq(conversations.id, conversationId));

  // replying resolves any open escalations on this conversation (§4.5)
  await db
    .update(escalations)
    .set({ status: "resolved", resolvedAt: new Date(), resolvedBy: member.profile.id })
    .where(
      and(
        eq(escalations.conversationId, conversationId),
        eq(escalations.status, "open"),
      ),
    );

  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "conversation",
    entityId: conversationId,
    action: "host.replied",
  });

  // guest email #5 — one per host message
  await sendEvent("conversation/host.replied", { conversationId },);

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
  return {};
}

export async function resolveEscalationAction(
  escalationId: string,
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const esc = (
    await db
      .select({ id: escalations.id })
      .from(escalations)
      .where(
        and(
          eq(escalations.id, escalationId),
          eq(escalations.orgId, member.profile.orgId),
        ),
      )
      .limit(1)
  )[0];
  if (!esc) return { error: "not found" };

  await db
    .update(escalations)
    .set({ status: "resolved", resolvedAt: new Date(), resolvedBy: member.profile.id })
    .where(eq(escalations.id, escalationId));
  await logEvent({
    orgId: member.profile.orgId,
    actorType: "host",
    actorId: member.profile.id,
    entity: "escalation",
    entityId: escalationId,
    action: "escalation.resolved",
    metadata: { mode: "handled_offline" },
  });
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  return {};
}

export async function markConversationReadAction(
  conversationId: string,
): Promise<void> {
  const member = await requireOrgMember();
  if (!member) return;
  await db
    .update(conversations)
    .set({ hostUnreadCount: 0 })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.orgId, member.profile.orgId),
      ),
    );
  revalidatePath("/inbox");
}
