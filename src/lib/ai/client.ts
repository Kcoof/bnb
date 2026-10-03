import "server-only";
import OpenAI from "openai";

// OpenAI-compatible chat model — plan §4.1. Swapping providers is an env change.
export function aiModel(): string {
  return process.env.AI_MODEL ?? "gpt-4o-mini";
}

export function aiClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_API_KEY ?? "",
    baseURL: process.env.AI_BASE_URL || undefined,
    timeout: 30_000,
    maxRetries: 1,
  });
}

// The two tools the concierge has (spec §5-6):
// 1. nearby_search — live Google Places lookup, never AI-invented.
// 2. escalate_to_host — hands off to the human (SMS alert).
export const nearbyTool = {
  type: "function" as const,
  function: {
    name: "nearby_search",
    description:
      "Search for real places near the property (restaurants, cafes, pharmacies, ATMs, grocery stores, attractions). Call this for ANY 'what's nearby / where can I eat / is there a pharmacy' question. Say nothing before calling — answer only from the results.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Short English search term, e.g. 'restaurant', 'pharmacy', 'ATM'.",
        },
      },
      required: ["query"],
    },
  },
};

export const escalateTool = {
  type: "function" as const,
  function: {
    name: "escalate_to_host",
    description:
      "Notify the human host about this guest matter. Call instead of answering whenever a hard rule applies or the knowledge does not cover the question.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          enum: [
            "money",
            "complaint",
            "maintenance",
            "emergency",
            "human_request",
            "out_of_kb",
          ],
        },
        summary: {
          type: "string",
          description: "1–2 sentences of what the guest needs.",
        },
        urgency: {
          type: "string",
          enum: ["normal", "high"],
          description: '"high" only for safety/security/urgent maintenance.',
        },
      },
      required: ["reason", "summary", "urgency"],
    },
  },
};
