"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { organizations, profiles } from "@/lib/db/schema";
import { logEvent } from "@/lib/audit";

// AUTOMI auth (spec §1): Google OAuth primary, email OTP fallback.
// No passwords anywhere in the new-user flow. First login auto-creates the
// org + owner profile (there is no signup form with an org name anymore).

async function ensureOrgForUser(userId: string, email: string, fullName?: string) {
  const existing = (
    await db.select().from(profiles).where(eq_(profiles.id, userId)).limit(1)
  )[0];
  if (existing) return existing;

  const displayName = fullName?.trim() || email.split("@")[0];
  const org = (
    await db
      .insert(organizations)
      .values({ name: `${displayName}'s stays` })
      .returning()
  )[0];
  // concurrent first-login race: if another request already created this
  // profile, drop our just-made org and reuse the winner's
  const inserted = await db
    .insert(profiles)
    .values({
      id: userId,
      orgId: org.id,
      fullName: displayName,
      email,
      role: "owner",
    })
    .onConflictDoNothing({ target: profiles.id })
    .returning();
  let profile = inserted[0];
  if (!profile) {
    await db.delete(organizations).where(eq_(organizations.id, org.id));
    profile = (
      await db.select().from(profiles).where(eq_(profiles.id, userId)).limit(1)
    )[0];
    return profile;
  }

  await logEvent({
    orgId: org.id,
    actorType: "host",
    actorId: userId,
    entity: "org",
    entityId: org.id,
    action: "org.created",
    metadata: { via: "oauth_or_otp" },
  });
  return profile;
}

// tiny local eq import shim to keep the import list tidy
import { eq as eq_ } from "drizzle-orm";

/** Google OAuth — called from the login page button. */
export async function googleSignInAction(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  if (data.url) redirect(data.url);
}

/** Step 1 of OTP: send the 6-digit code to the email. */
export async function sendOtpAction(input: {
  email: string;
}): Promise<{ error?: string; sent?: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { sent: true };
}

/** Step 2 of OTP: verify the code — verifies + signs in in one step. */
export async function verifyOtpAction(input: {
  email: string;
  token: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: input.email.trim().toLowerCase(),
    token: input.token.trim(),
    type: "email",
  });
  if (error) return { error: error.message };
  redirect("/auth/callback");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Legacy password sign-in kept ONLY for the pre-launch owner account; not
// reachable from the default UI flow (spec §1: no passwords for new users).
export async function signInPasswordAction(input: {
  email: string;
  password: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) return { error: error.message };
  redirect("/auth/callback");
}

export { ensureOrgForUser };
