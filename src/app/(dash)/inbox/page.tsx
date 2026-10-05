import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  escalations,
  messages,
  properties,
  reservations,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { UnreadBadge } from "@/components/StatusPill";

const TABS = ["all", "unread", "escalated"] as const;

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

  const [rows, openEscs] = await Promise.all([
    db
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
      .limit(100),
    db
      .select({ conversationId: escalations.conversationId })
      .from(escalations)
      .where(and(eq(escalations.orgId, member.profile.orgId), eq(escalations.status, "open"))),
  ]);
  const escalatedIds = new Set(openEscs.map((e) => e.conversationId));

  // last message per conversation in ONE query (window fn) — no N+1 loop
  const convIds = rows.map(({ c }) => c.id);
  const lastMessages = new Map<string, { role: string; content: string }>();
  if (convIds.length > 0) {
    const lastRows = await db.execute(sql`
      select distinct on (conversation_id) conversation_id, role, content
      from messages
      where conversation_id in ${sql.raw(`(${convIds.map((id) => `'${id}'`).join(",")})`)}
      order by conversation_id, created_at desc
    `);
    for (const row of lastRows as unknown as { conversation_id: string; role: string; content: string }[]) {
      lastMessages.set(row.conversation_id, { role: row.role, content: row.content });
    }
  }

  const filtered = rows.filter(({ c }) => {
    if (tab === "escalated") return escalatedIds.has(c.id);
    if (tab === "unread") return c.hostUnreadCount > 0;
    return true;
  });

  const emptyCopy: Record<string, string> = {
    all: "No conversations yet.",
    unread: "Nothing unread.",
    escalated: "Nothing needs you. The AI is handling it.",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-title-1">Inbox</h1>

      <div className="overflow-x-auto">
        <nav className="segmented">
          {TABS.map((t) => (
            <Link
              key={t}
              href={`/inbox?tab=${t}`}
              className={`segmented-item ${tab === t ? "segmented-item-active" : ""}`}
            >
              {t === "all" ? "All" : t === "unread" ? "Unread" : "Escalated"}
              {t === "escalated" && tab === "escalated" && (
                <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="list-card">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-callout text-ink-2">{emptyCopy[tab]}</p>
        )}
        {filtered.map(({ c, r, p }) => {
          const last = lastMessages.get(c.id);
          const initial = (r.guestName ?? "?").slice(0, 1).toUpperCase();
          return (
            <Link key={c.id} href={`/inbox/${c.id}`} className="list-row">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-callout font-semibold ${
                  r.guestName ? "bg-accent-tint text-accent" : "bg-surface-2 text-ink-2"
                }`}
              >
                {initial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-callout font-medium text-ink">
                    {r.guestName ?? "(no guest name)"}
                  </span>
                  <span className="text-footnote text-ink-2">{p.name}</span>
                  {escalatedIds.has(c.id) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-tint px-2 py-0.5 text-[11px] font-medium text-danger">
                      <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
                      Escalated
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-callout text-ink-2">
                  {last ? `${last.role === "guest" ? "" : last.role + ": "}${last.content}` : "no messages"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {c.hostUnreadCount > 0 && <UnreadBadge count={c.hostUnreadCount} />}
                <span className="text-caption-1 text-ink-3 tabular-nums">
                  {c.lastMessageAt
                    ? new Date(c.lastMessageAt).toISOString().slice(5, 16).replace("T", " ")
                    : ""}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="text-ink-3" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
