"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateReservationAction } from "@/app/actions/reservations";

export function EditReservationForm(props: {
  reservationId: string;
  initial: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    checkIn: string;
    checkOut: string;
    notes: string;
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
    const result = await updateReservationAction(props.reservationId, {
      guestName: String(formData.get("guestName") ?? ""),
      guestEmail: String(formData.get("guestEmail") ?? ""),
      guestPhone: String(formData.get("guestPhone") ?? ""),
      checkIn: String(formData.get("checkIn") ?? ""),
      checkOut: String(formData.get("checkOut") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form action={onSubmit} className="mt-3 grid gap-4 sm:grid-cols-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Guest name</label>
        <input name="guestName" defaultValue={props.initial.guestName} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Guest email</label>
        <input name="guestEmail" type="email" defaultValue={props.initial.guestEmail} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Guest phone</label>
        <input name="guestPhone" defaultValue={props.initial.guestPhone} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Check-in</label>
        <input name="checkIn" type="date" defaultValue={props.initial.checkIn} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Check-out</label>
        <input name="checkOut" type="date" defaultValue={props.initial.checkOut} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Internal notes</label>
        <input name="notes" defaultValue={props.initial.notes} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="sm:col-span-3 flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-700">Saved ✓ (date changes re-schedule pending emails)</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}
