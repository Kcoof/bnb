"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
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
      <div className="rounded-lg bg-success-tint p-5 text-center">
        <div className="mx-auto w-fit text-success">
          <Icon name="check" size={24} />
        </div>
        <p className="mt-2 text-callout font-semibold text-ink">
          This task is done. Thank you!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {props.status === "pending" && (
        <button
          onClick={() => run(() => cleanerStartAction(props.token), "Cleaning started")}
          disabled={pending}
          className="btn btn-primary h-[52px] w-full rounded-md text-[17px] font-semibold"
        >
          {pending ? <span className="spinner" /> : null}
          Start cleaning
        </button>
      )}

      <div className="card p-5">
        <label className="mb-1.5 block text-[13px] font-medium text-ink">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything the host should know…"
          className="input"
        />
        <button
          onClick={() => run(() => cleanerDoneAction(props.token, notes), "Marked cleaned")}
          disabled={pending}
          className="mt-3 h-[52px] w-full rounded-md bg-success text-[17px] font-semibold text-white transition duration-150 active:scale-[0.98] hover:bg-[#136c34] disabled:opacity-50"
        >
          {pending ? <span className="spinner" /> : null}
          Mark cleaned
        </button>
      </div>

      <div className="rounded-lg border border-hairline bg-warning-tint p-5">
        <label className="mb-1.5 block text-[13px] font-medium text-warning">
          Report a problem
        </label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={2}
          placeholder="What's wrong? (missing supplies, damage, couldn't access…)"
          className="input"
        />
        <button
          onClick={() =>
            run(() => cleanerReportProblemAction(props.token, problem), "Problem reported to the host")
          }
          disabled={pending || !problem.trim()}
          className="mt-3 h-[52px] w-full rounded-md border border-line bg-surface text-[17px] font-semibold text-danger transition duration-150 active:scale-[0.98] hover:bg-danger-tint disabled:opacity-50"
        >
          Send to host
        </button>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-footnote text-danger">
          <Icon name="alertCircle" size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      {ok && (
        <p className="flex items-start gap-1.5 text-footnote text-success">
          <Icon name="check" size={14} className="mt-0.5 shrink-0" />
          {ok}
        </p>
      )}
    </div>
  );
}
