"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hostReplyAction } from "@/app/actions/conversations";

// One-tap Approve / Decline on an escalation (Automi spec): sends the guest a
// clear host decision (optionally with a note), resolves the escalation, and
// notifies the guest — same path as a manual host reply.
export function ApproveDeclineButtons(props: { conversationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(kind: "approve" | "decline") {
    const note = prompt(
      kind === "approve"
        ? "Optional note to add to the approval:"
        : "Optional note to add to the decline:",
    );
    if (note === null) return; // cancelled
    setPending(kind);
    setError(null);
    const message =
      kind === "approve"
        ? `✅ Approved by your host${note.trim() ? ` — ${note.trim()}` : ". Enjoy!"}`
        : `❌ Sorry — your host can't accommodate this request${note.trim() ? `: ${note.trim()}` : " right now."}`;
    const result = await hostReplyAction(props.conversationId, message);
    setPending(null);
    if (result?.error) setError(result.error);
    else router.refresh();
  }

  return (
    <span className="flex items-center gap-2">
      <button
        onClick={() => decide("approve")}
        disabled={pending !== null}
        className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      >
        {pending === "approve" ? "…" : "Approve"}
      </button>
      <button
        onClick={() => decide("decline")}
        disabled={pending !== null}
        className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending === "decline" ? "…" : "Decline"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
