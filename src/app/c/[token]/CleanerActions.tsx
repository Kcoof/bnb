"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cleanerDoneAction,
  cleanerReportProblemAction,
  cleanerStartAction,
} from "@/app/actions/cleaner";

export function CleanerActions(props: {
  token: string;
  closed: boolean;
  status: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [problem, setProblem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<{ error?: string }>, successMsg: string) {
    setPending(true);
    setError(null);
    setOk(null);
    const result = await fn();
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setOk(successMsg);
      router.refresh();
    }
  }

  if (props.closed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        This task is closed. Thank you!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {props.status === "pending" && (
        <button
          onClick={() => run(() => cleanerStartAction(props.token), "Cleaning started")}
          disabled={pending}
          className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Start cleaning
        </button>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything the host should know…"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => run(() => cleanerDoneAction(props.token, notes), "Marked cleaned ✓")}
          disabled={pending}
          className="mt-2 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Mark cleaned
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <label className="block text-sm font-medium text-amber-900">
          Report a problem
        </label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={2}
          placeholder="What's wrong? (missing supplies, damage, couldn't access…)"
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={() =>
            run(() => cleanerReportProblemAction(props.token, problem), "Problem reported to the host")
          }
          disabled={pending || !problem.trim()}
          className="mt-2 w-full rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          Send to host
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {ok && <p className="text-sm text-emerald-700">{ok}</p>}
    </div>
  );
}
