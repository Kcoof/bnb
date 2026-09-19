"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { organizations, profiles } from "@/lib/db/schema";
import { logEvent } from "@/lib/audit";

// Signup creates org + profile via the admin client in one action —
// avoids the RLS chicken-and-egg (plan §3.1 "simpler alternative").

export async function signUpAction(input: {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
}): Promise<{ error?: string }> {
  const email = input.email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (authError) return { error: authError.message };
  const userId = authData.user.id;

  try {
    const org = (
      await db.insert(organizations).values({ name: input.orgName.trim() }).returning()
    )[0];

    await db.insert(profiles).values({
      id: userId,
      orgId: org.id,
      fullName: input.fullName.trim(),
      email,
      role: "owner",
    });

    await logEvent({
      orgId: org.id,
      actorType: "host",
      actorId: userId,
      entity: "org",
      entityId: org.id,
      action: "org.created",
    });
  } catch (err) {
    // partial-failure cleanup (review minor): don't orphan an auth user with
    // no profile — delete it so the signup can be retried cleanly
    await admin.auth.admin.deleteUser(userId);
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? ` (${err.cause.message})`
        : "";
    return {
      error: `Signup failed: ${err instanceof Error ? err.message : "unknown error"}${cause}`,
    };
  }

  // sign in immediately
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
