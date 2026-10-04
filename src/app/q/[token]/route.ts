import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, reservations } from "@/lib/db/schema";
import { localDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

// QR resolver (spec §7): the printed QR is permanent, the chat token is not.
// /q/{concierge_token} redirects to the chat token of the current/next stay —
// real reservations (with the −3d token window) win; the always-on concierge
// fallback keeps the QR working between stays. Property-local dates (M19) and
// the shared concierge conversation is trimmed for guest privacy (M7).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const prop = (
    await db
      .select({ id: properties.id, timezone: properties.timezone })
      .from(properties)
      .where(eq(properties.conciergeToken, token))
      .limit(1)
  )[0];
  if (!prop) {
    return Response.redirect(new URL("/", _request.url), 307);
  }

  const today = localDateStr(prop.timezone);
  const windowStart = new Date(today + "T00:00:00Z");
  windowStart.setUTCDate(windowStart.getUTCDate() - 3); // token window: check-in −3d

  // a real reservation covering today wins (knows dates + expiry)
  const covering = (
    await db
      .select({ chatToken: reservations.chatToken })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, prop.id),
          eq(reservations.isConcierge, false),
          eq(reservations.isHold, false),
          ne(reservations.status, "cancelled"),
          lte(reservations.checkIn, today),
          gte(reservations.checkOut, today),
        ),
      )
      .limit(1)
  )[0];

  // next upcoming stay inside the token window
  const upcoming = covering
    ? undefined
    : (
        await db
          .select({ chatToken: reservations.chatToken, checkIn: reservations.checkIn })
          .from(reservations)
          .where(
            and(
              eq(reservations.propertyId, prop.id),
              eq(reservations.isConcierge, false),
              eq(reservations.isHold, false),
              ne(reservations.status, "cancelled"),
              gte(reservations.checkIn, windowStart.toISOString().slice(0, 10)),
            ),
          )
          .orderBy(reservations.checkIn)
          .limit(1)
      )[0];

  if (covering?.chatToken || upcoming?.chatToken) {
    return Response.redirect(
      new URL(`/chat/${(covering ?? upcoming)!.chatToken}`, _request.url),
      307,
    );
  }

  // always-on concierge fallback — trim messages older than 24h so a new
  // guest never sees a previous guest's transcript (M7); the greeting stays
  const fallback = (
    await db
      .select({ chatToken: reservations.chatToken })
      .from(reservations)
      .where(
        and(eq(reservations.propertyId, prop.id), eq(reservations.isConcierge, true)),
      )
      .limit(1)
  )[0];

  if (fallback?.chatToken) {
    const cutoff = new Date(Date.now() - 24 * 3600_000);
    await db.execute(sql`
      delete from messages
      where conversation_id = (
        select c.id from conversations c
        join reservations r on r.id = c.reservation_id
        where r.property_id = ${prop.id} and r.is_concierge = true
        limit 1
      )
      and created_at < ${cutoff.toISOString()}
      and role in ('guest', 'assistant')
    `);
    return Response.redirect(new URL(`/chat/${fallback.chatToken}`, _request.url), 307);
  }

  return Response.redirect(new URL("/", _request.url), 307);
}
