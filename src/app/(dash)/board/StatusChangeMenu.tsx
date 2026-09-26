"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { changeStatusAction } from "@/app/actions/properties";

// Board status menu — popover on desktop, bottom sheet on phones.
// Only allowedTransitions() are offered (plan §2.2).
const ALLOWED: Record<string, string[]> = {
  ready: ["occupied", "blocked"],
  occupied: ["needs_cleaning", "ready", "blocked"],
  needs_cleaning: ["cleaning", "ready", "blocked"],
  cleaning: ["ready", "needs_cleaning", "blocked"],
  blocked: ["ready", "occupied"],
};

export function StatusChangeMenu(props: { propertyId: string; current: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const options = ALLOWED[props.current] ?? ["blocked", "ready"];

  async function change(to: string) {
    const reason = prompt(`Move to "${to.replace(/_/g, " ")}" — note (optional):`) ?? "";
    if (reason === null) return;
    setOpen(false);
    setPending(true);
    setError(null);
    const result = await changeStatusAction(props.propertyId, to as "blocked", reason);
    setPending(false);
    if (result?.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn btn-secondary h-9 px-4 text-[14px]"
      >
        {pending ? "…" : "Change status"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-40 mt-2 min-w-[220px] origin-top animate-pop-in rounded-md border border-hairline bg-surface p-1.5 shadow-float"
        >
          {options.map((opt) => (
            <button
              key={opt}
              role="menuitem"
              onClick={() => change(opt)}
              className="flex h-9 w-full items-center gap-2 rounded-[10px] px-3 text-callout text-ink transition duration-100 hover:bg-black/[0.04]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ink-3" aria-hidden="true" />
              {opt.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-footnote text-danger">{error}</p>}
    </div>
  );
}
