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
    <form action={onSubmit} className="space-y-4 card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink">Name</label>
          <input name="name" defaultValue={props.property.name} required className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Address</label>
          <input name="address" defaultValue={props.property.address} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Timezone (IANA)</label>
          <input name="timezone" defaultValue={props.property.timezone} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Assistant name (guest-facing)</label>
          <input name="assistantName" defaultValue={props.property.assistantName} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Check-in time</label>
          <input name="checkinTime" type="time" defaultValue={props.property.checkinTime} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Checkout time</label>
          <input name="checkoutTime" type="time" defaultValue={props.property.checkoutTime} className="input" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={props.property.active} />
        Active (included in status tick and syncs)
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-footnote text-success">Saved ✓</p>}
      <button type="submit" disabled={pending} className="btn btn-primary btn-md">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
