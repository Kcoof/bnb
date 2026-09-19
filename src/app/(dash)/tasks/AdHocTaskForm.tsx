"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdHocTaskAction } from "@/app/actions/tasks";

export function AdHocTaskForm(props: {
  properties: { id: string; name: string }[];
  cleaners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createAdHocTaskAction({
      propertyId: String(formData.get("propertyId") ?? ""),
      cleanerId: String(formData.get("cleanerId") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
    setPending(false);
    if (result?.error) setError(result.error);
    else router.refresh();
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">Property</label>
        <select name="propertyId" required className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          {props.properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Cleaner</label>
        <select name="cleanerId" className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">unassigned</option>
          {props.cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Due date</label>
        <input name="dueDate" type="date" className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <div className="min-w-40 flex-1">
        <label className="block text-xs font-medium text-slate-600">Notes (deep clean etc.)</label>
        <input name="notes" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
        {pending ? "…" : "Create task"}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
