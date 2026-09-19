"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveEscalationAction } from "@/app/actions/conversations";

export function EscalationBannerActions(props: { escalationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-red-600">
        Reply below to resolve + notify the guest,
      </span>
      <button
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await resolveEscalationAction(props.escalationId);
          setPending(false);
          if (result?.error) setError(result.error);
          else router.refresh();
        }}
        disabled={pending}
        className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "…" : "or mark handled offline"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
