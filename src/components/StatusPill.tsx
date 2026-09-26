import type { ReactNode } from "react";

// StatusPill v2 — design plan §2.3/§4.6: tinted bg + colored text + 6px dot.
// AA-checked pairs only. Same component API as before.
const STYLES: Record<string, string> = {
  ready: "bg-success-tint text-success",
  done: "bg-success-tint text-success",
  resolved: "bg-success-tint text-success",
  sent: "bg-success-tint text-success",
  occupied: "bg-accent-tint text-[#0a62c0]",
  arrived: "bg-accent-tint text-[#0a62c0]",
  needs_cleaning: "bg-warning-tint text-warning",
  pending: "bg-warning-tint text-warning",
  cleaning: "bg-[#f0ebfd] text-[#5b3fbf]",
  in_progress: "bg-[#f0ebfd] text-[#5b3fbf]",
  blocked: "bg-danger-tint text-danger",
  open: "bg-danger-tint text-danger",
  cancelled: "bg-danger-tint text-danger",
  failed: "bg-danger-tint text-danger",
  upcoming: "bg-surface-2 text-ink",
  departed: "bg-surface-2 text-ink-2",
  skipped: "bg-surface-2 text-ink-2",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${STYLES[status] ?? "bg-surface-2 text-ink-2"}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function UnreadBadge({ count }: { count: number }): ReactNode {
  return (
    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-medium text-white">
      {count}
    </span>
  );
}
