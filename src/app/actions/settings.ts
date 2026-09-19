"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailTemplates, organizations, profiles } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/mail";

export async function saveOrgAction(input: {
  name: string;
  timezone: string;
  digestHour: number;
  senderName: string;
}): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  if (member.profile.role === "staff") return { error: "not allowed" };

  await db
    .update(organizations)
    .set({
      name: input.name.trim(),
      timezone: input.timezone || "UTC",
      digestHour: Math.min(23, Math.max(0, input.digestHour)),
      senderName: input.senderName.trim() || "Stay Assistant",
    })
    .where(eq(organizations.id, member.profile.orgId));
  revalidatePath("/settings");
  return {};
}

export async function inviteStaffAction(input: {
  email: string;
  fullName: string;
  role: "admin" | "staff";
}): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  if (member.profile.role !== "owner") return { error: "only the owner can invite" };

  const email = input.email.trim().toLowerCase();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) return { error: error.message };
  if (!data.user?.id) return { error: "invite failed" };

  await db.insert(profiles).values({
    id: data.user.id,
    orgId: member.profile.orgId,
    fullName: input.fullName.trim(),
    email,
    role: input.role,
  });
  revalidatePath("/settings/team");
  return {};
}

export async function saveTemplateAction(input: {
  type: string;
  subject: string;
  body: string;
}): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };

  await db
    .insert(emailTemplates)
    .values({
      orgId: member.profile.orgId,
      type: input.type,
      subject: input.subject.trim(),
      body: input.body,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [emailTemplates.orgId, emailTemplates.type],
      set: { subject: input.subject.trim(), body: input.body, updatedAt: new Date() },
    });
  revalidatePath("/settings/templates");
  return {};
}

export async function sendTestEmailAction(
  to: string,
): Promise<{ error?: string; ok?: boolean }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  const result = await sendEmail({
    to: to.trim(),
    subject: "bnb-ops test email",
    html: "<p>This is a test email from your bnb-ops account. If you can read this, email delivery works.</p>",
  });
  if ("error" in result) return { error: result.error };
  return { ok: true };
}

export async function removeStaffAction(
  profileId: string,
): Promise<{ error?: string }> {
  const member = await requireOrgMember();
  if (!member) return { error: "not signed in" };
  if (member.profile.role !== "owner") return { error: "only the owner can remove" };
  if (profileId === member.profile.id) return { error: "cannot remove yourself" };

  await db
    .delete(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.orgId, member.profile.orgId),
      ),
    );
  revalidatePath("/settings/team");
  return {};
}
