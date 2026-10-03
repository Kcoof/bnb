import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { applianceTemplates, properties } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const member = await requireOrgMember();
  if (!member) return null;
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
