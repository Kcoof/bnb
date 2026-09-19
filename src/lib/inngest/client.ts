import "server-only";
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "bnb-ops",
  eventKey: process.env.INNGEST_EVENT_KEY || undefined,
  signingKey: process.env.INNGEST_SIGNING_KEY || undefined,
});
