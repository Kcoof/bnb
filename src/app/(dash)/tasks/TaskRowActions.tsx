"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignCleanerAction, cancelTaskAction, hostMarkCleanedAction } from "@/app/actions/tasks";

export function TaskRowActions(props: {
  taskId: string;
  cleaners: { id: string; name: string }[];
  assignedCleanerId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error?: string }>) {
    setPending(true);
    setError(null);
    const result = await fn();
    setPending(false);
    if (result?.error) setError(result.error);
    else router.refresh();
  }

  return (
    <span className="flex items-center gap-1">
      <select
        defaultValue={props.assignedCleanerId}
        disabled={pending}
        onChange={(e) =>
          e.target.value && run(() => assignCleanerAction(props.taskId, e.target.value))
        }
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
      >
        <option value="">assign cleaner…</option>
        {props.cleaners.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => run(() => hostMarkCleanedAction(props.taskId))}
        disabled={pending}
        className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      >
        Mark cleaned
      </button>
      <button
        onClick={() => confirm("Cancel this task?") && run(() => cancelTaskAction(props.taskId))}
        disabled={pending}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
