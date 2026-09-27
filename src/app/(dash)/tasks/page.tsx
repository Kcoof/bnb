import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cleaners, properties, tasks } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
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

  // eslint-disable-next-line react-hooks/purity -- server component, no hooks
  const now = Date.now();

  function dueChip(dueAt: Date | null) {
    if (!dueAt) return (
      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-ink-2">
        no due date
      </span>
    );
    const label = new Date(dueAt).toISOString().slice(0, 16).replace("T", " ");
    const ts = new Date(dueAt).getTime();
    const overdue = ts < now;
    const todayStr = new Date(now).toISOString().slice(0, 10);
    const dueToday = new Date(dueAt).toISOString().slice(0, 10) === todayStr;
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums ${overdue ? "bg-danger-tint text-danger" : dueToday ? "bg-warning-tint text-warning" : "bg-surface-2 text-ink-2"}`}>
        {overdue ? "Overdue" : "Due"} {label}
      </span>
    );
  }

  function renderRow({ t, p }: (typeof rows)[number], closedRow = false) {
    const cleaner = cleanerList.find((c) => c.id === t.cleanerId);
    return (
      <div
        key={t.id}
        className={`flex flex-wrap items-center justify-between gap-2 px-5 py-4 ${closedRow ? "opacity-70" : ""}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">
            <Icon name="house" size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-callout font-medium text-ink">{p.name}</span>
              <StatusPill status={t.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-footnote">
              {dueChip(t.dueAt)}
              <span className={cleaner ? "text-ink-2" : "text-ink-3"}>
                {cleaner ? cleaner.name : "unassigned"}
              </span>
              {t.notes && <span className="text-ink-2">· {t.notes}</span>}
            </div>
          </div>
        </div>
        {!closedRow && (
          <div className="flex items-center gap-2">
            <CopyButton text={`${appUrl()}/c/${t.token}`} label="Link" />
            {(t.status === "pending" || t.status === "in_progress") && (
              <TaskRowActions
                taskId={t.id}
                cleaners={cleanerList.map((c) => ({ id: c.id, name: c.name }))}
                assignedCleanerId={t.cleanerId ?? ""}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-title-1">Cleaning tasks</h1>

      <section>
        <h2 className="mb-2 text-title-3">
          Open <span className="ml-1 text-footnote font-normal text-ink-2">{open.length}</span>
        </h2>
        <div className="list-card">
          {open.length === 0 && (
            <p className="py-8 text-center text-callout text-ink-2">No open tasks.</p>
          )}
          {open.map((r) => renderRow(r))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-title-3">Ad-hoc task</h2>
        <AdHocTaskForm
          properties={props.map((p) => ({ id: p.id, name: p.name }))}
          cleaners={cleanerList.map((c) => ({ id: c.id, name: c.name }))}
        />
      </section>

      <section>
        <h2 className="mb-2 text-title-3">Cleaners</h2>
        <CleanerPanel
          cleaners={cleanerList.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email ?? "",
            phone: c.phone ?? "",
          }))}
        />
      </section>

      <section>
        <h2 className="mb-2 text-title-3">
          Recent closed{" "}
          <span className="ml-1 text-footnote font-normal text-ink-2">{closed.length}</span>
        </h2>
        <div className="list-card">
          {closed.length === 0 && (
            <p className="py-8 text-center text-callout text-ink-2">None yet.</p>
          )}
          {closed.map((r) => renderRow(r, true))}
        </div>
      </section>
    </div>
  );
}
