import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { StatusChangeMenu } from "./StatusChangeMenu";

export default async function BoardPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const props = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, member.profile.orgId));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Status board</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {props.map((p) => (
          <div key={p.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{p.name}</span>
              <StatusPill status={p.status} />
            </div>
            <div className="text-xs text-slate-500">
              check-in {p.checkinTime} · checkout {p.checkoutTime} · {p.timezone}
            </div>
            <StatusChangeMenu propertyId={p.id} current={p.status} />
          </div>
        ))}
        {props.length === 0 && (
          <p className="text-sm text-slate-500">
            No properties yet — add one under Properties.
          </p>
        )}
      </div>
    </div>
  );
}
