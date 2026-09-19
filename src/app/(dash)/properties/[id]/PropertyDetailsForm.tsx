"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePropertyAction } from "@/app/actions/properties";

export function PropertyDetailsForm(props: {
  property: {
    id: string;
    name: string;
    address: string;
    timezone: string;
    checkinTime: string;
    checkoutTime: string;
    assistantName: string;
    active: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updatePropertyAction(props.property.id, {
      name: String(formData.get("name") ?? ""),
      address: String(formData.get("address") ?? ""),
      timezone: String(formData.get("timezone") ?? "UTC"),
      checkinTime: String(formData.get("checkinTime") ?? "16:00"),
      checkoutTime: String(formData.get("checkoutTime") ?? "10:00"),
      assistantName: String(formData.get("assistantName") ?? "Alex"),
      active: formData.get("active") === "on",
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
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input name="name" defaultValue={props.property.name} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Address</label>
          <input name="address" defaultValue={props.property.address} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Timezone (IANA)</label>
          <input name="timezone" defaultValue={props.property.timezone} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Assistant name (guest-facing)</label>
          <input name="assistantName" defaultValue={props.property.assistantName} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Check-in time</label>
          <input name="checkinTime" type="time" defaultValue={props.property.checkinTime} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Checkout time</label>
          <input name="checkoutTime" type="time" defaultValue={props.property.checkoutTime} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={props.property.active} />
        Active (included in status tick and syncs)
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">Saved ✓</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
