import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, properties, propertyKnowledge } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { fmtLocal } from "@/lib/time";
import { PropertyDetailsForm } from "./PropertyDetailsForm";
import { KnowledgeForm } from "./KnowledgeForm";
import { IcsPanel } from "./IcsPanel";
import { TestQuestionForm } from "./TestQuestionForm";

const TABS = ["details", "kb", "ics", "history"] as const;

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const member = await requireOrgMember();
  if (!member) return null;
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = (TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as (typeof TABS)[number])
    : "details";

  const rows = await db
    .select({ p: properties, kb: propertyKnowledge })
    .from(properties)
    .innerJoin(propertyKnowledge, eq(propertyKnowledge.propertyId, properties.id))
    .where(and(eq(properties.id, id), eq(properties.orgId, member.profile.orgId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return <p className="text-sm text-slate-500">Property not found.</p>;
  }
  const { p, kb } = row;

  const history =
    tab === "history"
      ? await db
          .select()
          .from(events)
          .where(
            and(
              eq(events.orgId, member.profile.orgId),
              eq(events.entity, "property"),
              eq(events.entityId, p.id),
            ),
          )
          .orderBy(desc(events.createdAt))
          .limit(50)
      : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/properties" className="text-xs text-slate-500 hover:underline">
            ← Properties
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">{p.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {p.conciergeToken && (
            <Link
              href={`/properties/${p.id}/card`}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-400"
            >
              📇 Concierge QR card
            </Link>
          )}
          <StatusPill status={p.status} />
        </div>
      </div>

      <nav className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/properties/${p.id}?tab=${t}`}
            className={`rounded-t-lg px-4 py-2 text-sm ${
              tab === t
                ? "border-b-2 border-slate-900 font-medium text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "kb" ? "Knowledge base" : t === "ics" ? "ICS & sync" : t[0].toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </nav>

      {tab === "details" && (
        <PropertyDetailsForm
          property={{
            id: p.id,
            name: p.name,
            address: p.address,
            timezone: p.timezone,
            checkinTime: p.checkinTime,
            checkoutTime: p.checkoutTime,
            assistantName: p.assistantName,
            active: p.active,
          }}
        />
      )}

      {tab === "kb" && (
        <div className="space-y-6">
          <KnowledgeForm
            propertyId={p.id}
            kb={{
              wifiNetwork: kb.wifiNetwork,
              wifiPassword: kb.wifiPassword,
              doorCode: kb.doorCode,
              checkinInstructions: kb.checkinInstructions,
              checkoutInstructions: kb.checkoutInstructions,
              parking: kb.parking,
              houseRules: kb.houseRules,
              appliances: kb.appliances,
              emergencyInfo: kb.emergencyInfo,
              nearby: kb.nearby,
              lateCheckoutPolicy: kb.lateCheckoutPolicy,
              cleaningNotes: kb.cleaningNotes,
            }}
            extras={Array.isArray(kb.extras) ? (kb.extras as { topic: string; content: string }[]) : []}
          />
          <TestQuestionForm propertyId={p.id} />
        </div>
      )}

      {tab === "ics" && (
        <IcsPanel
          property={{
            id: p.id,
            icsUrl: p.icsUrl ?? "",
            lastSynced: p.icsLastSyncedAt ? fmtLocal(p.icsLastSyncedAt, p.timezone) : null,
            lastError: p.icsLastError,
          }}
        />
      )}

      {tab === "history" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {history.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No events yet.</p>
          )}
          {history.map((e) => (
            <div key={e.id} className="border-b border-slate-100 p-3 text-sm last:border-0">
              <span className="font-medium text-slate-800">{e.action}</span>
              <span className="ml-2 text-slate-400">
                {e.actorType}
                {e.actorId ? ` (${e.actorId.slice(0, 8)})` : ""}
              </span>
              <span className="float-right text-xs text-slate-400">
                {fmtLocal(new Date(e.createdAt), p.timezone)}
              </span>
              {Object.keys(e.metadata as object).length > 0 && (
                <div className="mt-1 text-xs text-slate-500">
                  {JSON.stringify(e.metadata)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
