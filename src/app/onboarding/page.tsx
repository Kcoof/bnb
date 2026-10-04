import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { applianceTemplates, properties, subscriptions } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  // spec §13: pay before onboarding — when billing is configured, an org
  // without a subscription goes to the plan picker first (pre-launch dev
  // without Stripe keys skips this gate)
  if (process.env.STRIPE_SECRET_KEY) {
    const sub = (
      await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.orgId, member.profile.orgId))
        .limit(1)
    )[0];
    if (!sub) redirect("/pricing");
  }
  const templates = await db
    .select()
    .from(applianceTemplates)
    .orderBy(applianceTemplates.sortOrder);
  const count = (
    await db
      .select({ n: sql<number>`count(*)::int` })
      .from(properties)
      .where(eq(properties.orgId, member.profile.orgId))
  )[0]?.n ?? 0;

  return <OnboardingWizard templates={templates} propertyCount={count} />;
}
