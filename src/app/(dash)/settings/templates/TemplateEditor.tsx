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
    <div className="space-y-3 rounded-xl border border-hairline bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink">{props.label}</h2>
        {props.initialBody && (
          <span className="text-xs text-success">customized</span>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Body (HTML)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Empty = system default template"
          className="input font-mono"
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
          className="btn btn-primary btn-md"
        >
          {pending ? "…" : "Save template"}
        </button>
        <input
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          type="email"
          placeholder="send test to…"
          className="input"
        />
        <button
          onClick={async () => {
            if (!testTo.trim()) return;
            setTestResult(null);
            const result = await sendTestEmailAction(testTo);
            setTestResult(result?.error ? `Error: ${result.error}` : "Test email sent ✓");
          }}
          className="btn btn-secondary btn-sm"
        >
          Send test email
        </button>
        {saved && <span className="text-footnote text-success">Saved ✓</span>}
        {error && <span className="text-footnote text-danger">{error}</span>}
        {testResult && <span className="text-sm text-ink-2">{testResult}</span>}
      </div>
    </div>
  );
}
