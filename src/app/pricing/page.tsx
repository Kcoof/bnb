import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { Icon } from "@/components/Icon";
import { PlanPicker } from "./PlanPicker";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const member = await requireOrgMember();
  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="text-center">
          <h1 className="text-title-1">Pick your plan</h1>
          <p className="mt-2 text-callout text-ink-2">Sign in first, then choose a plan.</p>
          <Link href="/login" className="btn btn-primary btn-md mt-6">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const { canceled } = await searchParams;
  const sub = (
    await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, member.profile.orgId))
      .limit(1)
  )[0];

  return (
    <main className="mx-auto max-w-[1024px] px-6 py-12">
      <h1 className="text-center text-title-1">Choose your plan</h1>
      <p className="mx-auto mt-2 max-w-md text-center text-callout text-ink-2">
        Set up takes about 5 minutes — right after this.
      </p>
      {canceled && (
        <p className="mx-auto mt-3 max-w-md text-center text-footnote text-ink-3">
          Checkout canceled — nothing was charged.
        </p>
      )}
      <PlanPicker
        currentPlan={sub?.plan ?? null}
        status={sub?.status ?? null}
        billingConfigured={Boolean(process.env.STRIPE_SECRET_KEY)}
      />
      <div className="mt-8 space-y-2 text-center">
        {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => (
          <p key={id} className="text-caption-1 text-ink-3">
            {PLANS[id].name} — ${PLANS[id].priceMonthly}/mo · up to {PLANS[id].propertyLimit} properties
          </p>
        ))}
      </div>
      {sub && (
        <p className="mt-6 text-center text-footnote text-ink-2">
          Current plan: <b>{PLANS[sub.plan as keyof typeof PLANS]?.name ?? sub.plan}</b> · status {sub.status}
          {sub.currentPeriodEnd &&
            ` · renews ${new Date(sub.currentPeriodEnd).toISOString().slice(0, 10)}`}{" "}
          · <Icon name="check" size={12} className="inline" />{" "}
          <Link href="/settings" className="text-accent hover:underline">
            manage in Settings
          </Link>
        </p>
      )}
    </main>
  );
}
