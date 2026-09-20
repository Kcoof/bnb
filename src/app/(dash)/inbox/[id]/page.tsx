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
  if (!row) return <p className="text-sm text-slate-500">Conversation not found.</p>;
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/inbox" className="text-xs text-slate-500 hover:underline">
          ← Inbox
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">
          {r.guestName ?? "(no guest name)"} — {p.name}
        </h1>
        <div className="text-sm text-slate-500">
          {r.checkIn} → {r.checkOut} ·{" "}
          <Link href={`/reservations/${r.id}`} className="hover:underline">
            reservation
          </Link>
          {r.chatToken && (
            <>
              {" · "}
              <CopyButton text={chatUrl(r.chatToken)} label="Copy chat link" />
            </>
          )}
        </div>
      </div>

      {openEscs.map((e) => (
        <div key={e.id} className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="font-medium text-red-800">
            ⚠ {e.reason.replace(/_/g, " ")}
            {e.urgency === "high" ? " — URGENT" : ""}
          </div>
          <div className="mt-1 text-sm text-red-700">{e.summary}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ApproveDeclineButtons conversationId={c.id} />
            <EscalationBannerActions escalationId={e.id} />
          </div>
        </div>
      ))}

      <div className="space-y-2">
        {transcript.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.role === "guest"
                ? "bg-slate-100 text-slate-800"
                : m.role === "host"
                  ? "ml-auto bg-blue-100 text-blue-900"
                  : m.role === "system_note"
                    ? "mx-auto bg-amber-50 text-amber-800 text-xs"
                    : "ml-auto bg-emerald-50 text-emerald-900"
            }`}
          >
            <div className="mb-0.5 text-[10px] uppercase tracking-wide opacity-60">
              {m.role}
              {m.escalated ? " · ⚠ escalated" : ""}
              {m.model ? ` · ${m.model}` : ""}
            </div>
            {m.content}
          </div>
        ))}
      </div>

      <HostComposer conversationId={c.id} />
    </div>
  );
}
