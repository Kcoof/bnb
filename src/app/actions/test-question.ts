"use server";

import { and, eq } from "drizzle-orm";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { db } from "@/lib/db";
import { properties, propertyKnowledge, reservations } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { aiClient, aiModel, escalateTool } from "@/lib/ai/client";
import { buildSystemPrompt } from "@/lib/ai/prompt";

// "Test AI question" — runs a guest-style question through the exact prompt
// the guest chat uses, against a synthetic current reservation. Nothing is
// persisted; no conversation is created.

export async function testQuestionAction(
  propertyId: string,
  question: string,
): Promise<{ answer?: string; escalated?: boolean; error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };

  const prop = (
    await db
      .select()
      .from(properties)
      .where(
        and(eq(properties.id, propertyId), eq(properties.orgId, member.profile.orgId)),
      )
      .limit(1)
  )[0];
  if (!prop) return { error: "property not found" };

  // find any reservation of this property to satisfy the prompt builder;
  // if none exists, create the prompt directly from property data
  const anyResv = (
    await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.propertyId, propertyId))
      .limit(1)
  )[0];

  let system: string;
  if (anyResv) {
    system = (await buildSystemPrompt(anyResv.id)).system;
  } else {
    const kb = (
      await db
        .select()
        .from(propertyKnowledge)
        .where(eq(propertyKnowledge.propertyId, propertyId))
        .limit(1)
    )[0];
    const today = new Date().toISOString().slice(0, 10);
    system = `You are ${prop.assistantName}, the virtual assistant for guests staying at
${prop.name}. You are talking to the guest, staying from ${today} to ${today}.
Checkout time is ${prop.checkoutTime}.

Answer using ONLY the knowledge below. If the answer is not there, say you'll
check with the host and call escalate_to_host. Never guess. Apply the same hard
rules as the guest assistant (money/complaints/maintenance/emergencies/exceptions
→ escalate; reply in the guest's language).

== PROPERTY KNOWLEDGE ==
Wifi network: ${kb?.wifiNetwork ?? ""}
Wifi password: ${kb?.wifiPassword ?? ""}
Door / key access code: ${kb?.doorCode ?? ""}
Check-in instructions: ${kb?.checkinInstructions ?? ""}
Check-out instructions: ${kb?.checkoutInstructions ?? ""}
Parking: ${kb?.parking ?? ""}
House rules: ${kb?.houseRules ?? ""}
Appliances & how-tos: ${kb?.appliances ?? ""}
Emergency info: ${kb?.emergencyInfo ?? ""}
Late checkout policy: ${kb?.lateCheckoutPolicy ?? ""}
Nearby & directions: ${kb?.nearby ?? ""}`;
  }

  const apiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: question },
  ];

  try {
    const completion = await aiClient().chat.completions.create({
      model: aiModel(),
      messages: apiMessages,
      tools: [escalateTool],
      temperature: 0.2,
      max_tokens: 600,
    });
    const choice = completion.choices[0];
    const toolCalled = choice?.message?.tool_calls?.some((tc) =>
      (tc as { function?: { name?: string } }).function?.name === "escalate_to_host",
    );
    return {
      answer: choice?.message?.content ?? "(no content)",
      escalated: Boolean(toolCalled),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI call failed" };
  }
}
