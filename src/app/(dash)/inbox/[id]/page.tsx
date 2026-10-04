import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  escalations,
  messages,
  properties,
  reservations,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { markConversationReadAction } from "@/app/actions/conversations";
import { HostComposer } from "./HostComposer";
import { EscalationBannerActions } from "./EscalationBannerActions";
import { ApproveDeclineButtons } from "./ApproveDeclineButtons";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { chatUrl } from "@/lib/mail";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await requireOrgMember();
  if (!member) return null;
  const { id } = await params;

  const rows = await db
    .select({ c: conversations, r: reservations, p: properties })
    .from(conversations)
    .innerJoin(reservations, eq(conversations.reservationId, reservations.id))
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(and(eq(conversations.id, id), eq(conversations.orgId, member.profile.orgId)))
    .limit(1);
  const row = rows[0];
  if (!row) return <p className="text-callout text-ink-2">Conversation not found.</p>;
  const { c, r, p } = row;

  const transcript = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, c.id))
    .orderBy(asc(messages.createdAt));

  const openEscs = await db
    .select()
    .from(escalations)
    .where(
      and(eq(escalations.conversationId, c.id), eq(escalations.status, "open")),
    );

  if (c.hostUnreadCount > 0) {
    await markConversationReadAction(c.id);
  }

  return (
    <div className="space-y-6">
      {/* Sticky frosted header */}
      <div className="sticky top-0 z-20 -mx-5 border-b border-hairline bg-[var(--nav-bg)] px-5 py-3 backdrop-blur-nav md:-mx-8 md:px-8">
        <Link href="/dashboard" className="text-callout text-accent hover:underline">
          ‹ Back
        </Link>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <h1 className="text-title-3">{r.guestName ?? "(no guest name)"} — {p.name}</h1>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-footnote text-ink-2">
          {r.checkIn} → {r.checkOut} ·
          <Link href={`/reservations/${r.id}`} className="text-accent hover:underline">
            reservation
          </Link>
          {r.chatToken && (
            <CopyButton text={chatUrl(r.chatToken)} label="Copy chat link" className="h-7 px-2 text-[12px]" />
          )}
        </div>
      </div>

      {openEscs.map((e) => (
        <div key={e.id} className="rounded-lg border border-hairline bg-danger-tint p-5">
          <div className="flex items-center gap-2 text-callout font-semibold text-danger">
            <Icon name="alert" size={16} />
            {e.reason.replace(/_/g, " ")}
            {e.urgency === "high" ? " — URGENT" : ""}
          </div>
          <div className="mt-1 text-callout text-ink">{e.summary}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ApproveDeclineButtons conversationId={c.id} />
            <EscalationBannerActions escalationId={e.id} />
          </div>
        </div>
      ))}

      {/* Transcript — Messages-grade */}
      <div className="mx-auto max-w-[720px] space-y-2">
        {transcript.length === 0 && (
          <p className="py-8 text-center text-callout text-ink-2">No messages yet.</p>
        )}
        {transcript.map((m) => {
          if (m.role === "system_note") {
            return (
              <div key={m.id} className="bubble-note">{m.content}</div>
            );
          }
          if (m.role === "guest") {
            return (
              <div key={m.id} className="bubble-in">{m.content}</div>
            );
          }
          if (m.role === "host") {
            return (
              <div key={m.id} className="bubble-out">{m.content}</div>
            );
          }
          // assistant
          return (
            <div key={m.id} className="animate-msg-in">
              <div className="mb-0.5 ml-1 flex items-center gap-1.5 text-caption-1 text-ink-2">
                Concierge
                {m.escalated && <Icon name="alert" size={12} className="text-danger" />}
                {m.model && <span className="text-ink-3">· {m.model}</span>}
              </div>
              <div className="w-fit max-w-[78%] rounded-[22px] rounded-bl-[6px] bg-surface px-4 py-2.5 text-[16px] leading-relaxed text-ink shadow-card">
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto max-w-[720px]">
        <HostComposer conversationId={c.id} />
      </div>
    </div>
  );
}
