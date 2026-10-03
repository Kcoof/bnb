import "server-only";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

// Transactional SMS via Twilio REST API (spec §6) — no SDK, plain fetch.
// Every send is logged to `notifications` (spec §8), success or failure.

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export async function sendSms(input: {
  orgId: string;
  toPhone: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  const log = async (status: string, providerRef?: string, error?: string) => {
    await db.insert(notifications).values({
      orgId: input.orgId,
      toPhone: input.toPhone,
      body: input.body,
      channel: "sms",
      provider: "twilio",
      status,
      providerRef: providerRef ?? null,
      error: error ?? null,
    });
  };

  if (!sid || !token || !from) {
    await log("skipped", undefined, "Twilio not configured");
    return { ok: false, error: "sms_not_configured" };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: input.toPhone, From: from, Body: input.body }),
      },
    );
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      await log("failed", undefined, json.message ?? `HTTP ${res.status}`);
      return { ok: false, error: json.message };
    }
    await log("sent", json.sid);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    await log("failed", undefined, message);
    return { ok: false, error: message };
  }
}
