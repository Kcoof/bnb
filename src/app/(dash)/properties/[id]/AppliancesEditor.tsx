"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveApplianceAction } from "@/app/actions/wizard-v2";
import { Icon } from "@/components/Icon";

// Host edits for the copied appliance how-tos + troubleshooting scripts —
// the exact text the concierge uses (spec §2/§6, review M4).
export function AppliancesEditor(props: {
  propertyId: string;
  appliances: {
    templateType: string;
    label: string;
    instructions: string;
    troubleshooting: string;
  }[];
}) {
  const router = useRouter();
  const [state, setState] = useState(() =>
    Object.fromEntries(
      props.appliances.map((a) => [
        a.templateType,
        { instructions: a.instructions, troubleshooting: a.troubleshooting, saved: false, pending: false },
      ]),
    ),
  );

  if (props.appliances.length === 0) return null;

  return (
    <div className="card space-y-5 p-6">
      <h2 className="text-title-3">Appliances & troubleshooting</h2>
      <p className="text-footnote text-ink-2">
        This is exactly what the concierge tells guests — edit freely.
      </p>
      {props.appliances.map((a) => {
        const s = state[a.templateType];
        if (!s) return null;
        return (
          <div key={a.templateType} className="space-y-3 border-t border-hairline pt-4 first:border-0 first:pt-0">
            <div className="text-callout font-medium text-ink">{a.label}</div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">How to use</label>
              <textarea
                value={s.instructions}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    [a.templateType]: { ...s, instructions: e.target.value, saved: false },
                  }))
                }
                rows={3}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">
                Troubleshooting step (offered before escalating to you)
              </label>
              <textarea
                value={s.troubleshooting}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    [a.templateType]: { ...s, troubleshooting: e.target.value, saved: false },
                  }))
                }
                rows={2}
                className="input"
              />
            </div>
            <button
              onClick={async () => {
                setState((prev) => ({ ...prev, [a.templateType]: { ...s, pending: true } }));
                const r = await saveApplianceAction(
                  props.propertyId,
                  a.templateType,
                  s.instructions,
                  s.troubleshooting,
                );
                setState((prev) => ({
                  ...prev,
                  [a.templateType]: { ...s, pending: false, saved: !r?.error },
                }));
                router.refresh();
              }}
              disabled={s.pending}
              className="btn btn-secondary btn-sm"
            >
              {s.pending ? <span className="spinner" /> : null}
              {s.saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        );
      })}
      <p className="flex items-start gap-1.5 text-caption-1 text-ink-3">
        <Icon name="alertCircle" size={12} className="mt-0.5 shrink-0" />
        Unticking an appliance in the setup wizard only removes it if you
        haven&apos;t edited the text.
      </p>
    </div>
  );
}
