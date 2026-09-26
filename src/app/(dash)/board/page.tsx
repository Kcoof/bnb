import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { Icon } from "@/components/Icon";
import { StatusChangeMenu } from "./StatusChangeMenu";

export default async function BoardPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const props = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, member.profile.orgId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-1">Status board</h1>
        <p className="mt-0.5 text-footnote text-ink-2">
          Live status of every property
        </p>
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
            Add property
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.map((p) => (
            <div key={p.id} className="space-y-3 rounded-lg border border-hairline bg-surface p-5 shadow-card transition duration-300 ease-out hover:-translate-y-1 hover:shadow-raised">
              <div className="flex items-start justify-between gap-2">
                <span className="text-title-3">{p.name}</span>
                <StatusPill status={p.status} />
              </div>
              <div className="flex items-center gap-3 text-footnote text-ink-2">
                <span className="flex items-center gap-1">
                  <Icon name="clock" size={14} />
                  {p.checkinTime} → {p.checkoutTime}
                </span>
                <span>{p.timezone}</span>
              </div>
              <StatusChangeMenu propertyId={p.id} current={p.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
