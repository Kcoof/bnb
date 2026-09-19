import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cleaners, properties, tasks } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { CopyButton } from "@/components/CopyButton";
import { appUrl } from "@/lib/mail";
import { TaskRowActions } from "./TaskRowActions";
import { CleanerPanel } from "./CleanerPanel";
import { AdHocTaskForm } from "./AdHocTaskForm";

export default async function TasksPage() {
  const member = await requireOrgMember();
  if (!member) return null;

  const [props, cleanerList] = await Promise.all([
    db.select().from(properties).where(eq(properties.orgId, member.profile.orgId)),
    db.select().from(cleaners).where(eq(cleaners.orgId, member.profile.orgId)),
  ]);

  const rows = await db
    .select({ t: tasks, p: properties })
    .from(tasks)
    .innerJoin(properties, eq(tasks.propertyId, properties.id))
    .where(eq(tasks.orgId, member.profile.orgId))
    .orderBy(tasks.dueAt);

  const open = rows.filter(({ t }) => t.status === "pending" || t.status === "in_progress");
  const closed = rows
    .filter(({ t }) => t.status !== "pending" && t.status !== "in_progress")
    .reverse()
    .slice(0, 20);

  function renderRow({ t, p }: (typeof rows)[number]) {
    const cleaner = cleanerList.find((c) => c.id === t.cleanerId);
    return (
      <div
        key={t.id}
        className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3 last:border-0"
      >
        <div>
          <div className="font-medium text-slate-900">
            {p.name} — <StatusPill status={t.status} />
          </div>
          <div className="text-xs text-slate-500">
            due {t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 16).replace("T", " ") : "—"}
            {cleaner ? ` · ${cleaner.name}` : " · unassigned"}
            {t.notes ? ` · ${t.notes}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={`${appUrl()}/c/${t.token}`} label="Copy link" />
          {(t.status === "pending" || t.status === "in_progress") && (
            <TaskRowActions
              taskId={t.id}
              cleaners={cleanerList.map((c) => ({ id: c.id, name: c.name }))}
              assignedCleanerId={t.cleanerId ?? ""}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Cleaning tasks</h1>

      <section>
        <h2 className="mb-2 font-medium text-slate-900">Open ({open.length})</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {open.length === 0 && <p className="p-4 text-sm text-slate-500">No open tasks.</p>}
          {open.map(renderRow)}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-900">Ad-hoc task</h2>
        <AdHocTaskForm properties={props.map((p) => ({ id: p.id, name: p.name }))} cleaners={cleanerList.map((c) => ({ id: c.id, name: c.name }))} />
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-900">Cleaners</h2>
        <CleanerPanel cleaners={cleanerList.map((c) => ({ id: c.id, name: c.name, email: c.email ?? "", phone: c.phone ?? "" }))} />
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-900">Recent closed</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {closed.length === 0 && <p className="p-4 text-sm text-slate-500">None yet.</p>}
          {closed.map(renderRow)}
        </div>
      </section>
    </div>
  );
}
