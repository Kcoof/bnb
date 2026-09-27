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
    <div className="space-y-4 rounded-xl border border-hairline bg-white p-6">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink">
          iCal / ICS URL (Airbnb, Booking.com, VRBO export)
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.airbnb.com/calendar/ical/….ics"
            className="flex-1 input"
          />
          <button
            onClick={onSave}
            disabled={pending !== null}
            className="btn btn-primary btn-md"
          >
            {pending === "save" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSync}
          disabled={pending !== null || !url}
          className="btn btn-secondary btn-sm"
        >
          {pending === "sync" ? "Syncing…" : "Sync now"}
        </button>
        <span className="text-caption-1 text-ink-2">
          {props.property.lastSynced
            ? `Last synced: ${props.property.lastSynced} (auto every 2h)`
            : "Never synced — automatic sync runs every 2 hours"}
        </span>
      </div>

      {props.property.lastError && (
        <p className="rounded-lg bg-warning-tint px-3 py-2.5 text-callout text-warning">
          Last sync error: {props.property.lastError}
        </p>
      )}
      {message && <p className="text-footnote text-success">{message}</p>}
      {error && <p className="text-footnote text-danger">{error}</p>}

      <p className="text-caption-1 text-ink-3">
        Channel iCal feeds do not include guest name or email — reservations arrive
        without contact details. Use the copy-paste snippet on the reservation page
        to hand the guest their chat link.
      </p>
    </div>
  );
}
