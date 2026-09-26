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
      <span className="text-footnote text-ink-2">
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
        className="btn btn-secondary h-8 px-3 text-[13px]"
      >
        {pending ? "…" : "or mark handled offline"}
      </button>
      {error && <span className="text-footnote text-danger">{error}</span>}
    </span>
  );
}
