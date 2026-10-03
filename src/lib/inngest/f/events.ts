import { and, eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import {
  cleaners,
  conversations,
  escalations,
  events,
  organizations,
  profiles,
  properties,
  reservations,
  tasks,
} from "@/lib/db/schema";
import { chatUrl, escapeHtml, renderEmail, sendEmail, taskUrl, templateVars, appUrl } from "@/lib/mail";
import { sendSms } from "@/lib/sms";
import { ensureConversation, ensureScheduledMessages } from "@/lib/schedule";
import { logEvent } from "@/lib/audit";

// Event-driven functions — plan §5.4.

/** reservation/created → conversation + greeting + scheduled messages (idempotent). */
export const reservationCreated = inngest.createFunction(
  { id: "reservation-created", triggers: [{ event: "reservation/created" }] },
  async ({ event }) => {
    const reservationId = event.data.reservationId as string;
    await ensureConversation(reservationId);
    await ensureScheduledMessages(reservationId);
    return { reservationId };
  },
);

/** escalation/created → owner email #6 with deep link. One email per escalation. */
export const escalationCreated = inngest.createFunction(
  { id: "escalation-created", triggers: [{ event: "escalation/created" }] },
  async ({ event }) => {
    const escalationId = event.data.escalationId as string;
    const rows = await db
      .select({ e: escalations, org: organizations })
      .from(escalations)
      .innerJoin(organizations, eq(escalations.orgId, organizations.id))
      .where(eq(escalations.id, escalationId))
      .limit(1);
    const r = rows[0];
    if (!r) return { skipped: true };

    const already = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.orgId, r.org.id),
          eq(events.action, "escalation.email_sent"),
          eq(events.entityId, escalationId),
        ),
      )
      .limit(1);
    if (already[0]) return { skipped: "already sent" };

    const owner = (
      await db
        .select({ email: profiles.email })
        .from(profiles)
        .where(and(eq(profiles.orgId, r.org.id), eq(profiles.role, "owner")))
        .limit(1)
    )[0];
    if (!owner?.email) return { skipped: "no owner email" };

    const urgent = r.e.urgency === "high";
    const subject = `${urgent ? "⚠ URGENT — " : ""}${escapeHtml(r.org.name)}: ${escapeHtml(r.e.reason.replace(/_/g, " "))} needs your attention`;
    const link = r.e.conversationId
      ? `${appUrl()}/inbox/${r.e.conversationId}`
      : `${appUrl()}/tasks`;

    await sendEmail({
      to: owner.email,
      subject,
      html: `<p><strong>${escapeHtml(r.e.reason.replace(/_/g, " "))}</strong>${urgent ? " (URGENT)" : ""}</p>
<p>${escapeHtml(r.e.summary)}</p>
<p><a href="${link}">Open in dashboard</a></p>`,
    });
    await logEvent({
      orgId: r.org.id,
      actorType: "system",
      actorId: "escalation-email",
      entity: "escalation",
      entityId: escalationId,
      action: "escalation.email_sent",
    });

    // SMS is the PRIMARY host alert (spec §6)
    if (r.org.hostPhone) {
      const propertyRow = r.e.conversationId
        ? (
            await db
              .select({ name: properties.name })
              .from(conversations)
              .innerJoin(reservations, eq(conversations.reservationId, reservations.id))
              .innerJoin(properties, eq(reservations.propertyId, properties.id))
              .where(eq(conversations.id, r.e.conversationId))
              .limit(1)
          )[0]
        : undefined;
      const smsBody = `${propertyRow?.name ?? r.org.name}: guest reports ${r.e.summary}${r.e.urgency === "high" ? " (URGENT)" : ""}. Open AUTOMI to respond: ${r.e.conversationId ? `${appUrl()}/inbox/${r.e.conversationId}` : appUrl()}`;
      await sendSms({ orgId: r.org.id, toPhone: r.org.hostPhone, body: smsBody });
    }
    return { sent: true };
  },
);

/** conversation/host.replied → guest email #5 ("new message from your host"). */
export const guestReply = inngest.createFunction(
  { id: "guest-reply", triggers: [{ event: "conversation/host.replied" }] },
  async ({ event }) => {
    const conversationId = event.data.conversationId as string;
    const rows = await db
      .select({ c: conversations, r: reservations, p: properties })
      .from(conversations)
      .innerJoin(reservations, eq(conversations.reservationId, reservations.id))
      .innerJoin(properties, eq(reservations.propertyId, properties.id))
      .where(eq(conversations.id, conversationId))
      .limit(1);
    const r = rows[0];
    if (!r?.r.guestEmail || !r.r.chatToken) return { skipped: true };

    const url = chatUrl(r.r.chatToken);
    await sendEmail({
      to: r.r.guestEmail,
      subject: `You have a message from ${r.p.name}`,
      html: `<p>Your host sent you a message about your stay at ${escapeHtml(r.p.name)}.</p>
<p><a href="${url}">Open the conversation</a></p>`,
    });
    return { sent: true };
  },
);

/** cleaner/assigned → cleaner email #4 with the no-login task link. */
export const cleanerAssigned = inngest.createFunction(
  { id: "cleaner-assigned", triggers: [{ event: "cleaner/assigned" }] },
  async ({ event }) => {
    const taskId = event.data.taskId as string;
    const rows = await db
      .select({ t: tasks, p: properties, org: organizations })
      .from(tasks)
      .innerJoin(properties, eq(tasks.propertyId, properties.id))
      .innerJoin(organizations, eq(tasks.orgId, organizations.id))
      .where(eq(tasks.id, taskId))
      .limit(1);
    const r = rows[0];
    if (!r) return { skipped: true };

    let cleanerEmail: string | null = null;
    if (r.t.cleanerId) {
      const c = (
        await db
          .select({ email: cleaners.email })
          .from(cleaners)
          .where(eq(cleaners.id, r.t.cleanerId))
          .limit(1)
      )[0];
      cleanerEmail = c?.email ?? null;
    }
    if (!cleanerEmail) return { skipped: "no cleaner email" };

    // one assignment email per task (Inngest retries are safe)
    const alreadySent = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.orgId, r.t.orgId),
          eq(events.action, "cleaner.email_sent"),
          eq(events.entityId, taskId),
        ),
      )
      .limit(1);
    if (alreadySent[0]) return { skipped: "already sent" };

    if (r.t.reservationId) {
      const vars = await templateVars(r.t.reservationId);
      vars.taskUrl = taskUrl(r.t.token);
      vars.dueAt = r.t.dueAt ? new Date(r.t.dueAt).toUTCString() : "";
      const { subject, html } = await renderEmail(
        r.t.orgId,
        "cleaner_assignment",
        vars,
      );
      await sendEmail({ to: cleanerEmail, subject, html });
    } else {
      await sendEmail({
        to: cleanerEmail,
        subject: `Cleaning — ${r.p.name}`,
        html: `<p>Ready by: ${r.t.dueAt ? new Date(r.t.dueAt).toUTCString() : "—"}</p>
<p>Property: ${escapeHtml(r.p.address)}</p>
<p>Open your task (no login needed): <a href="${taskUrl(r.t.token)}">${taskUrl(r.t.token)}</a></p>`,
      });
    }
    await logEvent({
      orgId: r.t.orgId,
      actorType: "system",
      actorId: "cleaner-email",
      entity: "task",
      entityId: taskId,
      action: "cleaner.email_sent",
    });
    return { sent: true };
  },
);
