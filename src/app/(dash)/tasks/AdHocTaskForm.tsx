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
        <label className="mb-1 block text-[13px] font-medium text-ink">Property</label>
        <select name="propertyId" required className="input h-9 w-auto px-2.5 text-[14px]">
          {props.properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-ink">Cleaner</label>
        <select name="cleanerId" className="input h-9 w-auto px-2.5 text-[14px]">
          <option value="">unassigned</option>
          {props.cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-ink">Due date</label>
        <input name="dueDate" type="date" className="input h-9 w-auto px-2.5 text-[14px]" />
      </div>
      <div className="min-w-40 flex-1">
        <label className="mb-1 block text-[13px] font-medium text-ink">Notes (deep clean etc.)</label>
        <input name="notes" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
        {pending ? "…" : "Create task"}
      </button>
      {error && <p className="w-full text-footnote text-danger">{error}</p>}
    </form>
  );
}
