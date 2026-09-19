"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOrgAction } from "@/app/actions/settings";

export function OrgSettingsForm(props: {
  initial: { name: string; timezone: string; digestHour: number; senderName: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await saveOrgAction({
      name: String(formData.get("name") ?? ""),
      timezone: String(formData.get("timezone") ?? "UTC"),
      digestHour: parseInt(String(formData.get("digestHour") ?? "7"), 10) || 7,
      senderName: String(formData.get("senderName") ?? ""),
    });
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Organization name</label>
          <input name="name" defaultValue={props.initial.name} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Timezone (IANA)</label>
          <input name="timezone" defaultValue={props.initial.timezone} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Daily digest hour (local)</label>
          <input name="digestHour" type="number" min="0" max="23" defaultValue={props.initial.digestHour} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Sender name</label>
          <input name="senderName" defaultValue={props.initial.senderName} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">Saved ✓</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
