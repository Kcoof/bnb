"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
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
  "Host phone: …\nBuilding contact: …\nEmergency instructions: …\nNearest hospital: …";

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
  const [done, setDone] = useState<{ propertyId: string; qr: string } | null>(null);

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
    setDone({ propertyId: result.propertyId, qr: "" });
    try {
      const res = await fetch(`/api/property-card/${result.propertyId}`);
      if (res.ok) {
        const j = (await res.json()) as { qr: string };
        setDone({ propertyId: result.propertyId, qr: j.qr });
      }
    } catch {
      // QR also available on the card page
    }
  }

  if (done) {
    return (
      <div className="animate-pop-in space-y-6 rounded-xl border border-hairline bg-surface p-8 text-center shadow-card">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success-tint text-success">
          <Icon name="check" size={36} />
        </div>
        <h1 className="text-title-1">Your AI concierge is ready</h1>
        <p className="mx-auto max-w-sm text-callout text-ink-2">
          Print this QR and place it inside {form.name || "your property"}. Guests scan it and
          chat instantly — no app, no login.
        </p>
        {done.qr && (
          <div className="mx-auto w-fit rounded-md border border-line bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={done.qr} alt="Property QR code" width={180} height={180} />
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link href={`/properties/${done.propertyId}/card`} className="btn btn-primary btn-md">
            <Icon name="printer" size={16} />
            Open printable card
          </Link>
          <Link href={`/properties/${done.propertyId}`} className="btn btn-secondary btn-md">
            Go to property
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="text-callout text-accent hover:underline">
          ‹ Properties
        </Link>
        <h1 className="mt-1 text-title-1">Set up your property</h1>
        <p className="text-callout text-ink-2">
          A few questions — your concierge builds itself.
        </p>
      </div>

      {/* progress */}
      <div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-black/[0.08]">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                style={{ width: i <= step ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`text-[11px] ${i === step ? "font-semibold text-ink" : "text-ink-3"} hidden sm:block`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-hairline bg-surface p-6 shadow-card md:p-8">
        <div key={step} className="animate-fade-up space-y-5">
          {step === 0 && (
            <>
              <Field label="Property name" example="e.g. Urban Basera">
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus className="input" />
              </Field>
              <Field label="Property type">
                <div className="mt-1 flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set({ type: t.id })}
                      className={`h-9 rounded-full border px-4 text-callout font-medium transition duration-150 active:scale-[0.96] ${
                        form.type === t.id
                          ? "border-accent bg-accent text-white"
                          : "border-line bg-surface text-ink hover:border-ink-3"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Address">
                <input value={form.address} onChange={(e) => set({ address: e.target.value })} className="input" />
              </Field>
              <Field label="Description" optional>
                <input
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="A quiet 2-bedroom in the heart of…"
                  className="input"
                />
              </Field>
              <Field label="Timezone">
                <select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} className="input">
                  {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                </select>
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Check-in time">
                  <input type="time" value={form.checkinTime} onChange={(e) => set({ checkinTime: e.target.value })} className="input" />
                </Field>
                <Field label="Checkout time">
                  <input type="time" value={form.checkoutTime} onChange={(e) => set({ checkoutTime: e.target.value })} className="input" />
                </Field>
              </div>
              <Field label="Check-in instructions" example="How to get in, step by step">
                <textarea
                  value={form.checkinInstructions}
                  onChange={(e) => set({ checkinInstructions: e.target.value })}
                  rows={4}
                  placeholder={"1. The building entrance is…\n2. Take the elevator to…"}
                  className="input min-h-24"
                />
              </Field>
              <Field label="Lockbox / door code" optional>
                <input value={form.doorCode} onChange={(e) => set({ doorCode: e.target.value })} className="input" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="WiFi network">
                  <input value={form.wifiNetwork} onChange={(e) => set({ wifiNetwork: e.target.value })} className="input" />
                </Field>
                <Field label="WiFi password">
                  <input value={form.wifiPassword} onChange={(e) => set({ wifiPassword: e.target.value })} className="input" />
                </Field>
              </div>
              <Field label="Parking">
                <textarea value={form.parking} onChange={(e) => set({ parking: e.target.value })} rows={2} placeholder="Free spot #12 in the underground garage…" className="input" />
              </Field>
              <Field label="House rules">
                <textarea value={form.houseRules} onChange={(e) => set({ houseRules: e.target.value })} rows={3} placeholder="No parties, quiet hours 22:00–08:00, no smoking…" className="input" />
              </Field>
              <Field label="Amenities & appliances" example="Kitchen, AC, TV, washing machine, towels, hot water…">
                <textarea value={form.appliances} onChange={(e) => set({ appliances: e.target.value })} rows={5} placeholder={APPLIANCE_HINTS.join("\n")} className="input" />
              </Field>
            </>
          )}

          {step === 3 && (
            <Field label="Local recommendations" optional example="Guests ask constantly — one good list saves dozens of messages">
              <textarea value={form.nearby} onChange={(e) => set({ nearby: e.target.value })} rows={8} placeholder={NEARBY_HINT} className="input" />
            </Field>
          )}

          {step === 4 && (
            <Field label="Emergency information" example="Shown to guests immediately for urgent messages">
              <textarea value={form.emergencyInfo} onChange={(e) => set({ emergencyInfo: e.target.value })} rows={6} placeholder={EMERGENCY_HINT} className="input" />
            </Field>
          )}

          {error && (
            <p className="flex items-start gap-1.5 text-footnote text-danger">
              <Icon name="alertCircle" size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || pending}
            className="btn btn-ghost btn-sm opacity-100 disabled:opacity-40"
          >
            ‹ Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !form.name.trim()}
              className="btn btn-primary btn-md"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={pending || !form.name.trim()}
              className="btn btn-primary btn-md"
            >
              {pending && <span className="spinner" />}
              Create my concierge
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
      <label className="mb-1.5 block text-[13px] font-medium text-ink">
        {props.label}
        {props.optional && <span className="ml-1 font-normal text-ink-3">(optional)</span>}
      </label>
      {props.example && <p className="mb-1.5 text-footnote text-ink-3">{props.example}</p>}
      {props.children}
    </div>
  );
}
