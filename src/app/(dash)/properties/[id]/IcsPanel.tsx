"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveIcsUrlAction, syncNowAction } from "@/app/actions/properties";

export function IcsPanel(props: {
  property: {
    id: string;
    icsUrl: string;
    lastSynced: string | null;
    lastError: string | null;
  };
}) {
  const router = useRouter();
  const [url, setUrl] = useState(props.property.icsUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "sync" | null>(null);

  async function onSave() {
    setPending("save");
    setError(null);
    setMessage(null);
    const result = await saveIcsUrlAction(props.property.id, url);
    setPending(null);
    if (result?.error) setError(result.error);
    else {
      setMessage("iCal URL saved.");
      router.refresh();
    }
  }

  async function onSync() {
    setPending("sync");
    setError(null);
    setMessage(null);
    const result = await syncNowAction(props.property.id);
    setPending(null);
    if (result?.error) setError(result.error);
    else {
      setMessage(`Sync done — ${result?.result ?? ""}`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          iCal / ICS URL (Airbnb, Booking.com, VRBO export)
        </label>
        <div className="mt-1 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.airbnb.com/calendar/ical/….ics"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={onSave}
            disabled={pending !== null}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending === "save" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSync}
          disabled={pending !== null || !url}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending === "sync" ? "Syncing…" : "Sync now"}
        </button>
        <span className="text-xs text-slate-500">
          {props.property.lastSynced
            ? `Last synced: ${props.property.lastSynced} (auto every 2h)`
            : "Never synced — automatic sync runs every 2 hours"}
        </span>
      </div>

      {props.property.lastError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Last sync error: {props.property.lastError}
        </p>
      )}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      <p className="text-xs text-slate-400">
        Channel iCal feeds do not include guest name or email — reservations arrive
        without contact details. Use the copy-paste snippet on the reservation page
        to hand the guest their chat link.
      </p>
    </div>
  );
}
