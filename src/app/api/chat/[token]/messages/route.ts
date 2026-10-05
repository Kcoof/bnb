import { NextRequest } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages, properties, reservations } from "@/lib/db/schema";
import { TOKEN_PRE_DAYS, TOKEN_POST_DAYS } from "@/lib/tokens";

export const maxDuration = 30;

// Guest poll (every 15s) — PERF-PLAN §1.5: one JOIN instead of three queries.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const after = request.nextUrl.searchParams.get("after");

  const rows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .innerJoin(reservations, eq(conversations.reservationId, reservations.id))
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(
      and(
        eq(reservations.chatToken, token),
        eq(reservations.isHold, false),
        sql`(
          ${reservations.isConcierge}
          or (
            ${reservations.status} in ('upcoming', 'arrived')
            and ${reservations.checkIn} <= current_date + ${TOKEN_PRE_DAYS}
            and ${reservations.checkOut} >= current_date - ${TOKEN_POST_DAYS}
          )
        )`,
      ),
    )
    .limit(1);

  const convId = rows[0]?.id;
  if (!convId) return Response.json({ messages: [] });

  const conditions = [eq(messages.conversationId, convId)];
  if (after) {
    const parsed = new Date(after);
    if (!Number.isNaN(parsed.getTime())) conditions.push(gt(messages.createdAt, parsed));
  }

  const list = await db
    .select({
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(and(...conditions))
    .orderBy(messages.createdAt);

  return Response.json(
    {
      messages: list
        .filter((r) => r.role !== "system_note")
        .map((r) => ({ role: r.role, content: r.content, createdAt: r.createdAt })),
    },
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
