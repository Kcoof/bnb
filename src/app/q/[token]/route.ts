import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, reservations } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// QR resolver (spec §7): the printed QR is permanent, the chat token is not.
// /q/{concierge_token} redirects to the chat token of the stay that covers
// today — a real reservation when one exists, the always-on concierge
// fallback otherwise (the QR must work for the guest standing in the room).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const prop = (
    await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.conciergeToken, token))
      .limit(1)
  )[0];
  if (!prop) {
    return Response.redirect(new URL("/", _request.url), 307);
  }

  const today = new Date().toISOString().slice(0, 10);

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
          lte(reservations.checkIn, today),
          gte(reservations.checkOut, today),
        ),
      )
      .limit(1)
  )[0];

  if (covering?.chatToken) {
    return Response.redirect(new URL(`/chat/${covering.chatToken}`, _request.url), 307);
  }

  // next upcoming stay within the token window
  const upcoming = (
    await db
      .select({ chatToken: reservations.chatToken, checkIn: reservations.checkIn })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, prop.id),
          eq(reservations.isConcierge, false),
          eq(reservations.isHold, false),
          gte(reservations.checkIn, today),
        ),
      )
      .orderBy(reservations.checkIn)
      .limit(1)
  )[0];
  if (upcoming?.chatToken) {
    return Response.redirect(new URL(`/chat/${upcoming.chatToken}`, _request.url), 307);
  }

  // always-on concierge stay
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
    return Response.redirect(new URL(`/chat/${fallback.chatToken}`, _request.url), 307);
  }

  return Response.redirect(new URL("/", _request.url), 307);
}
