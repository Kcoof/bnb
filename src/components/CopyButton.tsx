"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

// Ghost icon-pill (§4.1 icon-only) when label is short; keeps full label text
// when provided. Behavior unchanged: clipboard + fallback + 1.5s confirmation.
export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={
        "btn btn-ghost btn-sm px-3 " + className
      }
    >
      {copied ? (
        <Icon name="check" size={14} />
      ) : (
        <Icon name="copy" size={14} />
      )}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
