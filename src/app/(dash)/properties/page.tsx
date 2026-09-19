import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { NewPropertyForm } from "./NewPropertyForm";

export default async function PropertiesPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const props = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, member.profile.orgId));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Properties</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {props.length === 0 && (
          <p className="p-4 text-sm text-slate-500">
            No properties yet — add your first one below.
          </p>
        )}
        {props.map((p) => (
          <Link
            key={p.id}
            href={`/properties/${p.id}`}
            className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50"
          >
            <div>
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-500">
                {p.address || "no address"} · check-in {p.checkinTime} · checkout{" "}
                {p.checkoutTime}
                {p.icsUrl ? " · iCal connected" : ""}
              </div>
            </div>
            <StatusPill status={p.status} />
          </Link>
        ))}
      </div>

      <NewPropertyForm />
    </div>
  );
}
