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
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Guest name</label>
        <input name="guestName" defaultValue={props.initial.guestName} className="input" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Guest email</label>
        <input name="guestEmail" type="email" defaultValue={props.initial.guestEmail} className="input" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Guest phone</label>
        <input name="guestPhone" defaultValue={props.initial.guestPhone} className="input" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Check-in</label>
        <input name="checkIn" type="date" defaultValue={props.initial.checkIn} className="input" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Check-out</label>
        <input name="checkOut" type="date" defaultValue={props.initial.checkOut} className="input" />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Internal notes</label>
        <input name="notes" defaultValue={props.initial.notes} className="input" />
      </div>
      <div className="sm:col-span-3 flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary btn-md">
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-footnote text-success">Saved ✓ (date changes re-schedule pending emails)</span>}
        {error && <span className="text-footnote text-danger">{error}</span>}
      </div>
    </form>
  );
}
