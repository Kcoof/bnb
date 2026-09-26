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
      className="btn btn-ghost-danger btn-sm disabled:opacity-50"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
