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
    <form action={onSubmit} className="space-y-4 rounded-xl border border-hairline bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Organization name</label>
          <input name="name" defaultValue={props.initial.name} required className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Timezone (IANA)</label>
          <input name="timezone" defaultValue={props.initial.timezone} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Daily digest hour (local)</label>
          <input name="digestHour" type="number" min="0" max="23" defaultValue={props.initial.digestHour} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Sender name</label>
          <input name="senderName" defaultValue={props.initial.senderName} className="input" />
        </div>
      </div>
      {error && <p className="text-footnote text-danger">{error}</p>}
      {saved && <p className="text-footnote text-success">Saved ✓</p>}
      <button type="submit" disabled={pending} className="btn btn-primary btn-md">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
