import { eq, gte, sql, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversations,
  organizations,
  profiles,
  properties,
  subscriptions,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";

// Builder-only admin view (spec §13): who's paying, who might churn.
// Protected by ADMIN_EMAILS (comma-separated) — not linked from any host UI.
export default async function AdminPage() {
  const member = await requireOrgMember();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!member || !adminEmails.includes(member.email.toLowerCase())) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-callout text-ink-2">Not found.</p>
      </main>
    );
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const orgs = await db.select().from(organizations);
  const rows = await Promise.all(
    orgs.map(async (org) => {
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.orgId, org.id))
        .limit(1);
      const [propCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(properties)
        .where(eq(properties.orgId, org.id));
      const [convThisMonth] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(conversations)
        .where(
          and(
            eq(conversations.orgId, org.id),
            gte(conversations.createdAt, monthStart),
          ),
        );
      const [owner] = await db
        .select({ email: profiles.email })
        .from(profiles)
        .where(and(eq(profiles.orgId, org.id), eq(profiles.role, "owner")))
        .limit(1);
      return {
        id: org.id,
        name: org.name,
        owner: owner?.email ?? "—",
        plan: sub?.plan ?? "none",
        status: sub?.status ?? "none",
        renewal: sub?.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd).toISOString().slice(0, 10)
          : "—",
        properties: propCount?.n ?? 0,
        limit: sub?.propertyLimit ?? 0,
        conversations: convThisMonth?.n ?? 0,
      };
    }),
  );

  const sorted = rows.sort((a, b) => b.conversations - a.conversations);
  const paying = sorted.filter((r) => r.status === "active").length;
  const atRisk = sorted.filter((r) => r.status === "past_due" || r.status === "canceled");

  return (
    <main className="mx-auto max-w-[1024px] px-6 py-10">
      <h1 className="text-title-1">Admin</h1>
      <p className="mt-1 text-footnote text-ink-2">
        {sorted.length} orgs · {paying} active subscriptions · {atRisk.length} need attention
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-hairline bg-surface shadow-card">
        <table className="w-full text-callout">
          <thead>
            <tr className="border-b border-hairline text-left text-[12px] font-medium text-ink-2">
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Renews</th>
              <th className="px-4 py-3 text-right">Properties</th>
              <th className="px-4 py-3 text-right">Convos (mo)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="h-12 border-b border-hairline last:border-0">
                <td className="px-4 font-medium text-ink">{r.name}</td>
                <td className="px-4 text-ink-2">{r.owner}</td>
                <td className="px-4 text-ink-2">{r.plan}</td>
                <td className="px-4">
                  <StatusPill status={r.status === "none" ? "upcoming" : r.status === "active" ? "ready" : r.status} />
                </td>
                <td className="px-4 tabular-nums text-ink-2">{r.renewal}</td>
                <td className="px-4 text-right tabular-nums text-ink-2">
                  {r.properties}/{r.limit || "—"}
                </td>
                <td className="px-4 text-right tabular-nums text-ink-2">{r.conversations}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-2">
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
