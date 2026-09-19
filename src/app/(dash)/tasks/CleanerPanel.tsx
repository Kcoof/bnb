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
          <span className="text-xs text-slate-500">
            {c.email || "no email"} {c.phone ? `· ${c.phone}` : ""}
          </span>
        </div>
      ))}
      {props.cleaners.length === 0 && (
        <p className="text-sm text-slate-500">
          No cleaners yet — add one to enable assignment emails.
        </p>
      )}
      <form action={onSubmit} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Name</label>
          <input name="name" required className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Email</label>
          <input name="email" type="email" className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Phone</label>
          <input name="phone" className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          {pending ? "…" : "Add cleaner"}
        </button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
