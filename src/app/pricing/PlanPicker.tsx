"use client";

import { useState } from "react";
import { PLANS } from "@/lib/plans-client";

export function PlanPicker(props: {
  currentPlan: string | null;
  status: string | null;
  billingConfigured: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: string) {
    setPending(plan);
    setError(null);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = (await res.json()) as { url?: string; error?: string };
    setPending(null);
    if (json.url) window.location.assign(json.url);
    else setError(json.error ?? "checkout failed");
  }

  const featured = "professional";

  return (
    <div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => {
          const p = PLANS[id];
          const isFeatured = id === featured;
          return (
            <div
              key={id}
              className={
                isFeatured
                  ? "rounded-[24px] border border-transparent bg-ink p-8 text-white shadow-float"
                  : "rounded-[24px] border border-hairline bg-surface p-8"
              }
            >
              <div className={`text-callout font-medium ${isFeatured ? "text-[#6db2ff]" : "text-accent"}`}>
                {p.name}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-[40px] font-semibold tracking-[-0.02em]">${p.priceMonthly}</span>
                <span className={`text-footnote ${isFeatured ? "text-white/60" : "text-ink-2"}`}>/month</span>
              </div>
              <div className={`mt-1 text-footnote ${isFeatured ? "text-white/60" : "text-ink-2"}`}>
                Up to {p.propertyLimit} properties
              </div>
              <ul className="mt-6 space-y-2.5 text-callout">
                <li>AI concierge chat</li>
                <li>Printable QR cards</li>
                <li>SMS escalation alerts</li>
                {id !== "starter" && <li>Calendar sync</li>}
                {id === "business" && <li>Priority support</li>}
              </ul>
              <button
                onClick={() => checkout(id)}
                disabled={!props.billingConfigured || pending !== null || props.currentPlan === id}
                className={`mt-8 w-full ${isFeatured ? "btn btn-primary btn-md" : "btn btn-secondary btn-md"}`}
              >
                {pending === id ? "Opening checkout…" : props.currentPlan === id ? "Current plan" : "Choose"}
              </button>
            </div>
          );
        })}
      </div>
      {!props.billingConfigured && (
        <p className="mt-4 text-center text-footnote text-warning">
          Billing is not configured yet (missing Stripe keys) — contact support to activate your plan.
        </p>
      )}
      {error && (
        <p className="mt-4 text-center text-footnote text-danger">{error}</p>
      )}
    </div>
  );
}
