import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { InviteForm } from "./InviteForm";
import { RemoveStaffButton } from "./RemoveStaffButton";

export default async function TeamPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const team = await db
    .select()
    .from(profiles)
    .where(eq(profiles.orgId, member.profile.orgId));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-title-1">Team</h1>
      <nav className="flex gap-2 text-sm">
        <Link href="/settings" className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-ink-2 hover:bg-surface-2">Organization</Link>
        <span className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white">Team</span>
        <Link href="/settings/templates" className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-ink-2 hover:bg-surface-2">Email templates</Link>
      </nav>

      <div className="overflow-hidden card">
        {team.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-b border-hairline p-4 last:border-0">
            <div>
              <div className="font-semibold text-ink">
                {p.fullName || p.email}{" "}
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-2">
                  {p.role}
                </span>
              </div>
              <div className="text-xs text-ink-2">{p.email}</div>
            </div>
            {member.profile.role === "owner" && p.id !== member.profile.id && (
              <RemoveStaffButton profileId={p.id} />
            )}
          </div>
        ))}
      </div>

      {member.profile.role === "owner" ? (
        <InviteForm />
      ) : (
        <p className="text-sm text-ink-2">Only the owner can invite staff.</p>
      )}
    </div>
  );
}
