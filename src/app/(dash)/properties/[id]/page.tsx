import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, properties, propertyAppliances, propertyKnowledge } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { Icon } from "@/components/Icon";
import { fmtLocal } from "@/lib/time";
import { PropertyDetailsForm } from "./PropertyDetailsForm";
import { KnowledgeForm } from "./KnowledgeForm";
import { IcsPanel } from "./IcsPanel";
import { TestQuestionForm } from "./TestQuestionForm";
import { AppliancesEditor } from "./AppliancesEditor";

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
    return <p className="text-sm text-ink-2">Property not found.</p>;
  }
  const { p, kb } = row;

  const appliances =
    tab === "kb"
      ? await db
          .select()
          .from(propertyAppliances)
          .where(eq(propertyAppliances.propertyId, p.id))
      : [];

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
          <Link href="/properties" className="text-xs text-ink-2 hover:text-accent hover:underline">
            ← Properties
          </Link>
          <h1 className="font-display text-title-1">{p.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {p.conciergeToken && (
            <Link
              href={`/properties/${p.id}/card`}
              className="btn btn-secondary btn-sm"
            >
              <Icon name="qr" size={14} />
              Concierge QR card</Link>
          )}
          <StatusPill status={p.status} />
        </div>
      </div>

      <nav className="overflow-x-auto">
          <div className="segmented">
            {TABS.map((t) => (
              <Link
                key={t}
                href={`/properties/${p.id}?tab=${t}`}
                className={`segmented-item ${tab === t ? "segmented-item-active" : ""}`}
              >
                {t === "kb" ? "Knowledge base" : t === "ics" ? "ICS & sync" : t[0].toUpperCase() + t.slice(1)}
              </Link>
            ))}
          </div>
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
          <AppliancesEditor propertyId={p.id} appliances={appliances.map((a) => ({ templateType: a.templateType, label: a.label, instructions: a.instructions, troubleshooting: a.troubleshooting }))} />
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
        <div className="overflow-hidden card">
          {history.length === 0 && (
            <p className="p-4 text-sm text-ink-2">No events yet.</p>
          )}
          {history.map((e) => (
            <div key={e.id} className="border-b border-hairline p-3 text-sm last:border-0">
              <span className="font-medium text-ink">{e.action}</span>
              <span className="ml-2 text-ink-3">
                {e.actorType}
                {e.actorId ? ` (${e.actorId.slice(0, 8)})` : ""}
              </span>
              <span className="float-right text-xs text-ink-3">
                {fmtLocal(new Date(e.createdAt), p.timezone)}
              </span>
              {Object.keys(e.metadata as object).length > 0 && (
                <div className="mt-1 text-xs text-ink-2">
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
