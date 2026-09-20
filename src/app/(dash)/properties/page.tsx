import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";

export default async function PropertiesPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const props = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, member.profile.orgId));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Properties</h1>
        <Link
          href="/properties/new"
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"
        >
          + Add property
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {props.length === 0 && (
          <p className="p-4 text-sm text-slate-500">
            No properties yet — set up your first concierge in about 5 minutes.
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
                {p.conciergeToken ? " · QR ready" : ""}
              </div>
            </div>
            <StatusPill status={p.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
