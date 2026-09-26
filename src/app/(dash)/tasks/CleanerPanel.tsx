"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCleanerAction } from "@/app/actions/tasks";

export function CleanerPanel(props: {
  cleaners: { id: string; name: string; email: string; phone: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createCleanerAction({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });
    setPending(false);
    if (result?.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      {props.cleaners.map((c) => (
        <div key={c.id} className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-800">{c.name}</span>
          <span className="text-caption-1 text-ink-2">
            {c.email || "no email"} {c.phone ? `· ${c.phone}` : ""}
          </span>
        </div>
      ))}
      {props.cleaners.length === 0 && (
        <p className="text-footnote text-ink-2">
          No cleaners yet — add one to enable assignment emails.
        </p>
      )}
      <form action={onSubmit} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink">Name</label>
          <input name="name" required className="input h-9 w-auto px-2.5 text-[14px]" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink">Email</label>
          <input name="email" type="email" className="input h-9 w-auto px-2.5 text-[14px]" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink">Phone</label>
          <input name="phone" className="input h-9 w-auto px-2.5 text-[14px]" />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "…" : "Add cleaner"}
        </button>
      </form>
      {error && <p className="text-footnote text-danger">{error}</p>}
    </div>
  );
}
