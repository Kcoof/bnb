"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteStaffAction } from "@/app/actions/settings";

export function InviteForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setOk(false);
    const result = await inviteStaffAction({
      email: String(formData.get("email") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      role: (String(formData.get("role") ?? "staff") as "staff"),
    });
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setOk(true);
      router.refresh();
    }
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-medium text-slate-900">Invite staff</h2>
      <p className="text-xs text-slate-500">
        They receive a Supabase invite email and land in this organization on first login.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input name="fullName" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Role</label>
          <select name="role" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">Invite sent ✓</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
        {pending ? "Inviting…" : "Send invite"}
      </button>
    </form>
  );
}
