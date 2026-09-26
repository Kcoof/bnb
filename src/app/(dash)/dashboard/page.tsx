import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  escalations,
  messages,
  properties,
  reservations,
  tasks,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { localDateStr } from "@/lib/time";
import { StatusPill } from "@/components/StatusPill";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { chatUrl, renderSnippet } from "@/lib/mail";

export default async function DashboardPage() {
  const member = await requireOrgMember();
  if (!member) return null;
  const orgId = member.profile.orgId;

  const orgProps = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, orgId));
  const timezones = [...new Set(orgProps.map((p) => p.timezone))];
  const today = localDateStr(timezones[0] ?? "UTC");

  const arrivals = await db
    .select({ r: reservations, p: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(
      and(
        eq(reservations.orgId, orgId),
        eq(reservations.checkIn, today),
        eq(reservations.isHold, false),
        eq(reservations.isConcierge, false),
      ),
    );
  const departures = await db
    .select({ r: reservations, p: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(
      and(
        eq(reservations.orgId, orgId),
        eq(reservations.checkOut, today),
        eq(reservations.isHold, false),
        eq(reservations.isConcierge, false),
      ),
    );

  const openEscalations = await db
    .select()
    .from(escalations)
    .where(and(eq(escalations.orgId, orgId), eq(escalations.status, "open")))
    .orderBy(sql`created_at desc`)
    .limit(3);
  const escalationCount = (
    await db
      .select({ count: sql<number>`count(*)::int` })
      .from(escalations)
      .where(and(eq(escalations.orgId, orgId), eq(escalations.status, "open")))
  )[0]?.count;

  const statusCounts = orgProps.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  // AI handled % — conversations with guest activity where the AI resolved
  // everything without an escalation
  const aiStats = await db
    .select({ conversationId: conversations.id })
    .from(conversations)
    .innerJoin(
      messages,
      sql`${messages.conversationId} = ${conversations.id} and ${messages.role} = 'guest'`,
    )
    .where(eq(conversations.orgId, orgId))
    .groupBy(conversations.id);
  const totalConversations = aiStats.length;
  const escalatedConversations = new Set(
    (
      await db
        .select({ conversationId: escalations.conversationId })
        .from(escalations)
        .where(eq(escalations.orgId, orgId))
    )
      .map((e) => e.conversationId)
      .filter((id): id is string => Boolean(id)),
  ).size;
  const aiHandledPct =
    totalConversations > 0
      ? Math.round(((totalConversations - escalatedConversations) / totalConversations) * 100)
      : null;

  const tasksToday = await db
    .select({ t: tasks, p: properties })
    .from(tasks)
    .innerJoin(properties, eq(tasks.propertyId, properties.id))
    .where(
      and(
        eq(tasks.orgId, orgId),
        sql`${tasks.status} in ('pending','in_progress')`,
      ),
    );

  const missingEmail = arrivals.filter((a) => !a.r.guestEmail);
  const convIds = arrivals.length
    ? await db
        .select({ id: conversations.id, reservationId: conversations.reservationId })
        .from(conversations)
        .where(eq(conversations.orgId, orgId))
    : [];

  const hostName = member.profile.fullName || "Your host";
  const snippets = new Map<string, string>();
  for (const a of arrivals) {
    snippets.set(a.r.id, await renderSnippet(a.r.id, hostName));
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-title-1">Today</h1>
        <p className="mt-0.5 text-footnote text-ink-2">{today}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {["ready", "occupied", "needs_cleaning", "cleaning", "blocked"].map((s) => (
          <div key={s} className="card p-5">
            <div className="text-[32px] font-semibold tracking-[-0.02em] tabular-nums text-ink">
              {statusCounts[s] ?? 0}
            </div>
            <div className="mt-1.5">
              <StatusPill status={s} />
            </div>
          </div>
        ))}
      </div>

      {aiHandledPct !== null && (
        <div className="flex animate-fade-up items-center gap-6 rounded-xl bg-accent-tint p-6">
          <div className="text-[44px] font-semibold tracking-[-0.02em] text-accent tabular-nums">
            {aiHandledPct}%
          </div>
          <div className="max-w-xs text-callout text-ink-2">
            of guest conversations handled by the AI without you —{" "}
            {totalConversations - escalatedConversations} of {totalConversations}{" "}
            conversations
          </div>
        </div>
      )}

      {escalationCount ? (
        <Link
          href="/inbox?tab=escalated"
          className="block rounded-lg border border-hairline bg-danger-tint p-5 transition duration-200 hover:bg-[#fbdede]"
        >
          <div className="flex items-center gap-2 text-callout font-semibold text-danger">
            <Icon name="alert" size={16} />
            Open escalations ({escalationCount})
          </div>
          {openEscalations.map((e) => (
            <div key={e.id} className="mt-1 text-callout text-ink">
              {e.reason.replace(/_/g, " ")} — {e.summary}
            </div>
          ))}
        </Link>
      ) : null}

      <section>
        <h2 className="mb-2 text-title-3">Arrivals ({arrivals.length})</h2>
        <div className="list-card">
          {arrivals.length === 0 && (
            <p className="py-8 text-center text-callout text-ink-2">No arrivals today.</p>
          )}
          {arrivals.map(({ r, p }) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <div className="min-w-0">
                <Link href={`/reservations/${r.id}`} className="text-callout font-medium text-ink hover:text-accent">
                  {r.guestName ?? "(guest name missing)"} → {p.name}
                </Link>
                <div className="mt-0.5 flex items-center gap-1 text-footnote text-ink-2">
                  {r.guestEmail ? (
                    r.guestEmail
                  ) : (
                    <>
                      <Icon name="alert" size={12} className="text-warning" />
                      <span className="text-warning">no guest email — send the snippet</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {r.chatToken && (
                  <>
                    <CopyButton text={chatUrl(r.chatToken)} label="Chat link" />
                    <CopyButton text={snippets.get(r.id) ?? ""} label="Snippet" />
                  </>
                )}
                {(() => {
                  const conv = convIds.find((c) => c.reservationId === r.id);
                  return conv ? (
                    <Link href={`/inbox/${conv.id}`} className="btn btn-secondary h-8 px-3 text-[13px]">
                      Conversation
                    </Link>
                  ) : null;
                })()}
              </div>
            </div>
          ))}
        </div>
        {missingEmail.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-footnote text-warning">
            <Icon name="alertCircle" size={12} />
            {missingEmail.length} arrival(s) missing guest email — paste the snippet
            into the booking channel thread so the guest gets the chat link.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-title-3">Departures ({departures.length})</h2>
        <div className="list-card">
          {departures.length === 0 && (
            <p className="py-8 text-center text-callout text-ink-2">No departures today.</p>
          )}
          {departures.map(({ r, p }) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <div>
                <Link href={`/reservations/${r.id}`} className="text-callout font-medium text-ink hover:text-accent">
                  {r.guestName ?? "(guest name missing)"} ← {p.name}
                </Link>
                <div className="mt-0.5 flex items-center gap-2 text-footnote text-ink-2">
                  checkout {p.checkoutTime} <StatusPill status={p.status} />
                </div>
              </div>
              <Link href="/tasks" className="btn btn-secondary h-8 px-3 text-[13px]">
                Cleaning
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-title-3">Open cleaning tasks ({tasksToday.length})</h2>
        <div className="list-card">
          {tasksToday.length === 0 && (
            <p className="py-8 text-center text-callout text-ink-2">No open tasks.</p>
          )}
          {tasksToday.map(({ t, p }) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-4">
              <span className="flex items-center gap-2.5 text-callout text-ink">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2">
                  <Icon name="house" size={18} />
                </span>
                {p.name} <StatusPill status={t.status} />
              </span>
              <Link href="/tasks" className="text-footnote text-accent hover:underline">
                open tasks
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
