import "server-only";

// Plans (spec §13) — mirror of the Stripe Products/prices you create.
// property_limit is authoritative for enforcement; Stripe is the source of
// truth for status/period and overwrites these rows via webhook.
export const PLANS = {
  starter: { name: "Starter", priceMonthly: 29, propertyLimit: 3 },
  professional: { name: "Professional", priceMonthly: 79, propertyLimit: 10 },
  business: { name: "Business", priceMonthly: 199, propertyLimit: 30 },
} as const;

export type PlanId = keyof typeof PLANS;

export function planFor(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) return "professional";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  return null;
}

/**
 * Failed-payment grace policy (spec §13): guest chat stays fully live while
 * Stripe retries the card (past_due within GRACE_DAYS of the period end) and
 * pauses only after the final retry window lapses. A guest never loses the
 * concierge mid-stay over a first declined charge.
 */
const GRACE_DAYS = 7;

export async function chatEnabledForOrg(orgId: string): Promise<boolean> {
  const { subscriptions } = await import("@/lib/db/schema");
  const { db } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const sub = (
    await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, orgId))
      .limit(1)
  )[0];
  if (!sub) return true; // no billing row yet (pre-launch/dev)
  if (sub.status === "active" || sub.status === "trialing") return true;
  if (sub.status === "past_due") {
    const cutoff = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).getTime() + GRACE_DAYS * 86400_000
      : Date.now() + 1; // no period info — err on the guest's side
    return Date.now() < cutoff;
  }
  return false; // canceled / unpaid / incomplete_expired
}
