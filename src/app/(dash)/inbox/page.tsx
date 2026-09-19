import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  escalations,
  messages,
  properties,
  reservations,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";

const TABS = ["all", "escalated", "unread"] as const;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const member = await requireOrgMember();
  if (!member) return null;
  const { tab: rawTab } = await searchParams;
  const tab = (TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as (typeof TABS)[number])
    : "all";

  const rows = await db
    .select({
      c: conversations,
      r: reservations,
      p: properties,
    })
    .from(conversations)
    .innerJoin(reservations, eq(conversations.reservationId, reservations.id))
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(eq(conversations.orgId, member.profile.orgId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(100);

  const openEscs = await db
    .select({ conversationId: escalations.conversationId })
    .from(escalations)
    .where(and(eq(escalations.orgId, member.profile.orgId), eq(escalations.status, "open")));
  const escalatedIds = new Set(openEscs.map((e) => e.conversationId));

  const lastMessages = new Map<string, { role: string; content: string }>();
  for (const row of rows) {
    const last = (
      await db
        .select({ role: messages.role, content: messages.content })
        .from(messages)
        .where(eq(messages.conversationId, row.c.id))
        .orderBy(desc(messages.createdAt))
        .limit(1)
    )[0];
    if (last) lastMessages.set(row.c.id, last);
  }

  const filtered = rows.filter(({ c }) => {
    if (tab === "escalated") return escalatedIds.has(c.id);
    if (tab === "unread") return c.hostUnreadCount > 0;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Inbox</h1>

      <nav className="flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/inbox?tab=${t}`}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t
                ? "bg-slate-900 font-medium text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t === "all" ? "All" : t === "escalated" ? "⚠ Escalated" : "Unread"}
          </Link>
        ))}
      </nav>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Nothing here.</p>
        )}
        {filtered.map(({ c, r, p }) => {
          const last = lastMessages.get(c.id);
          return (
            <Link
              key={c.id}
              href={`/inbox/${c.id}`}
              className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {r.guestName ?? "(no guest name)"}
                  </span>
                  <span className="text-xs text-slate-400">{p.name}</span>
                  {escalatedIds.has(c.id) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      ⚠ escalated
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {last ? `${last.role === "guest" ? "" : last.role + ": "}${last.content}` : "no messages"}
                </div>
              </div>
              <div className="shrink-0 text-xs text-slate-400">
                {c.hostUnreadCount > 0 && (
                  <span className="mr-2 rounded-full bg-blue-600 px-2 py-0.5 text-white">
                    {c.hostUnreadCount}
                  </span>
                )}
                {c.lastMessageAt
                  ? new Date(c.lastMessageAt).toISOString().slice(5, 16).replace("T", " ")
                  : ""}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
