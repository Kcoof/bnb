import { NextRequest } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { db } from "@/lib/db";
import {
  conversations,
  escalations,
  messages,
  properties,
  propertyKnowledge,
} from "@/lib/db/schema";
import { validateGuestToken } from "@/lib/tokens";
import { buildSystemPrompt, prefilterHit } from "@/lib/ai/prompt";
import { aiClient, aiModel, escalateTool } from "@/lib/ai/client";
import { inngest } from "@/lib/inngest/client";

export const maxDuration = 60;

// Guest chat — plan §1.4/§4. Streaming plain-text response; persistence and
// escalation happen after the stream completes.

const MIN_INTERVAL_MS = 8_000; // ≥8s between guest messages
const MAX_PER_DAY = 60; // ≤60 guest msgs / 24h
const MAX_CHARS = 2000;

// Instant emergency path — matches the emergency subset of the pre-filter
const EMERGENCY_RE =
  /\b(fire|gas leak|smoke|break[- ]?in|burglar|intruder|medical emergency|ambulance|can'?t breathe|bleeding|unconscious|seizure|stroke|heart attack|dying|police|danger|unsafe|help me now)\b/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await validateGuestToken(token);
  if (!ctx) {
    return Response.json({ error: "link_not_active" }, { status: 404 });
  }
  const { reservation } = ctx;

  const body = (await request.json().catch(() => null)) as
    | { message?: string }
    | null;
  const guestMessage = (body?.message ?? "").trim();
  if (!guestMessage) {
    return Response.json({ error: "empty_message" }, { status: 400 });
  }
  if (guestMessage.length > MAX_CHARS) {
    return Response.json({ error: "message_too_long" }, { status: 413 });
  }

  // conversation row must exist (created with the reservation)
  const convRow = (
    await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.reservationId, reservation.id))
      .limit(1)
  )[0];
  if (!convRow) {
    return Response.json({ error: "link_not_active" }, { status: 404 });
  }
  const conversationId = convRow.id;

  // rate limits (§1.4): ≥8s since last GUEST message, not last message of any role
  const lastGuest = (
    await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.role, "guest"),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(1)
  )[0];
  if (
    lastGuest &&
    Date.now() - new Date(lastGuest.createdAt).getTime() < MIN_INTERVAL_MS
  ) {
    return Response.json({ error: "too_fast" }, { status: 429 });
  }
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const daily = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.role, "guest"),
        gte(messages.createdAt, dayAgo),
      ),
    );
  if ((daily[0]?.count ?? 0) >= MAX_PER_DAY) {
    return Response.json({ error: "daily_limit" }, { status: 429 });
  }

  // persist the guest message before calling the model (§4.6)
  await db.insert(messages).values({
    orgId: reservation.orgId,
    conversationId,
    role: "guest",
    content: guestMessage,
  });
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      hostUnreadCount: sql`${conversations.hostUnreadCount} + 1`,
    })
    .where(eq(conversations.id, conversationId));

  const { system, history, meta } = await buildSystemPrompt(reservation.id);
  const flagged = prefilterHit(guestMessage);

  // ── Emergency fast-path (Automi spec): fire/gas/medical/security keywords
  // get an instant KB-based response and an immediate high-urgency host alert.
  // No model call — do not wait for the AI.
  if (EMERGENCY_RE.test(guestMessage)) {
    const kbRow = (
      await db
        .select({ emergencyInfo: propertyKnowledge.emergencyInfo, assistantName: properties.assistantName })
        .from(properties)
        .innerJoin(propertyKnowledge, eq(propertyKnowledge.propertyId, properties.id))
        .where(eq(properties.id, reservation.propertyId))
        .limit(1)
    )[0];
    const emergencyText = [
      "🚨 If you are in immediate danger, please call your local emergency number (e.g. 112 / 911) FIRST.",
      kbRow?.emergencyInfo?.trim()
        ? `\n\nEmergency information for this property:\n${kbRow.emergencyInfo.trim()}`
        : "",
      "\n\nI've also alerted your host right away — they are being notified now.",
    ]
      .join("")
      .trim();

    await db.insert(messages).values({
      orgId: reservation.orgId,
      conversationId,
      role: "assistant",
      content: emergencyText,
      model: "emergency-fastpath",
      escalated: true,
      escalationReason: "emergency",
    });
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
    const insertedEsc = await db
      .insert(escalations)
      .values({
        orgId: reservation.orgId,
        source: "chat",
        conversationId,
        reason: "emergency",
        summary: guestMessage.slice(0, 200),
        urgency: "high",
      })
      .returning({ id: escalations.id });
    if (insertedEsc[0]) {
      await inngest.send({
        name: "escalation/created",
        data: { escalationId: insertedEsc[0].id },
      });
    }

    return new Response(emergencyText, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    });
  }

  // Map DB roles to API roles: guest→user, assistant→assistant.
  // host rows are skipped — they are already injected in the system prompt
  // as the authoritative HOST MESSAGES section (§4.2).
  // history already contains the just-inserted guest message as its last
  // entry — do NOT append it again.
  const apiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...history
      .filter((h) => h.role !== "host")
      .map((h) => ({ role: h.role === "guest" ? "user" : "assistant", content: h.content }) as ChatCompletionMessageParam),
  ];

  // pre-filter (§4.4): flag, don't decide — the note rides the current message
  if (flagged && apiMessages.length > 1) {
    const lastMsg = apiMessages[apiMessages.length - 1];
    if (lastMsg && lastMsg.role === "user" && typeof lastMsg.content === "string") {
      lastMsg.content += "\n\n[System note: this message may require host attention.]";
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let full = "";
      let escalation: { reason: string; summary: string; urgency: string } | null = null;
      // per-request accumulation of streamed tool-call fragments
      const toolCalls = new Map<number, { id: string; name: string; args: string }>();

      try {
        const completion = await aiClient().chat.completions.create({
          model: aiModel(),
          messages: apiMessages,
          tools: [escalateTool],
          temperature: 0.2,
          max_tokens: 600,
          stream: true,
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) {
            full += delta.content;
            controller.enqueue(encoder.encode(delta.content));
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existing = (toolCalls.get(tc.index ?? 0) ?? {
                id: "",
                name: "",
                args: "",
              });
              if (tc.id) existing.id += tc.id;
              if (tc.function?.name) existing.name += tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;
              toolCalls.set(tc.index ?? 0, existing);
            }
          }
        }

        const toolCall = [...toolCalls.values()].find((t) => t.name === "escalate_to_host");
        if (toolCall) {
          try {
            const args = JSON.parse(toolCall.args || "{}");
            escalation = {
              reason: args.reason ?? "out_of_kb",
              summary: args.summary ?? guestMessage.slice(0, 200),
              urgency: args.urgency === "high" ? "high" : "normal",
            };
          } catch {
            escalation = { reason: "out_of_kb", summary: guestMessage.slice(0, 200), urgency: "normal" };
          }
        }
      } catch (err) {
        // stream error mid-flight → system_note, no fake assistant message (§4.6)
        await db.insert(messages).values({
          orgId: reservation.orgId,
          conversationId,
          role: "system_note",
          content: `AI error: ${err instanceof Error ? err.message : "unknown"}`,
        });
        controller.enqueue(
          new TextEncoder().encode("\n\n(Sorry — a technical hiccup. Please resend your message.)"),
        );
      }

      if (full.trim()) {
        await db.insert(messages).values({
          orgId: reservation.orgId,
          conversationId,
          role: "assistant",
          content: full,
          model: meta.model,
          escalated: escalation !== null,
          escalationReason: escalation?.reason ?? null,
        });
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }

      if (escalation) {
        const inserted = await db
          .insert(escalations)
          .values({
            orgId: reservation.orgId,
            source: "chat",
            conversationId,
            reason: escalation.reason,
            summary: escalation.summary,
            urgency: escalation.urgency,
          })
          .returning({ id: escalations.id });
        if (inserted[0]) {
          await inngest.send({
            name: "escalation/created",
            data: { escalationId: inserted[0].id },
          });
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

