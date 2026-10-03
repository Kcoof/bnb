import Link from "next/link";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  escalations,
  properties,
  reservations,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { localDateStr } from "@/lib/time";
import { Icon } from "@/components/Icon";
import { fmtLocal } from "@/lib/time";

// AUTOMI v2 Today (spec §3): answers "do I need to do anything?" first.
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

  const openEscalations = await db
    .select()
    .from(escalations)
    .where(and(eq(escalations.orgId, orgId), eq(escalations.status, "open")))
    .orderBy(sql`created_at desc`)
    .limit(5);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const [convCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(conversations)
    .where(
      and(eq(conversations.orgId, orgId), gte(conversations.createdAt, monthStart)),
    );

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

  const firstName = member.profile.fullName.split(" ")[0] || "there";
  const hour = parseInt(fmtLocal(new Date(), timezones[0] ?? "UTC").slice(11, 13), 10);
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const allGood = openEscalations.length === 0;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-title-1">
          {greeting}, {firstName}.
        </h1>
        <p className="mt-0.5 text-callout text-ink-2">
          {allGood ? "Everything looks good." : `${openEscalations.length} thing${openEscalations.length > 1 ? "s" : ""} need${openEscalations.length > 1 ? "" : "s"} you.`}
        </p>
      </div>

      {/* Needs your attention */}
      {!allGood && (
        <div className="space-y-3">
          {openEscalations.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-danger-tint p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-danger">
                  <Icon name="alert" size={18} />
                </span>
                <div className="min-w-0">
                  <div className="text-callout font-medium text-ink">
                    {e.reason.replace(/_/g, " ")}
                    {e.urgency === "high" ? " · urgent" : ""}
                  </div>
                  <div className="truncate text-footnote text-ink-2">{e.summary}</div>
                </div>
              </div>
              {e.conversationId && (
                <Link href={`/inbox/${e.conversationId}`} className="btn btn-primary btn-sm">
                  Reply
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Property cards */}
      <section>
        <h2 className="mb-3 text-title-3">Your properties</h2>
        {orgProps.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-hairline bg-surface px-6 py-12 text-center">
            <p className="text-callout text-ink-2">No properties yet.</p>
            <Link href="/onboarding" className="btn btn-primary btn-md mt-5">
              Set up your first concierge
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {orgProps.map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="card flex items-center justify-between p-5 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-raised"
              >
                <div>
                  <div className="text-callout font-medium text-ink">{p.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-footnote text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    Concierge active
                  </div>
                </div>
                <Icon name="chevronRight" size={16} className="text-ink-3" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Today's stats */}
      <section className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-[32px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
            {arrivals.length}
          </div>
          <div className="mt-1 text-footnote text-ink-2">arrivals today</div>
        </div>
        <div className="card p-5">
          <div className="text-[32px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
            {departures.length}
          </div>
          <div className="mt-1 text-footnote text-ink-2">departures today</div>
        </div>
        <div className="card p-5">
          <div className="text-[32px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
            {convCount?.n ?? 0}
          </div>
          <div className="mt-1 text-footnote text-ink-2">conversations this month</div>
        </div>
      </section>
    </div>
  );
}
