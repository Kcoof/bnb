"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rotateChatTokenAction } from "@/app/actions/reservations";

export function RotateTokenButton(props: { reservationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={async () => {
          if (!confirm("Generate a new link? The old guest link stops working immediately.")) return;
          setPending(true);
          setError(null);
          const result = await rotateChatTokenAction(props.reservationId);
          setPending(false);
          if (result?.error) setError(result.error);
          else router.refresh();
        }}
        disabled={pending}
        className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Rotating…" : "Rotate link (kills old)" }
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
