"use client";

import { useState } from "react";
import { testQuestionAction } from "@/app/actions/test-question";

// "Test AI question" — KB editor's definition of done (plan §6, property page).
export function TestQuestionForm(props: { propertyId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [pending, setPending] = useState(false);

  async function onAsk() {
    if (!question.trim()) return;
    setPending(true);
    setAnswer(null);
    const result = await testQuestionAction(props.propertyId, question.trim());
    setPending(false);
    if (result?.error) setAnswer(`Error: ${result.error}`);
    else {
      setAnswer(result.answer ?? "(no answer)");
      setEscalated(Boolean(result.escalated));
    }
  }

  return (
    <div className="space-y-3 card p-6">
      <h2 className="font-semibold text-ink">Test AI question</h2>
      <p className="text-xs text-ink-2">
        Plays a guest question against the current knowledge base — exactly what a
        guest would get.
      </p>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='e.g. "What is the wifi password?"'
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === "Enter" && onAsk()}
        />
        <button
          onClick={onAsk}
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Asking…" : "Ask"}
        </button>
      </div>
      {answer && (
        <div
          className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
            escalated ? "bg-amber-50 text-amber-900" : "bg-surface-2 text-ink"
          }`}
        >
          {escalated && <div className="mb-1 font-medium">⚠ Would escalate to host</div>}
          {answer}
        </div>
      )}
    </div>
  );
}
