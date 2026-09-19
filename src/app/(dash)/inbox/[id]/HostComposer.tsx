"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hostReplyAction } from "@/app/actions/conversations";

export function HostComposer(props: { conversationId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSend() {
    if (!text.trim()) return;
    setPending(true);
    setError(null);
    const result = await hostReplyAction(props.conversationId, text);
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setText("");
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Reply as host — the guest sees this in their chat, resolves escalations, and (if we have their email) they get a notification."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          onClick={onSend}
          disabled={pending || !text.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send reply"}
        </button>
      </div>
    </div>
  );
}
