import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { Icon } from "@/components/Icon";

// After successful payment (spec §13) → onboarding begins.
export default async function BillingSuccessPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const sub = (
    await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, member.profile.orgId))
      .limit(1)
  )[0];

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-sm text-center animate-fade-up">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-tint text-success">
          <Icon name="check" size={28} />
        </div>
        <h1 className="mt-5 text-title-1">You&apos;re in</h1>
        <p className="mt-2 text-callout text-ink-2">
          {sub
            ? `${sub.plan} plan active — up to ${sub.propertyLimit} properties.`
            : "Payment received — your subscription is being confirmed."}
        </p>
        <Link href="/onboarding" className="btn btn-primary btn-lg mt-7 w-full">
          Set up your property
        </Link>
      </div>
    </main>
  );
}
