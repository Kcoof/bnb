"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hostReplyAction } from "@/app/actions/conversations";
import { Icon } from "@/components/Icon";

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
    <div>
      <div className="flex items-end gap-2 rounded-[20px] border border-line bg-surface px-3 py-1.5 transition duration-150 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-focus/20">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Reply as host — the guest sees this in their chat, resolves escalations, and (if we have their email) they get a notification."
          className="max-h-32 min-h-10 flex-1 resize-none [field-sizing:content] bg-transparent text-[16px] leading-6 outline-none placeholder:text-ink-3"
        />
        <button
          onClick={onSend}
          disabled={pending || !text.trim()}
          aria-label="Send reply"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white transition duration-150 active:scale-[0.9] disabled:bg-black/[0.08] disabled:text-ink-3"
        >
          {pending ? <span className="spinner" /> : <Icon name="send" size={16} />}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-footnote text-danger">
          <Icon name="alertCircle" size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
