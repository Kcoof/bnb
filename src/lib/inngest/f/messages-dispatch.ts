import { and, eq, inArray, sql } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { reservations, scheduledMessages } from "@/lib/db/schema";
import { renderEmail, sendEmail, templateVars } from "@/lib/mail";

// Claim & send due scheduled_messages — plan §5.4.
//
// Idempotency / duplicate-email safety (review M2):
// 1. Claim in a short transaction: FOR UPDATE SKIP LOCKED + status→'sending'
//    + claimed_at=now(), committed BEFORE any network call.
// 2. Send outside the transaction — a throw can no longer roll back rows
//    that were already delivered.
// 3. Finalize conditionally (from 'sending') per row.
// 4. Stale 'sending' rows (claimed >10 min ago — crashed worker) are
//    re-claimable; that window is the only duplicate-email risk, accepted.

export const messagesDispatch = inngest.createFunction(
  { id: "messages-dispatch", triggers: [{ cron: "*/5 * * * *" }] },
  async () => {
    const outcome = { sent: 0, skipped: 0, failed: 0 };

    // 1) claim (short tx, no network inside)
    const claimedIds = await db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        select id from scheduled_messages
        where (
          (status = 'pending' and send_at <= now())
          or (status = 'sending' and claimed_at < now() - interval '10 minutes')
        )
        order by send_at asc
        limit 50
        for update skip locked
      `);
      const ids = (rows as unknown as { id: string }[]).map((r) => r.id);
      if (ids.length > 0) {
        await tx
          .update(scheduledMessages)
          .set({ status: "sending", claimedAt: new Date() })
          .where(inArray(scheduledMessages.id, ids));
      }
      return ids;
    });
    if (claimedIds.length === 0) return outcome;

    // 2) process each row outside the claim transaction
    for (const id of claimedIds) {
      const row = (
        await db
          .select()
          .from(scheduledMessages)
          .where(eq(scheduledMessages.id, id))
          .limit(1)
      )[0];
      if (!row || row.status !== "sending") continue;

      const finalize = async (patch: Partial<typeof scheduledMessages.$inferInsert>) => {
        await db
          .update(scheduledMessages)
          .set(patch)
          .where(
            and(eq(scheduledMessages.id, id), eq(scheduledMessages.status, "sending")),
          );
      };

      const resv = (
        await db
          .select()
          .from(reservations)
          .where(eq(reservations.id, row.reservationId))
          .limit(1)
      )[0];

      // reservation cancelled → suppressed, not failed (§5.2, review M3)
      if (resv?.status === "cancelled") {
        await finalize({ status: "skipped", error: "reservation cancelled" });
        outcome.skipped++;
        continue;
      }

      // No guest email (the common channel-iCal case, D3) → skipped, not failed
      if (!resv?.guestEmail) {
        await finalize({ status: "skipped", error: "no guest email (channel iCal)" });
        outcome.skipped++;
        continue;
      }

      // Welcome is pointless if check-in is < 48h away (§5.2)
      if (row.type === "welcome") {
        const ci = new Date(resv.checkIn + "T00:00:00Z").getTime();
        if (ci - Date.now() < 48 * 3600_000) {
          await finalize({ status: "skipped", error: "check-in under 48h" });
          outcome.skipped++;
          continue;
        }
      }

      try {
        const vars = await templateVars(row.reservationId);
        const { subject, html } = await renderEmail(row.orgId, row.type, vars);
        const result = await sendEmail({ to: resv.guestEmail, subject, html });

        if ("error" in result) {
          const attempts = row.attempts + 1;
          await finalize({
            attempts,
            error: result.error,
            status: attempts >= 5 ? "failed" : "pending",
          });
          outcome.failed++;
        } else {
          await finalize({
            status: "sent",
            sentAt: new Date(),
            resendId: result.id,
            error: null,
          });
          outcome.sent++;
        }
      } catch (err) {
        const attempts = row.attempts + 1;
        await finalize({
          attempts,
          error: err instanceof Error ? err.message : "send threw",
          status: attempts >= 5 ? "failed" : "pending",
        });
        outcome.failed++;
      }
    }

    return outcome;
  },
);
