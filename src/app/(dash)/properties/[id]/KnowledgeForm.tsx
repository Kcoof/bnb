"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveKnowledgeAction } from "@/app/actions/properties";

const FIELDS: { name: string; label: string; long?: boolean; hint?: string }[] = [
  { name: "wifiNetwork", label: "Wi-Fi network" },
  { name: "wifiPassword", label: "Wi-Fi password" },
  { name: "doorCode", label: "Door / key code" },
  { name: "checkinInstructions", label: "Check-in instructions", long: true, hint: "Step-by-step how to get in" },
  { name: "checkoutInstructions", label: "Checkout instructions", long: true },
  { name: "parking", label: "Parking", long: true },
  { name: "houseRules", label: "House rules", long: true },
  { name: "appliances", label: "Appliances & how-tos", long: true, hint: "Washer, dishwasher, thermostat…" },
  { name: "emergencyInfo", label: "Emergency info", long: true, hint: "Breaker, water shutoff, emergency number" },
  { name: "nearby", label: "Nearby & directions", long: true, hint: "Transit, groceries, attractions" },
  { name: "lateCheckoutPolicy", label: "Late checkout policy", long: true, hint: "Exact policy text the AI may quote" },
  { name: "cleaningNotes", label: "Cleaning notes", long: true, hint: "Shown to the cleaner on their task page" },
];

export function KnowledgeForm(props: {
  propertyId: string;
  kb: Record<string, string>;
  extras: { topic: string; content: string }[];
}) {
  const router = useRouter();
  const [extras, setExtras] = useState(props.extras ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSaved(false);
    const kb: Record<string, string> = {};
    for (const f of FIELDS) kb[f.name] = String(formData.get(f.name) ?? "");
    const result = await saveKnowledgeAction(props.propertyId, kb, extras);
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form action={onSubmit} className="space-y-5 card p-6">
      <p className="text-sm text-ink-2">
        The guest AI answers strictly from these fields. Empty fields are hidden from
        it — anything not here gets escalated to you.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) =>
          f.long ? (
            <div key={f.name} className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink">{f.label}</label>
              {f.hint && <p className="text-xs text-ink-3">{f.hint}</p>}
              <textarea
                name={f.name}
                defaultValue={props.kb[f.name] ?? ""}
                rows={3}
                className="input"
              />
            </div>
          ) : (
            <div key={f.name}>
              <label className="block text-sm font-medium text-ink">{f.label}</label>
              <input
                name={f.name}
                defaultValue={props.kb[f.name] ?? ""}
                className="input"
              />
            </div>
          ),
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink">Extra topics</label>
          <button
            type="button"
            onClick={() => setExtras([...extras, { topic: "", content: "" }])}
            className="btn btn-secondary btn-sm"
          >
            + Add topic
          </button>
        </div>
        {extras.map((e, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder="Topic (e.g. Hot tub)"
              value={e.topic}
              onChange={(ev) => {
                const next = [...extras];
                next[i] = { ...next[i], topic: ev.target.value };
                setExtras(next);
              }}
              className="w-1/3 input"
            />
            <input
              placeholder="Content the AI may use"
              value={e.content}
              onChange={(ev) => {
                const next = [...extras];
                next[i] = { ...next[i], content: ev.target.value };
                setExtras(next);
              }}
              className="flex-1 input"
            />
            <button
              type="button"
              onClick={() => setExtras(extras.filter((_, j) => j !== i))}
              className="btn btn-secondary btn-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-footnote text-success">Saved ✓</p>}
      <button type="submit" disabled={pending} className="btn btn-primary btn-md">
        {pending ? "Saving…" : "Save knowledge base"}
      </button>
    </form>
  );
}
