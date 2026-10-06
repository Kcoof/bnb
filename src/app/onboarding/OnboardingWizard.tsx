"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  wizardStartAction,
  wizardSaveAction,
  wizardSavePhoneAction,
  wizardSaveAmenitiesAction,
  wizardSaveAppliancesAction,
} from "@/app/actions/wizard-v2";

// Airbnb-style listing onboarding: standout amenities → included
// amenities (grouped) → safety features. All three write to the same
// properties.amenities array that feeds the concierge prompt.
const STANDOUT_AMENITIES = [
  "Pool", "Hot tub", "Patio", "BBQ grill", "Outdoor dining area",
  "Fire pit", "Pool table", "Indoor fireplace", "Outdoor shower",
];

type Amenity = { label: string; sub?: string; value?: string };

const AMENITY_GROUPS: { label: string; items: Amenity[] }[] = [
  {
    label: "Popular",
    items: [
      { label: "Wifi" },
      { label: "Kitchen", sub: "Space where guests can cook their own meals" },
      { label: "TV" },
      { label: "Washer" },
      { label: "Dryer" },
      { label: "Air conditioning" },
      { label: "Heating" },
      { label: "Hot water" },
      { label: "Free parking on premises" },
      { label: "Dedicated workspace", sub: "A desk or table with room for a laptop" },
      { label: "Hair dryer" },
      { label: "Iron" },
    ],
  },
  {
    label: "Bed and bath",
    items: [
      {
        label: "Essentials",
        sub: "Towels, bed sheets, soap, and toilet paper",
        value: "Essentials (towels, bed sheets, soap, and toilet paper)",
      },
      { label: "Bed linens" },
      { label: "Extra pillows and blankets" },
      { label: "Hangers" },
      { label: "Room-darkening shades" },
    ],
  },
  {
    label: "Building and access",
    items: [
      { label: "Elevator" },
      { label: "Self check-in", sub: "Lockbox, smart lock, or keypad", value: "Self check-in (lockbox, smart lock, or keypad)" },
    ],
  },
];

const SAFETY_FEATURES: Amenity[] = [
  { label: "Smoke alarm" },
  { label: "Carbon monoxide alarm" },
  { label: "Fire extinguisher" },
  { label: "First aid kit" },
];

// AUTOMI onboarding (spec §2): one question per screen, autosave, dots.
export function OnboardingWizard(props: {
  templates: { type: string; label: string }[];
  propertyCount: number;
}) {
  const [step, setStep] = useState(props.propertyCount > 0 ? 1 : 0);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [coords, setCoords] = useState<string | null>(null);
  const [wifiNetwork, setWifiNetwork] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [appliances, setAppliances] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [phone, setPhone] = useState("");

  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const STEPS = 12;

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  function autosave(patch: Parameters<typeof wizardSaveAction>[1]) {
    if (!propertyId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const result = await wizardSaveAction(propertyId, patch);
      if (result?.saved) flashSaved();
    }, 400);
  }

  async function setAmenity(value: string, on: boolean) {
    const nextList = on
      ? Array.from(new Set([...amenities, value]))
      : amenities.filter((x) => x !== value);
    setAmenities(nextList);
    if (propertyId) {
      await wizardSaveAmenitiesAction(propertyId, nextList);
      flashSaved();
    }
  }

  async function next() {
    setError(null);
    setPending(true);
    try {
      if (step === 1 && !propertyId) {
        const result = await wizardStartAction({ name });
        if (result?.error === "limit") {
          setError("You've reached your plan's property limit. Upgrade in Settings to add more.");
          setPending(false);
          return;
        }
        if (result?.error || !result.propertyId) {
          setError(result?.error ?? "Something went wrong");
          setPending(false);
          return;
        }
        setPropertyId(result.propertyId);
      }
      if (step === 3 && propertyId) {
        const result = await wizardSaveAction(propertyId, { mapsUrl });
        if (result?.parsedCoords) setCoords("location found");
        else setCoords(null);
      }
      if (step === 10) {
        const r = await wizardSavePhoneAction(phone);
        if (r?.error) {
          setError(r.error);
          setPending(false);
          return;
        }
      }
      setStep((s) => Math.min(STEPS - 1, s + 1));
    } finally {
      setPending(false);
    }
  }

  const canContinue =
    (step === 1 && name.trim().length > 0) ||
    (step !== 1 && step !== 10) ||
    (step === 10 && phone.replace(/\D/g, "").length >= 8);

  const inputCls = "input h-14 text-[19px]";

  return (
    <main className="flex min-h-screen flex-col bg-canvas px-6">
      {/* progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8">
        {Array.from({ length: STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-ink" : i < step ? "w-2 bg-ink/50" : "w-2 bg-black/15"}`}
          />
        ))}
      </div>
      {saved && (
        <div className="mt-3 flex justify-center">
          <span className="flex items-center gap-1 text-caption-1 text-success animate-fade-up">
            <Icon name="check" size={12} /> Saved
          </span>
        </div>
      )}

      {/* question card */}
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center pb-16">
        <div key={step} className="animate-fade-up">
          {step === 0 && (
            <Q title="Welcome to AUTOMI." sub="Let's set up your first property — about 5 minutes." />
          )}
          {step === 1 && (
            <Q title="What&#39;s your property called?" sub="Guests will see this name in their chat.">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Urban Basera"
                autoFocus
                className={inputCls}
              />
            </Q>
          )}
          {step === 2 && (
            <Q title="What should your concierge call itself?" sub="A human name works best — guests trust a person.">
              <input
                value={assistantName}
                onChange={(e) => {
                  setAssistantName(e.target.value);
                  autosave({ assistantName: e.target.value });
                }}
                placeholder="Ankit"
                autoFocus
                className={inputCls}
              />
            </Q>
          )}
          {step === 3 && (
            <Q title="Where is it?" sub="Paste your Google Maps share link — we'll take care of the rest.">
              <input
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/… or https://maps.google.com/…"
                className={inputCls}
                onKeyDown={(e) => e.key === "Enter" && next()}
              />
              {coords && (
                <p className="mt-2 flex items-center gap-1 text-footnote text-success">
                  <Icon name="check" size={12} /> Location found
                </p>
              )}
              {mapsUrl.trim().length > 10 && !coords && (
                <p className="mt-2 text-footnote text-ink-3">
                  We couldn&#39;t read coordinates from that link — you can add the
                  location later in Settings.
                </p>
              )}
            </Q>
          )}
          {step === 4 && (
            <Q title="WiFi network name?" sub="The name guests pick from the list.">
              <input
                value={wifiNetwork}
                onChange={(e) => {
                  setWifiNetwork(e.target.value);
                  autosave({ wifiNetwork: e.target.value });
                }}
                placeholder="UrbanBasera_5G"
                autoFocus
                className={inputCls}
              />
            </Q>
          )}
          {step === 5 && (
            <Q title="WiFi password?">
              <input
                value={wifiPassword}
                onChange={(e) => {
                  setWifiPassword(e.target.value);
                  autosave({ wifiPassword: e.target.value });
                }}
                autoFocus
                className={inputCls}
              />
            </Q>
          )}
          {step === 6 && (
            <Q title="Which of these do you have?" sub="We'll write the how-tos for you — you can edit them anytime.">
              <div className="space-y-2.5">
                {props.templates.map((t) => (
                  <label
                    key={t.type}
                    className={`flex h-14 cursor-pointer items-center gap-3 rounded-md border px-4 text-callout transition duration-150 ${appliances.includes(t.type) ? "border-ink bg-surface shadow-card" : "border-line bg-surface text-ink hover:border-ink-3"}`}
                  >
                    <input
                      type="checkbox"
                      checked={appliances.includes(t.type)}
                      onChange={async (e) => {
                        const nextList = e.target.checked
                          ? [...appliances, t.type]
                          : appliances.filter((a) => a !== t.type);
                        setAppliances(nextList);
                        if (propertyId) {
                          await wizardSaveAppliancesAction(propertyId, nextList);
                          flashSaved();
                        }
                      }}
                      className="h-[18px] w-[18px] accent-[#1E2B24]"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </Q>
          )}
          {step === 7 && (
            <Q title="Does your place have any of these standout amenities?" sub="The ones guests remember. Tap everything that applies.">
              <div className="flex flex-wrap gap-2">
                {STANDOUT_AMENITIES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmenity(a, !amenities.includes(a))}
                    className={`h-10 rounded-full border px-4 text-[15px] font-medium transition duration-150 active:scale-[0.96] ${amenities.includes(a) ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink hover:border-ink-3"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Q>
          )}
          {step === 8 && (
            <Q title="What amenities will you include?" sub="Tick what guests can use — your concierge answers these questions so you don't have to.">
              <div className="space-y-5">
                {AMENITY_GROUPS.map((g) => (
                  <div key={g.label}>
                    <p className="text-caption-1 uppercase tracking-[0.1em] text-ink-3">
                      {g.label}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {g.items.map((item) => (
                        <AmenityRow
                          key={item.label}
                          item={item}
                          checked={amenities.includes(amenityValue(item))}
                          onToggle={(on) => setAmenity(amenityValue(item), on)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Q>
          )}
          {step === 9 && (
            <Q title="Does your place have any of these safety features?" sub="Some of these may be required by law in your region.">
              <div className="grid gap-2 sm:grid-cols-2">
                {SAFETY_FEATURES.map((item) => (
                  <AmenityRow
                    key={item.label}
                    item={item}
                    checked={amenities.includes(item.label)}
                    onToggle={(on) => setAmenity(item.label, on)}
                  />
                ))}
              </div>
            </Q>
          )}
          {step === 10 && (
            <Q title="What's your phone number?" sub="When something urgent comes up, we text you here.">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
                autoFocus
                className={inputCls}
                onKeyDown={(e) => e.key === "Enter" && next()}
              />
            </Q>
          )}
          {step === 11 && propertyId && (
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success-tint text-success animate-pop-in">
                <Icon name="check" size={36} />
              </div>
              <h1 className="mt-5 text-title-1">Your AI concierge is ready</h1>
              <p className="mx-auto mt-2 max-w-sm text-callout text-ink-2">
                Print the QR card and place it inside {name || "your property"}.
                Guests scan it and chat instantly — no app, no login.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Link href={`/properties/${propertyId}/card`} className="btn btn-primary btn-md">
                  <Icon name="printer" size={16} /> Get the QR card
                </Link>
                <Link href="/dashboard" className="btn btn-secondary btn-md">
                  Go to dashboard
                </Link>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-1.5 text-footnote text-danger">
            <Icon name="alertCircle" size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {/* nav */}
        {step < 11 && (
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || pending}
              className="btn btn-ghost btn-sm disabled:opacity-40"
            >
              ‹ Back
            </button>
            <button
              onClick={next}
              disabled={pending || !canContinue}
              className="btn btn-primary btn-lg"
            >
              {pending && <span className="spinner" />}
              {step === 0 ? "Let's start" : step === 10 ? "Finish" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Q(props: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink">
        {props.title}
      </h1>
      {props.sub && <p className="mt-2 text-callout text-ink-2">{props.sub}</p>}
      {props.children && <div className="mt-7">{props.children}</div>}
    </div>
  );
}

function amenityValue(item: Amenity) {
  return item.value ?? item.label;
}

function AmenityRow(props: {
  item: Amenity;
  checked: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-callout transition duration-150 ${props.checked ? "border-ink bg-surface shadow-card" : "border-line bg-surface text-ink hover:border-ink-3"}`}
    >
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onToggle(e.target.checked)}
        className="h-[18px] w-[18px] shrink-0 accent-[#1E2B24]"
      />
      <span>
        {props.item.label}
        {props.item.sub && (
          <span className="block text-footnote text-ink-3">{props.item.sub}</span>
        )}
      </span>
    </label>
  );
}
