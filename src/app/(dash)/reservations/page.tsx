import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, reservations } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { Icon } from "@/components/Icon";
import { NewReservationForm } from "./NewReservationForm";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; status?: string }>;
}) {
  const member = await requireOrgMember();
  if (!member) return null;
  const { property: propertyFilter, status: statusFilter } = await searchParams;

  const propsPromise = db
    .select()
    .from(properties)
    .where(eq(properties.orgId, member.profile.orgId));

  const conditions = [eq(reservations.orgId, member.profile.orgId)];
  if (propertyFilter) conditions.push(eq(reservations.propertyId, propertyFilter));
  if (statusFilter) conditions.push(eq(reservations.status, statusFilter as "upcoming"));
  // hide the synthetic always-on stay behind the property QR
  conditions.push(eq(reservations.isConcierge, false));

  const [props, rows] = await Promise.all([
    propsPromise,
    db
      .select({ r: reservations, p: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(and(...conditions))
      .orderBy(desc(reservations.checkIn))
      .limit(200),
  ]);

  const chip = (active: boolean) =>
    `h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium inline-flex items-center transition duration-150 active:scale-[0.96] ${
      active
        ? "bg-ink text-white"
        : "border border-hairline bg-surface text-ink-2 hover:text-ink hover:border-line"
    }`;

  return (
    <div className="space-y-6">
      <h1 className="text-title-1">Reservations</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link href="/reservations" className={chip(!propertyFilter && !statusFilter)}>
          All
        </Link>
        {props.map((p) => (
          <Link
            key={p.id}
            href={`/reservations?property=${p.id}`}
            className={chip(propertyFilter === p.id)}
          >
            {p.name}
          </Link>
        ))}
        {["upcoming", "arrived", "departed", "cancelled"].map((s) => (
          <Link
            key={s}
            href={`/reservations?status=${s}${propertyFilter ? `&property=${propertyFilter}` : ""}`}
            className={chip(statusFilter === s)}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-hairline bg-surface shadow-card lg:block">
        <table className="w-full text-callout">
          <thead>
            <tr className="border-b border-hairline text-left text-[12px] font-medium text-ink-2">
              <th className="px-5 py-3">Guest</th>
              <th className="px-5 py-3">Property</th>
              <th className="px-5 py-3">Dates</th>
              <th className="px-5 py-3">Channel</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, p }) => (
              <tr key={r.id} className="h-14 border-b border-hairline transition duration-150 last:border-0 hover:bg-black/[0.02]">
                <td className="px-5 font-medium text-ink">
                  <Link href={`/reservations/${r.id}`} className="hover:text-accent">
                    {r.isHold ? "— (blocked dates)" : (r.guestName ?? "(no name)")}
                  </Link>
                  {!r.isHold && !r.guestEmail && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[12px] text-warning">
                      <Icon name="alert" size={12} /> no email
                    </span>
                  )}
                </td>
                <td className="px-5 text-ink-2">{p.name}</td>
                <td className="px-5 tabular-nums text-ink-2">
                  {r.checkIn} → {r.checkOut}
                </td>
                <td className="px-5 text-ink-2">{r.channel}</td>
                <td className="px-5">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-callout text-ink-2">
                  No reservations — sync a property&apos;s iCal or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile list-cards */}
      <div className="list-card lg:hidden">
        {rows.map(({ r, p }) => (
          <Link key={r.id} href={`/reservations/${r.id}`} className="list-row">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-callout font-medium text-ink">
                {r.isHold ? "— (blocked dates)" : (r.guestName ?? "(no name)")}
              </span>
              <span className="mt-0.5 block text-footnote text-ink-2">
                {p.name} · {r.checkIn} → {r.checkOut} · {r.channel}
              </span>
            </span>
            <StatusPill status={r.status} />
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="py-8 text-center text-callout text-ink-2">
            No reservations — sync a property&apos;s iCal or add one manually.
          </p>
        )}
      </div>

      <NewReservationForm properties={props.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
