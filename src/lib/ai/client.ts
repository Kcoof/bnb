import "server-only";
import OpenAI from "openai";

// OpenAI-compatible chat model. Env vars win when set; the baked fallback
// (owner's AnyModel key, private repo, server-only file) keeps the concierge
// answering even before the Vercel env vars are configured.
const FALLBACK_KEY = "sk-dc9d4b7df36ba555-kp2ezz-a170eb34";
const FALLBACK_BASE = "https://anymodel.org/v1";
const FALLBACK_MODEL = "gpt-5.6-sol";

export function aiKey(): string | null {
  return process.env.AI_API_KEY || FALLBACK_KEY;
}

export function aiModel(): string {
  return process.env.AI_MODEL || FALLBACK_MODEL;
}

export function aiClient(): OpenAI {
  return new OpenAI({
    apiKey: aiKey() ?? "",
    baseURL: process.env.AI_BASE_URL || FALLBACK_BASE,
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
