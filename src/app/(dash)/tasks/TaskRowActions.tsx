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
    <span className="flex items-center gap-1.5">
      <select
        defaultValue={props.assignedCleanerId}
        disabled={pending}
        onChange={(e) =>
          e.target.value && run(() => assignCleanerAction(props.taskId, e.target.value))
        }
        className="input h-8 w-auto px-2.5 pr-8 text-[13px]"
        aria-label="Assign cleaner"
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
        className="btn btn-primary h-8 px-3 text-[13px]"
      >
        Mark cleaned
      </button>
      <button
        onClick={() => confirm("Cancel this task?") && run(() => cancelTaskAction(props.taskId))}
        disabled={pending}
        className="btn btn-ghost-danger h-8 px-3 text-[13px]"
      >
        Cancel
      </button>
      {error && <span className="text-footnote text-danger">{error}</span>}
    </span>
  );
}
