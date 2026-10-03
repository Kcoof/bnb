import { NextRequest } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";

export const maxDuration = 30;

// Checkout (spec §13): pay BEFORE onboarding. The success redirect lands on
// /onboarding only after payment succeeds.
export async function POST(request: NextRequest) {
  const member = await requireOrgMember();
  if (!member) return Response.json({ error: "unauthorized" }, { status: 401 });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const stripe = new Stripe(key);

  const body = (await request.json().catch(() => null)) as { plan?: string } | null;
  const plan = body?.plan;
  const priceId =
    plan === "professional"
      ? process.env.STRIPE_PRICE_PROFESSIONAL
      : plan === "business"
        ? process.env.STRIPE_PRICE_BUSINESS
        : process.env.STRIPE_PRICE_STARTER;
  if (!priceId) {
    return Response.json({ error: "plan_price_not_configured" }, { status: 503 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  // reuse the Stripe customer if we have one
  const existing = (
    await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, member.profile.orgId))
      .limit(1)
  )[0];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: member.profile.orgId,
    customer: existing?.stripeCustomerId ?? undefined,
    customer_email: existing?.stripeCustomerId ? undefined : member.email,
    metadata: { orgId: member.profile.orgId, plan: plan ?? "starter" },
    subscription_data: { metadata: { orgId: member.profile.orgId, plan: plan ?? "starter" } },
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?canceled=1`,
  });

  return Response.json({ url: session.url });
}
