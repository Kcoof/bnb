import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, propertyKnowledge } from "@/lib/db/schema";
import { validateTaskToken } from "@/lib/tokens";
import { StatusPill } from "@/components/StatusPill";
import { CleanerActions } from "./CleanerActions";

export const metadata: Metadata = {
  title: "Cleaning task",
  robots: { index: false, follow: false },
};

export default async function CleanerTaskPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await validateTaskToken(token);
  if (!ctx) notFound();
  const { task } = ctx;

  const rows = await db
    .select({ p: properties, kb: propertyKnowledge })
    .from(properties)
    .innerJoin(propertyKnowledge, eq(propertyKnowledge.propertyId, properties.id))
    .where(eq(properties.id, task.propertyId))
    .limit(1);
  const row = rows[0];
  if (!row) notFound();
  const { p, kb } = row;

  const closed = task.status === "done" || task.status === "skipped" || task.status === "cancelled";

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Cleaning — {p.name}</h1>
        <div className="mt-1 text-sm text-slate-500">
          {p.address} · due{" "}
          {task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16).replace("T", " ") : "—"}
        </div>
        <div className="mt-2">
          <StatusPill status={task.status} />
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Access notes</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
          {kb.cleaningNotes || "(no access notes provided)"}
        </p>
      </section>

      <CleanerActions token={token} closed={closed} status={task.status} />

      <p className="text-center text-xs text-slate-400">
        This is your personal task link — no login needed.
      </p>
    </main>
  );
}
