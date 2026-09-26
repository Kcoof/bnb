import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, propertyKnowledge } from "@/lib/db/schema";
import { validateTaskToken } from "@/lib/tokens";
import { StatusPill } from "@/components/StatusPill";
import { Icon } from "@/components/Icon";
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
    <main className="mx-auto max-w-[480px] px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-8">
      <div className="animate-fade-up">
        <p className="text-footnote text-ink-2">Cleaning</p>
        <h1 className="mt-1 text-title-1">{p.name}</h1>
        <div className="mt-2 space-y-1 text-callout text-ink-2">
          <div className="flex items-center gap-1.5">
            <Icon name="pin" size={16} />
            {p.address || "no address"}
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="clock" size={16} />
            due{" "}
            {task.dueAt
              ? new Date(task.dueAt).toISOString().slice(0, 16).replace("T", " ")
              : "—"}
          </div>
        </div>
        <div className="mt-3">
          <StatusPill status={task.status} />
        </div>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="text-callout font-semibold">Access notes</h2>
        <p className="mt-1.5 whitespace-pre-wrap text-body text-ink-2">
          {kb.cleaningNotes || "(no access notes provided)"}
        </p>
      </section>

      <div className="mt-6">
        <CleanerActions token={token} closed={closed} status={task.status} />
      </div>

      <p className="mt-6 text-center text-caption-1 text-ink-3">
        This is your personal task link — no login needed.
      </p>
    </main>
  );
}
