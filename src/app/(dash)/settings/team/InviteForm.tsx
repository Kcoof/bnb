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
    <form action={onSubmit} className="space-y-4 rounded-xl border border-hairline bg-white p-6">
      <h2 className="font-medium text-ink">Invite staff</h2>
      <p className="text-caption-1 text-ink-2">
        They receive a Supabase invite email and land in this organization on first login.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Email</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Name</label>
          <input name="fullName" className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Role</label>
          <select name="role" className="input">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {error && <p className="text-footnote text-danger">{error}</p>}
      {ok && <p className="text-footnote text-success">Invite sent ✓</p>}
      <button type="submit" disabled={pending} className="btn btn-primary btn-md">
        {pending ? "Inviting…" : "Send invite"}
      </button>
    </form>
  );
}
