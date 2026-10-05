import "server-only";
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "bnb-ops",
  eventKey: process.env.INNGEST_EVENT_KEY || undefined,
  signingKey: process.env.INNGEST_SIGNING_KEY || undefined,
});

/**
 * Fire-and-forget event send that never crashes the caller. Without Inngest
 * keys (pre-launch), events are dropped with a log line — the database rows
 * (escalations etc.) are the durable record; the email/SMS side effects
 * simply wait until Inngest is configured.
 */
export async function sendEvent(name: string, data: Record<string, unknown>): Promise<void> {
  if (!process.env.INNGEST_EVENT_KEY) {
    console.warn(`[inngest] not configured — event "${name}" dropped (row-level state remains)`);
    return;
  }
  try {
    await inngest.send({ name, data });
  } catch (err) {
    console.error(`[inngest] send failed for "${name}":`, err instanceof Error ? err.message : err);
  }
}
