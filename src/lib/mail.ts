import "server-only";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  emailTemplates,
  organizations,
  properties,
  propertyKnowledge,
  reservations,
} from "@/lib/db/schema";

// Email rendering + sending — plan §5.2/§5.3.

export type TemplateVars = Record<string, string>;

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function chatUrl(token: string): string {
  return `${appUrl()}/chat/${token}`;
}

export function taskUrl(token: string): string {
  return `${appUrl()}/c/${token}`;
}

/** HTML-escape a value before interpolation into an email (review M7). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(text: string, vars: TemplateVars): string {
  // values are escaped — templates themselves stay raw HTML
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    escapeHtml(vars[key] ?? ""),
  );
}

const DEFAULTS: Record<string, { subject: string; body: string }> = {
  welcome: {
    subject: "Your stay at {{propertyName}} — meet your assistant",
    body: `<p>Hi {{guestFirstName}},</p>
<p>{{orgName}} is getting {{propertyName}} ready for your stay {{checkIn}} → {{checkOut}}.</p>
<p>Meet {{assistantName}}, who answers questions about the property 24/7 — wifi, parking, check-in, the neighborhood:</p>
<p><a href="{{chatUrl}}">Chat with {{assistantName}}</a></p>
<p>See you soon,<br>{{orgName}}</p>`,
  },
  checkin: {
    subject: "Everything you need for check-in at {{propertyName}} ({{checkIn}})",
    body: `<p>Hi {{guestFirstName}},</p>
<p>Check-in from {{checkinTime}} on {{checkIn}}. Here's all of it:</p>
<p>{{checkinInstructions}}</p>
<p>Door code: {{doorCode}} · Wifi: {{wifiNetwork}} / {{wifiPassword}}</p>
<p>Parking: {{parking}}</p>
<p>Full details &amp; live help: <a href="{{chatUrl}}">{{assistantName}}</a></p>`,
  },
  checkout: {
    subject: "Checkout on {{checkOut}} at {{checkoutTime}} — quick checklist",
    body: `<p>Hi {{guestFirstName}},</p>
<p>Checkout is {{checkoutTime}} on {{checkOut}}.</p>
<p>{{checkoutInstructions}}</p>
<p>Questions before you leave? {{assistantName}} is right here: <a href="{{chatUrl}}">{{chatUrl}}</a></p>`,
  },
  cleaner_assignment: {
    subject: "Cleaning — {{propertyName}} after checkout {{checkOut}}",
    body: `<p>Ready by: {{dueAt}} · Access: {{cleaningNotes}}</p>
<p>Property: {{propertyAddress}}</p>
<p>Open your task (no login needed): <a href="{{taskUrl}}">{{taskUrl}}</a></p>`,
  },
};

/** Build the standard variable bag for a reservation context (plan §5.3). */
export async function templateVars(reservationId: string): Promise<TemplateVars> {
  const rows = await db
    .select({
      reservation: reservations,
      property: properties,
      kb: propertyKnowledge,
      org: organizations,
    })
    .from(reservations)
    .innerJoin(properties, eq(reservations.propertyId, properties.id))
    .innerJoin(propertyKnowledge, eq(propertyKnowledge.propertyId, properties.id))
    .innerJoin(organizations, eq(reservations.orgId, organizations.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);
  const r = rows[0];
  if (!r) return {};

  const first = (r.reservation.guestName ?? "").split(" ")[0] || "there";
  return {
    guestFirstName: first,
    guestName: r.reservation.guestName ?? "Guest",
    propertyName: r.property.name,
    propertyAddress: r.property.address,
    checkIn: r.reservation.checkIn,
    checkOut: r.reservation.checkOut,
    checkinTime: r.property.checkinTime,
    checkoutTime: r.property.checkoutTime,
    chatUrl: r.reservation.chatToken ? chatUrl(r.reservation.chatToken) : "",
    assistantName: r.property.assistantName,
    orgName: r.org.name,
    senderName: r.org.senderName,
    doorCode: r.kb.doorCode,
    wifiNetwork: r.kb.wifiNetwork,
    wifiPassword: r.kb.wifiPassword,
    parking: r.kb.parking,
    checkinInstructions: r.kb.checkinInstructions || "(see chat link)",
    checkoutInstructions: r.kb.checkoutInstructions || "(see chat link)",
    cleaningNotes: r.kb.cleaningNotes,
  };
}

/** Render subject+html for a message type: org override or system default. */
export async function renderEmail(
  orgId: string,
  type: string,
  vars: TemplateVars,
): Promise<{ subject: string; html: string }> {
  const override = (
    await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.orgId, orgId))
  ).find((t) => t.type === type);

  const tpl = override
    ? { subject: override.subject, body: override.body }
    : (DEFAULTS[type] ?? { subject: `{{propertyName}}`, body: "<p>{{propertyName}}</p>" });

  return { subject: render(tpl.subject, vars), html: render(tpl.body, vars) };
}

/** Host copy-paste snippet for channel threads (primary link channel, D3). */
export async function renderSnippet(
  reservationId: string,
  hostName: string,
): Promise<string> {
  const vars = await templateVars(reservationId);
  return `Hi ${vars.guestFirstName}! I've set up a 24/7 assistant for your stay at ${vars.propertyName} — it knows wifi, parking, check-in details and the house manual: ${vars.chatUrl}  — ${hostName}`;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ id: string } | { error: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (error) return { error: error.message };
  return { id: data?.id ?? "" };
}
