"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: string; content: string; createdAt?: string };

const QUICK_REPLIES = [
  "WiFi",
  "Parking",
  "Check-in",
  "Checkout",
  "House rules",
  "Nearby places",
  "I need help",
];

export function ChatWidget(props: {
  token: string;
  assistantName: string;
  propertyName: string;
  guestFirst: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestamp = useRef<string | null>(null);

  // initial + poll for host replies every 15s (§4.6)
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const url = `/api/chat/${props.token}/messages${lastTimestamp.current ? `?after=${encodeURIComponent(lastTimestamp.current)}` : ""}`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 404) {
          setError("This link is no longer active.");
          return;
        }
        const data = (await res.json()) as { messages: Msg[] };
        if (cancelled || data.messages?.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.createdAt));
            const fresh = data.messages.filter((m) => !seen.has(m.createdAt));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
          const last = data.messages[data.messages.length - 1];
          if (last?.createdAt) lastTimestamp.current = last.createdAt;
        }
      } catch {
        // transient network — next poll retries
      }
    }
    poll();
    const id = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [props.token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError(null);
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { role: "guest", content: text, createdAt: `local-${Date.now()}` },
      { role: "assistant", content: "", createdAt: `local-stream-${Date.now()}` },
    ]);

    try {
      const res = await fetch(`/api/chat/${props.token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (res.status === 429) {
        setMessages((prev) => prev.slice(0, -1));
        setError("Please wait a few seconds between messages.");
        setStreaming(false);
        return;
      }
      if (!res.ok || !res.body) {
        setMessages((prev) => prev.slice(0, -1));
        setError(res.status === 404 ? "This link is no longer active." : "Something went wrong — please try again.");
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: full, createdAt: `local-stream` };
          return next;
        });
      }
      // refresh from server to get canonical timestamps + host messages
      lastTimestamp.current = null;
    } catch {
      setMessages((prev) => prev.slice(0, -1));
      setError("Network problem — please resend.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
            {props.assistantName.slice(0, 1)}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {props.assistantName} · {props.propertyName}
            </div>
            <div className="text-xs text-emerald-600">online 24/7</div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-2 overflow-y-auto px-4 py-6">
        <div className="mx-auto mb-4 max-w-md rounded-xl bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
          Hi {props.guestFirst}! Ask me anything about your stay — wifi, parking,
          check-in, checkout, the neighborhood.
        </div>
        {messages.map((m, i) => (
          <div
            key={m.createdAt ?? i}
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "guest"
                ? "ml-auto bg-blue-600 text-white"
                : m.role === "host"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-white text-slate-800 shadow-sm"
            }`}
          >
            {m.role === "host" && (
              <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                Your host
              </div>
            )}
            {m.content || (streaming ? "…" : "")}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                disabled={streaming}
                className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type your question…"
              maxLength={2000}
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {streaming ? "…" : "Send"}
            </button>
          </div>
          {error && (
            <p className="mt-1 text-center text-xs text-red-600">{error}</p>
          )}
        </div>
      </footer>
    </main>
  );
}
