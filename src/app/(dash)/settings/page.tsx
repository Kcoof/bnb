import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { OrgSettingsForm } from "./OrgSettingsForm";

export default async function SettingsPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const org = (
    await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, member.profile.orgId))
      .limit(1)
  )[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-title-1">Settings</h1>
      <nav className="flex gap-2 text-sm">
        <span className="segmented-item segmented-item-active">Organization</span>
        <Link href="/settings/team" className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-ink-2 hover:bg-surface-2">Team</Link>
        <Link href="/settings/templates" className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-ink-2 hover:bg-surface-2">Email templates</Link>
      </nav>
      <OrgSettingsForm
        initial={{
          name: org.name,
          timezone: org.timezone,
          digestHour: org.digestHour,
          senderName: org.senderName,
        }}
      />
    </div>
  );
}
