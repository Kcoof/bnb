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
import { aiClient, aiModel, escalateTool, nearbyTool } from "@/lib/ai/client";
import { sendEvent } from "@/lib/inngest/client";
import { searchNearby } from "@/lib/places";
import { chatEnabledForOrg } from "@/lib/plans";

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
  if (!(await chatEnabledForOrg(ctx.reservation.orgId))) {
    return Response.json({ error: "chat_paused" }, { status: 402 });
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

  // ── AI-not-configured guard: fail fast and honestly instead of burning
  // the guest's time on a doomed model call. Escalate so the host still
  // gets the message (spec: graceful degradation of unconfigured envs).
  if (!process.env.AI_API_KEY) {
    const fallbackText =
      "Thanks for the message — I want to make sure you get the right answer, so I'm checking with your host and they'll get back to you shortly.";
    await db.insert(messages).values({
      orgId: reservation.orgId,
      conversationId,
      role: "assistant",
      content: fallbackText,
      model: "unconfigured",
    });
    const esc = await db
      .insert(escalations)
      .values({
        orgId: reservation.orgId,
        source: "chat",
        conversationId,
        reason: "out_of_kb",
        summary: guestMessage.slice(0, 200),
        urgency: "normal",
      })
      .returning({ id: escalations.id });
    if (esc[0]) {
      await sendEvent("escalation/created", { escalationId: esc[0].id },);
    }
    return new Response(fallbackText, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    });
  }

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
      await sendEvent("escalation/created", { escalationId: insertedEsc[0].id },);
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

      const runCompletion = async (
        msgs: ChatCompletionMessageParam[],
        tools: unknown[] = [escalateTool, nearbyTool],
      ) => {
        const completion = await aiClient().chat.completions.create({
          model: aiModel(),
          messages: msgs,
          tools: tools as never[],
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
      };

      const parseEscalation = () => {
        const toolCall = [...toolCalls.values()].find((t) => t.name === "escalate_to_host");
        if (!toolCall) return null;
        try {
          const args = JSON.parse(toolCall.args || "{}");
          return {
            reason: args.reason ?? "out_of_kb",
            summary: args.summary ?? guestMessage.slice(0, 200),
            urgency: args.urgency === "high" ? "high" : "normal",
          };
        } catch {
          return { reason: "out_of_kb", summary: guestMessage.slice(0, 200), urgency: "normal" };
        }
      };

      try {
        // pass 1 — may end with a tool call (nearby_search / escalate)
        await runCompletion(apiMessages);

        // nearby_search (spec §5): live Places lookup, then answer from results.
        // Pass-1 escalate calls are preserved across the second pass (M8).
        const nearbyCall = [...toolCalls.values()].find((t) => t.name === "nearby_search");
        const pass1Escalation = parseEscalation();
        if (nearbyCall) {
          toolCalls.clear();
          let query = "restaurant";
          try {
            query = (JSON.parse(nearbyCall.args || "{}").query as string) || "restaurant";
          } catch {}
          let toolContent: string;
          if (meta.lat !== null && meta.lng !== null) {
            const results = await searchNearby(meta.lat, meta.lng, query);
            toolContent = results
              ? results
                  .map((p) => `${p.name}${p.rating ? ` (rated ${p.rating})` : ""}${p.type ? ` — ${p.type}` : ""}`)
                  .join("\n")
              : "NO_RESULTS";
          } else {
            toolContent = "NO_LOCATION";
          }
          if (toolContent === "NO_RESULTS" || toolContent === "NO_LOCATION") {
            toolContent +=
              " — tell the guest the host will send personal recommendations shortly, then call escalate_to_host (reason: out_of_kb). Do not invent places.";
          }
          const secondMessages: ChatCompletionMessageParam[] = [
            ...apiMessages,
            {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: nearbyCall.id || "nearby",
                  type: "function" as const,
                  function: { name: "nearby_search", arguments: nearbyCall.args || "{}" },
                },
              ],
            },
            {
              role: "tool",
              tool_call_id: nearbyCall.id || "nearby",
              content: toolContent,
            },
          ];
          // pass 2 — answer from the live results (escalate only; no third
          // nearby call possible by construction)
          await runCompletion(secondMessages, [escalateTool]);
        }

        escalation = parseEscalation() ?? pass1Escalation;
      } catch (err) {
        // stream error mid-flight → system_note, no fake assistant message
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
          await sendEvent("escalation/created", { escalationId: inserted[0].id },);
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

