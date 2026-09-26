import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import {
  conversations,
  messages,
  properties,
  reservations,
  scheduledMessages,
  tasks,
} from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { StatusPill } from "@/components/StatusPill";
import { CopyButton } from "@/components/CopyButton";
import { appUrl, chatUrl, renderSnippet } from "@/lib/mail";
import { EditReservationForm } from "./EditReservationForm";
import { RotateTokenButton } from "./RotateTokenButton";

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await requireOrgMember();
  if (!member) return null;
  const { id } = await params;

  const rows = await db
    .select({ r: reservations, p: properties })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .where(and(eq(reservations.id, id), eq(reservations.orgId, member.profile.orgId)))
    .limit(1);
  const row = rows[0];
  if (!row) return <p className="text-sm text-ink-2">Reservation not found.</p>;
  const { r, p } = row;

  const conv = (
    await db
      .select()
      .from(conversations)
      .where(eq(conversations.reservationId, r.id))
      .limit(1)
  )[0];

  const transcript = conv
    ? await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(asc(messages.createdAt))
    : [];

  const scheduled = await db
    .select()
    .from(scheduledMessages)
    .where(eq(scheduledMessages.reservationId, r.id));

  const task = (
    await db.select().from(tasks).where(eq(tasks.reservationId, r.id)).limit(1)
  )[0];

  const chatLink = r.chatToken ? chatUrl(r.chatToken) : null;
  const qrDataUrl = chatLink ? await QRCode.toDataURL(chatLink, { width: 220 }) : null;
  const snippet = chatLink
    ? await renderSnippet(r.id, member.profile.fullName || "Your host")
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/reservations" className="text-xs text-ink-2 hover:text-accent hover:underline">
          ← Reservations
        </Link>
        <h1 className="text-title-1">
          {r.guestName ?? "(no guest name)"} — {p.name}
        </h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-ink-2">
          {r.checkIn} → {r.checkOut} · {r.channel} · <StatusPill status={r.status} />
          {r.isHold && <span className="text-warning">blocked dates (iCal hold)</span>}
        </div>
      </div>

      {chatLink && (
        <section className="card p-6">
          <h2 className="font-semibold text-ink">Guest chat link</h2>
          <div className="mt-3 flex flex-wrap items-start gap-6">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <code className="truncate rounded bg-surface-2 px-2 py-1 text-xs text-ink-2">
                  {chatLink}
                </code>
                <CopyButton text={chatLink} label="Copy link" />
              </div>
              {snippet && (
                <div className="flex items-start gap-2">
                  <p className="line-clamp-3 flex-1 rounded bg-surface-2 px-2 py-1 text-xs text-ink-2">
                    {snippet}
                  </p>
                  <CopyButton text={snippet} label="Copy snippet" />
                </div>
              )}
              <p className="text-xs text-ink-3">
                Valid from 3 days before check-in until 2 days after checkout.
                Paste the snippet into the booking channel thread — guests get the
                link without any email address.
              </p>
              <RotateTokenButton reservationId={r.id} />
            </div>
            {qrDataUrl && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Guest chat QR code" width={140} height={140} className="rounded-lg border border-hairline" />
                <p className="mt-1 text-xs text-ink-3">QR — print for the property</p>
              </div>
            )}
          </div>
        </section>
      )}

      {!r.isHold && (
        <section className="card p-6">
          <h2 className="font-semibold text-ink">Guest details</h2>
          <EditReservationForm
            reservationId={r.id}
            initial={{
              guestName: r.guestName ?? "",
              guestEmail: r.guestEmail ?? "",
              guestPhone: r.guestPhone ?? "",
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              notes: r.notes ?? "",
            }}
          />
        </section>
      )}

      <section className="card p-6">
        <h2 className="font-semibold text-ink">Scheduled emails</h2>
        <div className="mt-2 space-y-1 text-sm">
          {scheduled.length === 0 && (
            <p className="text-ink-2">None scheduled.</p>
          )}
          {scheduled.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b border-hairline py-1 last:border-0">
              <span className="text-ink">{m.type}</span>
              <span className="flex items-center gap-2 text-xs text-ink-2">
                {new Date(m.sendAt).toISOString().slice(0, 16).replace("T", " ")}
                <StatusPill status={m.status} />
                {m.error && <span className="text-warning">{m.error}</span>}
              </span>
            </div>
          ))}
        </div>
      </section>

      {task && (
        <section className="card p-6">
          <h2 className="font-semibold text-ink">Cleaning task</h2>
          <div className="mt-2 flex items-center justify-between text-sm">
            <Link href="/tasks" className="text-ink hover:text-accent hover:underline">
              due {task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16).replace("T", " ") : "—"}
            </Link>
            <span className="flex items-center gap-2">
              <StatusPill status={task.status} />
              <CopyButton text={`${appUrl()}/c/${task.token}`} label="Copy cleaner link" />
            </span>
          </div>
        </section>
      )}

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Conversation</h2>
          {conv && (
            <Link href={`/inbox/${conv.id}`} className="text-xs text-ink-2 hover:text-accent hover:underline">
              open in inbox →
            </Link>
          )}
        </div>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {transcript.length === 0 && (
            <p className="text-sm text-ink-2">No messages yet.</p>
          )}
          {transcript.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "guest"
                  ? "bg-slate-100 text-ink"
                  : m.role === "host"
                    ? "ml-auto bg-blue-100 text-blue-900"
                    : m.role === "system_note"
                      ? "mx-auto bg-amber-50 text-amber-800"
                      : "ml-auto bg-emerald-50 text-emerald-900"
              }`}
            >
              <div className="mb-0.5 text-[10px] uppercase tracking-wide opacity-60">
                {m.role}
                {m.escalated ? " · ⚠ escalated" : ""}
              </div>
              {m.content}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
