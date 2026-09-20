"use client";

import { useState } from "react";
import Link from "next/link";
import { createPropertyWizardAction } from "@/app/actions/wizard";

const PROPERTY_TYPES = [
  { id: "apartment", label: "Apartment" },
  { id: "villa", label: "Villa" },
  { id: "boutique_hotel", label: "Boutique Hotel" },
  { id: "guesthouse", label: "Guesthouse" },
  { id: "serviced_apartment", label: "Serviced Apartment" },
];

const TIMEZONES = [
  "UTC", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "Europe/Lisbon", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Mexico_City", "Asia/Dubai", "Asia/Riyadh",
  "Asia/Kolkata", "Asia/Bangkok", "Australia/Sydney",
];

const APPLIANCE_HINTS = [
  "Kitchen: full kitchen with oven, dishwasher tablets under the sink",
  "Air Conditioning: remote on the coffee table, AC units in both bedrooms",
  "TV: Netflix logged in, press INPUT to switch to HDMI",
  "Washing Machine: detergent in the cupboard, cycles in English on the dial",
  "Extra Towels: in the hallway closet, top shelf",
  "Hot Water: boiler switch is beside the bathroom door",
];

const NEARBY_HINT =
  "Restaurants: …\nCafes: …\nPharmacy: …\nATM: …\nTaxi: …\nGrocery: …\nAttractions: …";

const EMERGENCY_HINT =
  "Host phone: …\nBuilding contact: …\Emergency instructions: …\nNearest hospital: …";

type Form = {
  name: string; type: string; address: string; description: string; timezone: string;
  checkinTime: string; checkoutTime: string; checkinInstructions: string; doorCode: string;
  wifiNetwork: string; wifiPassword: string; parking: string; houseRules: string; appliances: string;
  nearby: string; emergencyInfo: string;
};

const STEPS = ["Property", "Arrival", "Guest information", "Recommendations", "Emergency"];

export function PropertyWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    name: "", type: "apartment", address: "", description: "", timezone: "UTC",
    checkinTime: "16:00", checkoutTime: "10:00", checkinInstructions: "", doorCode: "",
    wifiNetwork: "", wifiPassword: "", parking: "", houseRules: "", appliances: "",
    nearby: "", emergencyInfo: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ propertyId: string; qr: string; url: string } | null>(null);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  async function finish() {
    setPending(true);
    setError(null);
    const result = await createPropertyWizardAction(form);
    setPending(false);
    if (result?.error || !result.propertyId) {
      setError(result?.error ?? "something went wrong");
      return;
    }
    setDone({ propertyId: result.propertyId, qr: "", url: "" });
    // load the QR + concierge URL for the finish screen
    try {
      const res = await fetch(`/api/property-card/${result.propertyId}`);
      if (res.ok) {
        const j = (await res.json()) as { qr: string; url: string };
        setDone({ propertyId: result.propertyId, qr: j.qr, url: j.url });
      }
    } catch {
      // QR also available on the card page
    }
  }

  if (done) {
    return (
      <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <div className="text-4xl">🎉</div>
        <h1 className="text-2xl font-semibold text-stone-900">Your AI Concierge is Ready</h1>
        <p className="mx-auto max-w-sm text-sm text-stone-600">
          Print this QR and place it inside {form.name || "your property"}. Guests scan it and
          chat instantly — no app, no login.
        </p>
        {done.qr && (
          <div className="mx-auto w-fit rounded-xl border border-stone-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={done.qr} alt="Property QR code" width={180} height={180} />
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href={`/properties/${done.propertyId}/card`}
            className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700"
          >
            Open printable card
          </Link>
          <Link
            href={`/properties/${done.propertyId}`}
            className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 hover:border-stone-400"
          >
            Go to property
          </Link>
        </div>
      </div>
    );
  }

  const inputCls = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-stone-400 focus:outline-none";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="text-xs text-stone-500 hover:underline">← Properties</Link>
        <h1 className="text-2xl font-semibold text-stone-900">Set up your property</h1>
        <p className="text-sm text-stone-500">A few questions — your concierge builds itself.</p>
      </div>

      {/* progress */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col gap-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-stone-900" : "bg-stone-200"}`} />
            <span className={`text-[10px] ${i === step ? "font-semibold text-stone-800" : "text-stone-400"}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
        {step === 0 && (
          <>
            <Field label="Property name" example="e.g. Urban Basera">
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus className={inputCls} />
            </Field>
            <Field label="Property type">
              <div className="mt-1 flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set({ type: t.id })}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${form.type === t.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Address">
              <input value={form.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Description" optional>
              <input value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="A quiet 2-bedroom in the heart of…" className={inputCls} />
            </Field>
            <Field label="Timezone">
              <select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} className={inputCls}>
                {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check-in time">
                <input type="time" value={form.checkinTime} onChange={(e) => set({ checkinTime: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Checkout time">
                <input type="time" value={form.checkoutTime} onChange={(e) => set({ checkoutTime: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="Check-in instructions" example="How to get in, step by step">
              <textarea value={form.checkinInstructions} onChange={(e) => set({ checkinInstructions: e.target.value })} rows={4} placeholder={"1. The building entrance is…\n2. Take the elevator to…"} className={inputCls} />
            </Field>
            <Field label="Lockbox / door code" optional>
              <input value={form.doorCode} onChange={(e) => set({ doorCode: e.target.value })} className={inputCls} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="WiFi network">
                <input value={form.wifiNetwork} onChange={(e) => set({ wifiNetwork: e.target.value })} className={inputCls} />
              </Field>
              <Field label="WiFi password">
                <input value={form.wifiPassword} onChange={(e) => set({ wifiPassword: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="Parking">
              <textarea value={form.parking} onChange={(e) => set({ parking: e.target.value })} rows={2} placeholder="Free spot #12 in the underground garage…" className={inputCls} />
            </Field>
            <Field label="House rules">
              <textarea value={form.houseRules} onChange={(e) => set({ houseRules: e.target.value })} rows={3} placeholder="No parties, quiet hours 22:00–08:00, no smoking…" className={inputCls} />
            </Field>
            <Field label="Amenities & appliances" example="Kitchen, AC, TV, washing machine, towels, hot water…">
              <textarea value={form.appliances} onChange={(e) => set({ appliances: e.target.value })} rows={5} placeholder={APPLIANCE_HINTS.join("\n")} className={inputCls} />
            </Field>
          </>
        )}

        {step === 3 && (
          <Field label="Local recommendations" optional example="Guests ask constantly — one good list saves dozens of messages">
            <textarea value={form.nearby} onChange={(e) => set({ nearby: e.target.value })} rows={8} placeholder={NEARBY_HINT} className={inputCls} />
          </Field>
        )}

        {step === 4 && (
          <Field label="Emergency information" example="Shown to guests immediately for urgent messages">
            <textarea value={form.emergencyInfo} onChange={(e) => set({ emergencyInfo: e.target.value })} rows={6} placeholder={EMERGENCY_HINT} className={inputCls} />
          </Field>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex items-center justify-between border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || pending}
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm text-stone-600 hover:border-stone-400 disabled:opacity-40"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !form.name.trim()}
              className="rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={pending || !form.name.trim()}
              className="rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-40"
            >
              {pending ? "Creating…" : "Create my concierge ✨"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; optional?: boolean; example?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700">
        {props.label}
        {props.optional && <span className="ml-1 font-normal text-stone-400">(optional)</span>}
      </label>
      {props.example && <p className="text-xs text-stone-400">{props.example}</p>}
      {props.children}
    </div>
  );
}
