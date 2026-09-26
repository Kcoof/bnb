import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { Icon } from "@/components/Icon";

export default async function PropertiesPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const props = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, member.profile.orgId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title-1">Properties</h1>
        <Link href="/properties/new" className="btn btn-primary btn-md">
          <Icon name="plus" size={16} />
          Add property
        </Link>
      </div>

      {props.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-accent-tint text-accent">
            <Icon name="house" size={24} />
          </div>
          <h2 className="mt-4 text-title-3">No properties yet</h2>
          <p className="mt-1.5 max-w-xs text-callout text-ink-2">
            Set up your first concierge in about 5 minutes.
          </p>
          <Link href="/properties/new" className="btn btn-primary btn-md mt-6">
            Set up your first concierge
          </Link>
        </div>
      ) : (
        <div className="list-card">
          {props.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="list-row">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">
                <Icon name="house" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-callout font-medium text-ink">{p.name}</span>
                <span className="mt-0.5 block truncate text-footnote text-ink-2">
                  {p.address || "no address"} · check-in {p.checkinTime} · checkout {p.checkoutTime}
                  {p.icsUrl ? " · iCal connected" : ""}
                  {p.conciergeToken ? " · QR ready" : ""}
                </span>
              </span>
              <StatusPill status={p.status} />
              <Icon name="chevronRight" size={16} className="shrink-0 text-ink-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
