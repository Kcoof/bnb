"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeStatusAction } from "@/app/actions/properties";

// Board status menu — offers only allowedTransitions() + always 'blocked' (plan §2.2).
const ALLOWED: Record<string, string[]> = {
  ready: ["occupied", "blocked"],
  occupied: ["needs_cleaning", "ready", "blocked"],
  needs_cleaning: ["cleaning", "ready", "blocked"],
  cleaning: ["ready", "needs_cleaning", "blocked"],
  blocked: ["ready", "occupied"],
};

export function StatusChangeMenu(props: { propertyId: string; current: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = ALLOWED[props.current] ?? ["blocked", "ready"];

  async function change(to: string) {
    const reason = prompt(`Move to "${to.replace(/_/g, " ")}" — note (optional):`) ?? "";
    if (reason === null) return;
    setPending(true);
    setError(null);
    const result = await changeStatusAction(props.propertyId, to as "blocked", reason);
    setPending(false);
    if (result?.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => change(opt)}
          disabled={pending}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          → {opt.replace(/_/g, " ")}
        </button>
      ))}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
