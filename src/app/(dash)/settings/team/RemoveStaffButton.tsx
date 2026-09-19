"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeStaffAction } from "@/app/actions/settings";

export function RemoveStaffButton(props: { profileId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      onClick={async () => {
        if (!confirm("Remove this team member?")) return;
        setPending(true);
        await removeStaffAction(props.profileId);
        setPending(false);
        router.refresh();
      }}
      disabled={pending}
      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
