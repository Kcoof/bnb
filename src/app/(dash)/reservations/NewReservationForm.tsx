"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReservationAction } from "@/app/actions/reservations";

export function NewReservationForm(props: { properties: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createReservationAction({
      propertyId: String(formData.get("propertyId") ?? ""),
      guestName: String(formData.get("guestName") ?? ""),
      guestEmail: String(formData.get("guestEmail") ?? ""),
      guestPhone: String(formData.get("guestPhone") ?? ""),
      checkIn: String(formData.get("checkIn") ?? ""),
      checkOut: String(formData.get("checkOut") ?? ""),
      guestsCount: String(formData.get("guestsCount") ?? ""),
      channel: String(formData.get("channel") ?? "manual"),
      notes: String(formData.get("notes") ?? ""),
    });
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary btn-md"
      >
        + Add reservation
      </button>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-medium text-slate-900">New reservation</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Property</label>
          <select name="propertyId" required className="input">
            {props.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Guest name</label>
          <input name="guestName" className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Guest email</label>
          <input name="guestEmail" type="email" className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Guest phone</label>
          <input name="guestPhone" className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Check-in</label>
          <input name="checkIn" type="date" required className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Check-out</label>
          <input name="checkOut" type="date" required className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Guests</label>
          <input name="guestsCount" type="number" min="1" className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Channel</label>
          <select name="channel" className="input">
            {["manual", "direct", "airbnb", "booking", "vrbo", "other"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Internal notes</label>
          <input name="notes" className="input" />
        </div>
      </div>
      {error && <p className="text-footnote text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary btn-md">
          {pending ? "Saving…" : "Create reservation"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
