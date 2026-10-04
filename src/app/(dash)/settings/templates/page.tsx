import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { TemplateEditor } from "./TemplateEditor";

const TYPES = [
  { id: "welcome", label: "Welcome", subject: "Your stay at {{propertyName}} — meet your assistant" },
  { id: "checkin", label: "Check-in instructions", subject: "Everything you need for check-in at {{propertyName}} ({{checkIn}})" },
  { id: "checkout", label: "Checkout instructions", subject: "Checkout on {{checkOut}} at {{checkoutTime}} — quick checklist" },
];

export default async function TemplatesPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const overrides = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.orgId, member.profile.orgId));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-title-1">Email templates</h1>
      <nav className="flex gap-2 text-sm">
        <Link href="/settings" className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-ink-2 hover:bg-surface-2">Organization</Link>
                <span className="segmented-item segmented-item-active">Email templates</span>
      </nav>

      <p className="text-sm text-ink-2">
        Overrides use HTML with placeholders: {"{{guestFirstName}} {{propertyName}} {{checkIn}} {{checkOut}} {{checkinTime}} {{checkoutTime}} {{chatUrl}} {{assistantName}} {{orgName}}"} and any knowledge-base field. Leave empty to keep the system default.
      </p>

      {TYPES.map((t) => {
        const override = overrides.find((o) => o.type === t.id);
        return (
          <TemplateEditor
            key={t.id}
            type={t.id}
            label={t.label}
            defaultSubject={t.subject}
            initialSubject={override?.subject ?? ""}
            initialBody={override?.body ?? ""}
          />
        );
      })}
    </div>
  );
}
