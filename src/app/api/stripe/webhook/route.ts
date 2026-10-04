import { NextRequest } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { PLANS, planFor } from "@/lib/plans";

export const maxDuration = 30;

// Stripe webhook (spec §13): Stripe is the source of truth — this mirror
// exists for property-limit enforcement and the /admin view.
export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) {
    return new Response("billing not configured", { status: 503 });
  }
  const stripe = new Stripe(key);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    return new Response(`invalid signature: ${err instanceof Error ? err.message : ""}`, {
      status: 400,
    });
  }

  const syncFromSubscription = async (sub: Stripe.Subscription) => {
    const orgId = sub.metadata?.orgId;
    if (!orgId) return;
    const item = sub.items.data[0];
    const plan =
      planFor(item?.price.id) ??
      (sub.metadata?.plan === "professional" || sub.metadata?.plan === "business" || sub.metadata?.plan === "starter"
        ? sub.metadata.plan
        : "starter");
    const limit = PLANS[plan].propertyLimit;
    const values = {
      orgId,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status, // active | past_due | canceled | trialing …
      currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
      propertyLimit: limit,
      updatedAt: new Date(),
    };
    await db
      .insert(subscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: subscriptions.orgId,
        set: values,
      });
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        );
        // metadata flows from subscription_data
        await syncFromSubscription(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncFromSubscription(event.data.object);
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
