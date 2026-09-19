import { NextRequest } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { validateGuestToken } from "@/lib/tokens";

export const maxDuration = 30;

// Guest page poll for host replies (§4.6) — every 15s from the chat widget.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await validateGuestToken(token);
  if (!ctx) return Response.json({ error: "link_not_active" }, { status: 404 });

  const afterRaw = request.nextUrl.searchParams.get("after");
  let after: Date | null = null;
  if (afterRaw) {
    const parsed = new Date(afterRaw);
    after = Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const convRow = (
    await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.reservationId, ctx.reservation.id))
      .limit(1)
  )[0];
  if (!convRow) return Response.json({ messages: [] });

  const conditions = [eq(messages.conversationId, convRow.id)];
  if (after) conditions.push(gt(messages.createdAt, after));

  const rows = await db
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
      messages: rows
        .filter((r) => r.role !== "system_note")
        .map((r) => ({ role: r.role, content: r.content, createdAt: r.createdAt })),
    },
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
