"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

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
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestamp = useRef<string | null>(null);

  // initial + poll for host replies every 15s (§4.6 of the technical plan)
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
        if (!cancelled) setLoaded(true);
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
      { role: "assistant", content: "", createdAt: "local-stream" },
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
        setError(
          res.status === 404
            ? "This link is no longer active."
            : res.status === 402
              ? "The concierge is briefly unavailable — your host has been notified. For urgent help, contact them via your booking app."
              : "Something went wrong — please try again.",
        );
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
          next[next.length - 1] = { role: "assistant", content: full, createdAt: "local-stream" };
          return next;
        });
      }
      lastTimestamp.current = null;
    } catch {
      setMessages((prev) => prev.slice(0, -1));
      setError("Network problem — please resend.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main className="flex h-[100dvh] flex-col bg-surface">
      {/* Header — frosted */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-[var(--nav-bg)] backdrop-blur-nav pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-[640px] items-center gap-3 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-tint text-accent">
            <Icon name="bot" size={20} />
          </div>
          <div>
            <div className="text-callout font-semibold text-ink">
              {props.assistantName} · {props.propertyName}
            </div>
            <div className="flex items-center gap-1.5 text-caption-1 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              online 24/7
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="mx-auto max-w-[640px] space-y-2">
          <div className="mx-auto mb-4 max-w-md rounded-lg bg-surface-2 p-5 text-center text-callout text-ink-2">
            Hi {props.guestFirst}! Ask me anything about your stay — wifi, parking,
            check-in, checkout, the neighborhood.
          </div>

          {!loaded && (
            <>
              <div className="skeleton h-10 w-2/3 rounded-[22px]" />
              <div className="skeleton ml-auto h-10 w-1/2 rounded-[22px]" />
              <div className="skeleton h-10 w-3/5 rounded-[22px]" />
            </>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const grouped =
              prev && prev.role === m.role && m.createdAt !== "local-stream";
            const isStreamingBubble = m.createdAt === "local-stream" && streaming;

            if (m.role === "host") {
              return (
                <div key={m.createdAt ?? i} className="animate-msg-in">
                  <div className="mb-0.5 ml-1 text-caption-1 font-medium text-ink-2">
                    Your host
                  </div>
                  <div className="bubble-in">{m.content}</div>
                </div>
              );
            }
            if (m.role === "system_note") {
              return (
                <div key={m.createdAt ?? i} className="bubble-note animate-msg-in">
                  {m.content}
                </div>
              );
            }
            if (m.role === "assistant") {
              return (
                <div
                  key={m.createdAt ?? i}
                  className={`bubble-in animate-msg-in ${grouped ? "!mt-0.5" : ""} ${isStreamingBubble && !m.content ? "flex items-center gap-1" : ""} ${isStreamingBubble && m.content ? "streaming-caret" : ""}`}
                >
                  {isStreamingBubble && !m.content ? (
                    <>
                      <Dot delay="0ms" />
                      <Dot delay="150ms" />
                      <Dot delay="300ms" />
                    </>
                  ) : (
                    m.content
                  )}
                </div>
              );
            }
            // guest
            return (
              <div
                key={m.createdAt ?? i}
                className={`bubble-out animate-msg-in ${grouped ? "!mt-0.5" : ""}`}
              >
                {m.content}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Quick replies + composer — frosted */}
      <footer className="sticky bottom-0 z-30 border-t border-hairline bg-[var(--nav-bg)] backdrop-blur-nav pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        <div className="mx-auto max-w-[640px] px-4">
          <div className="mb-2 flex gap-2 overflow-x-auto px-0 pb-1 [scrollbar-width:none]">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                disabled={streaming}
                className="h-9 shrink-0 rounded-full border border-line bg-surface px-4 text-[14px] font-medium text-ink transition duration-150 active:scale-[0.95] hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-[20px] border border-line bg-surface px-3 py-1.5 transition duration-150 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-focus/20">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Type your question…"
              maxLength={2000}
              className="max-h-32 min-h-10 flex-1 resize-none [field-sizing:content] bg-transparent text-[16px] leading-6 outline-none placeholder:text-ink-3"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              aria-label="Send"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white transition duration-150 active:scale-[0.9] disabled:bg-black/[0.08] disabled:text-ink-3"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
          {error && (
            <p className="mt-1.5 text-center text-footnote text-danger">{error}</p>
          )}
        </div>
      </footer>
    </main>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-ink-2/70 animate-typing"
      style={{ animationDelay: delay }}
    />
  );
}
