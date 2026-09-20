import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, reservations } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { NewReservationForm } from "./NewReservationForm";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; status?: string }>;
}) {
  const member = await requireOrgMember();
  if (!member) return null;
  const { property: propertyFilter, status: statusFilter } = await searchParams;

  const props = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, member.profile.orgId));

  const conditions = [eq(reservations.orgId, member.profile.orgId)];
  if (propertyFilter) conditions.push(eq(reservations.propertyId, propertyFilter));
  if (statusFilter) conditions.push(eq(reservations.status, statusFilter as "upcoming"));
  // hide the synthetic always-on stay behind the property QR
  conditions.push(eq(reservations.isConcierge, false));

  const rows = await db
    .select({ r: reservations, p: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(and(...conditions))
    .orderBy(desc(reservations.checkIn))
    .limit(200);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reservations</h1>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/reservations"
          className={`rounded-full px-3 py-1 ${!propertyFilter && !statusFilter ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
        >
          All
        </Link>
        {props.map((p) => (
          <Link
            key={p.id}
            href={`/reservations?property=${p.id}`}
            className={`rounded-full px-3 py-1 ${propertyFilter === p.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            {p.name}
          </Link>
        ))}
        {["upcoming", "arrived", "departed", "cancelled"].map((s) => (
          <Link
            key={s}
            href={`/reservations?status=${s}${propertyFilter ? `&property=${propertyFilter}` : ""}`}
            className={`rounded-full px-3 py-1 ${statusFilter === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-2">Guest</th>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">Dates</th>
              <th className="px-4 py-2">Channel</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, p }) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/reservations/${r.id}`} className="font-medium text-slate-900 hover:underline">
                    {r.isHold ? "— (blocked dates)" : (r.guestName ?? "(no name)")}
                  </Link>
                  {!r.isHold && !r.guestEmail && (
                    <div className="text-xs text-amber-600">no email</div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{p.name}</td>
                <td className="px-4 py-2 text-slate-600">
                  {r.checkIn} → {r.checkOut}
                </td>
                <td className="px-4 py-2 text-slate-500">{r.channel}</td>
                <td className="px-4 py-2">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No reservations — sync a property&apos;s iCal or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NewReservationForm properties={props.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
