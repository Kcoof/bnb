"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTemplateAction, sendTestEmailAction } from "@/app/actions/settings";

export function TemplateEditor(props: {
  type: string;
  label: string;
  defaultSubject: string;
  initialSubject: string;
  initialBody: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(props.initialSubject || props.defaultSubject);
  const [body, setBody] = useState(props.initialBody);
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-900">{props.label}</h2>
        {props.initialBody && (
          <span className="text-xs text-emerald-700">customized</span>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Body (HTML)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Empty = system default template"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={async () => {
            setPending(true);
            setError(null);
            setSaved(false);
            const result = await saveTemplateAction({ type: props.type, subject, body });
            setPending(false);
            if (result?.error) setError(result.error);
            else {
              setSaved(true);
              router.refresh();
            }
          }}
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "…" : "Save template"}
        </button>
        <input
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          type="email"
          placeholder="send test to…"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={async () => {
            if (!testTo.trim()) return;
            setTestResult(null);
            const result = await sendTestEmailAction(testTo);
            setTestResult(result?.error ? `Error: ${result.error}` : "Test email sent ✓");
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Send test email
        </button>
        {saved && <span className="text-sm text-emerald-700">Saved ✓</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
        {testResult && <span className="text-sm text-slate-600">{testResult}</span>}
      </div>
    </div>
  );
}
