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

// The single hand-off tool — plan §4.1/§4.2.
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
