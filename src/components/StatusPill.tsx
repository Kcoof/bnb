const COLORS: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-800",
  occupied: "bg-blue-100 text-blue-800",
  needs_cleaning: "bg-amber-100 text-amber-800",
  cleaning: "bg-violet-100 text-violet-800",
  blocked: "bg-red-100 text-red-800",
  upcoming: "bg-slate-100 text-slate-700",
  arrived: "bg-blue-100 text-blue-800",
  departed: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-50 text-red-600",
  pending: "bg-amber-100 text-amber-800",
  in_progress: "bg-violet-100 text-violet-800",
  done: "bg-emerald-100 text-emerald-800",
  skipped: "bg-slate-100 text-slate-500",
  open: "bg-red-100 text-red-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
