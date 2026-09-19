import { serve } from "inngest/next";
import { NextRequest } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { icsSync } from "@/lib/inngest/f/ics-sync";
import { statusTick } from "@/lib/inngest/f/status-tick";
import { messagesDispatch } from "@/lib/inngest/f/messages-dispatch";
import { digest } from "@/lib/inngest/f/digest";
import {
  reservationCreated,
  escalationCreated,
  guestReply,
  cleanerAssigned,
} from "@/lib/inngest/f/events";

export const maxDuration = 60;

// Fail loudly instead of serving unsigned in production (review M6): a
// missing INNGEST_SIGNING_KEY must never silently open the jobs endpoint.
const handler = serve({
  client: inngest,
  functions: [
    icsSync,
    statusTick,
    messagesDispatch,
    digest,
    reservationCreated,
    escalationCreated,
    guestReply,
    cleanerAssigned,
  ],
});

function guarded(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) {
    return new Response("Inngest signing key not configured", { status: 500 });
  }
  return handler(req, ctx);
}

export const GET = guarded;
export const POST = guarded;
export const PUT = guarded;
