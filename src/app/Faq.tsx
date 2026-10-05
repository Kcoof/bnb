"use client";

import { useState } from "react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-[840px]">
      {items.map((item, i) => (
        <div key={i} className="border-b border-[#E6E2D8]">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex min-h-12 w-full items-center justify-between gap-4 py-5 text-left"
            aria-expanded={open === i}
          >
            <span className="font-display text-[18px] leading-snug text-ink">{item.q}</span>
            <span className={`shrink-0 text-[#C27E4B] transition-transform duration-200 ${open === i ? "rotate-45" : ""}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
          </button>
          {open === i && (
            <p className="animate-fade-up pb-5 text-[15px] leading-relaxed text-[#636059]">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}
