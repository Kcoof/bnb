import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  escalations,
  properties,
  reservations,
  tasks,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { localDateStr } from "@/lib/time";
import { StatusPill } from "@/components/StatusPill";
import { CopyButton } from "@/components/CopyButton";
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
  const today = localDateStr(timezones[0] ?? "UTC"); // MVP: dates are per-org-local enough

  const arrivals = await db
    .select({ r: reservations, p: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(
      and(
        eq(reservations.orgId, orgId),
        eq(reservations.checkIn, today),
        eq(reservations.isHold, false),
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
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Today</h1>
        <p className="text-sm text-slate-500">{today}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {["ready", "occupied", "needs_cleaning", "cleaning", "blocked"].map((s) => (
          <div key={s} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-semibold text-slate-900">
              {statusCounts[s] ?? 0}
            </div>
            <div className="mt-1">
              <StatusPill status={s} />
            </div>
          </div>
        ))}
      </div>

      {escalationCount ? (
        <Link
          href="/inbox?tab=escalated"
          className="block rounded-xl border border-red-200 bg-red-50 p-4 hover:bg-red-100"
        >
          <div className="font-medium text-red-800">
            ⚠ Open escalations ({escalationCount})
          </div>
          {openEscalations.map((e) => (
            <div key={e.id} className="mt-1 text-sm text-red-700">
              {e.reason.replace(/_/g, " ")} — {e.summary}
            </div>
          ))}
        </Link>
      ) : null}

      <section>
        <h2 className="mb-2 font-medium text-slate-900">Arrivals ({arrivals.length})</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {arrivals.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No arrivals today.</p>
          )}
          {arrivals.map(({ r, p }) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3 last:border-0"
            >
              <div>
                <Link href={`/reservations/${r.id}`} className="font-medium text-slate-900 hover:underline">
                  {r.guestName ?? "(guest name missing)"} → {p.name}
                </Link>
                <div className="text-xs text-slate-500">
                  {r.guestEmail ? r.guestEmail : "⚠ no guest email — send the snippet"}
                </div>
              </div>
              <div className="flex gap-2">
                {r.chatToken && (
                  <>
                    <CopyButton text={chatUrl(r.chatToken)} label="Copy chat link" />
                    <CopyButton
                      text={snippets.get(r.id) ?? ""}
                      label="Copy snippet"
                    />
                  </>
                )}
                {(() => {
                  const conv = convIds.find((c) => c.reservationId === r.id);
                  return conv ? (
                    <Link
                      href={`/inbox/${conv.id}`}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Conversation
                    </Link>
                  ) : null;
                })()}
              </div>
            </div>
          ))}
        </div>
        {missingEmail.length > 0 && (
          <p className="mt-2 text-xs text-amber-700">
            {missingEmail.length} arrival(s) missing guest email — paste the snippet
            into the booking channel thread so the guest gets the chat link.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-900">Departures ({departures.length})</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {departures.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No departures today.</p>
          )}
          {departures.map(({ r, p }) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3 last:border-0"
            >
              <div>
                <Link href={`/reservations/${r.id}`} className="font-medium text-slate-900 hover:underline">
                  {r.guestName ?? "(guest name missing)"} ← {p.name}
                </Link>
                <div className="text-xs text-slate-500">
                  checkout {p.checkoutTime} · <StatusPill status={p.status} />
                </div>
              </div>
              <Link
                href="/tasks"
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cleaning
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-900">Open cleaning tasks ({tasksToday.length})</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {tasksToday.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No open tasks.</p>
          )}
          {tasksToday.map(({ t, p }) => (
            <div
              key={t.id}
              className="flex items-center justify-between border-b border-slate-100 p-3 last:border-0"
            >
              <span className="text-sm text-slate-800">
                {p.name} — <StatusPill status={t.status} />
              </span>
              <Link href="/tasks" className="text-xs text-slate-500 hover:underline">
                open tasks
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
