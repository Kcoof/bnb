import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---- Enums (plan §2.1) ----

export const userRole = pgEnum("user_role", ["owner", "admin", "staff"]);
export const propertyStatus = pgEnum("property_status", [
  "ready",
  "occupied",
  "needs_cleaning",
  "cleaning",
  "blocked",
]);
export const reservationStatus = pgEnum("reservation_status", [
  "upcoming",
  "arrived",
  "departed",
  "cancelled",
]);
export const reservationChannel = pgEnum("reservation_channel", [
  "airbnb",
  "booking",
  "vrbo",
  "direct",
  "manual",
  "other",
]);
export const messageRole = pgEnum("message_role", [
  "guest",
  "assistant",
  "host",
  "system_note",
]);
export const taskStatus = pgEnum("task_status", [
  "pending",
  "in_progress",
  "done",
  "skipped",
  "cancelled",
]);
export const messageType = pgEnum("message_type", [
  "welcome",
  "checkin",
  "checkout",
  "cleaner_assignment",
]);
export const messageStatus = pgEnum("message_status", [
  "pending",
  "sending",
  "sent",
  "failed",
  "skipped",
  "cancelled",
]);
export const escalationSource = pgEnum("escalation_source", ["chat", "cleaner"]);
export const escalationStatus = pgEnum("escalation_status", ["open", "resolved"]);
export const eventActor = pgEnum("event_actor", [
  "host",
  "guest",
  "ai",
  "cleaner",
  "system",
]);

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow();

// Union types for use in app code (the pgEnum objects are the schema itself).
export type PropertyStatus = (typeof propertyStatus.enumValues)[number];
export type ReservationStatus = (typeof reservationStatus.enumValues)[number];

// ---- Tables (plan §2.3) ----

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  digestHour: integer("digest_hour").notNull().default(7),
  senderName: text("sender_name").notNull().default("Stay Assistant"),
  createdAt,
});

export const profiles = pgTable(
  "profiles",
  {
    // FK to auth.users(id) on delete cascade is added in db/migrations/0002_rls.sql
    // (drizzle-kit cannot snapshot a raw cross-schema reference).
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    fullName: text("full_name").notNull().default(""),
    email: text("email").notNull(),
    role: userRole("role").notNull().default("staff"),
    createdAt,
  },
  (t) => [index("profiles_org_idx").on(t.orgId)],
);

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    type: text("type").notNull().default("apartment"), // apartment|villa|boutique_hotel|guesthouse|serviced_apartment
    description: text("description").notNull().default(""),
    address: text("address").notNull().default(""),
    timezone: text("timezone").notNull().default("UTC"),
    status: propertyStatus("status").notNull().default("ready"),
    icsUrl: text("ics_url"),
    icsLastSyncedAt: timestamp("ics_last_synced_at", { withTimezone: true }),
    icsLastError: text("ics_last_error"),
    checkinTime: text("checkin_time").notNull().default("16:00"),
    checkoutTime: text("checkout_time").notNull().default("10:00"),
    assistantName: text("assistant_name").notNull().default("Alex"),
    conciergeToken: text("concierge_token").unique(), // property-level QR chat (no reservation)
    active: boolean("active").notNull().default(true),
    createdAt,
  },
  (t) => [index("properties_org_idx").on(t.orgId)],
);

export const propertyKnowledge = pgTable("property_knowledge", {
  propertyId: uuid("property_id")
    .primaryKey()
    .references(() => properties.id, { onDelete: "cascade" }),
  wifiNetwork: text("wifi_network").notNull().default(""),
  wifiPassword: text("wifi_password").notNull().default(""),
  doorCode: text("door_code").notNull().default(""),
  checkinInstructions: text("checkin_instructions").notNull().default(""),
  checkoutInstructions: text("checkout_instructions").notNull().default(""),
  parking: text("parking").notNull().default(""),
  houseRules: text("house_rules").notNull().default(""),
  appliances: text("appliances").notNull().default(""),
  emergencyInfo: text("emergency_info").notNull().default(""),
  nearby: text("nearby").notNull().default(""),
  lateCheckoutPolicy: text("late_checkout_policy").notNull().default(""),
  cleaningNotes: text("cleaning_notes").notNull().default(""),
  extras: jsonb("extras").notNull().default(sql`'[]'::jsonb`),
  updatedAt,
});

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id),
    guestName: text("guest_name"),
    guestEmail: text("guest_email"),
    guestPhone: text("guest_phone"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    guestsCount: integer("guests_count"),
    channel: reservationChannel("channel").notNull().default("manual"),
    externalUid: text("external_uid"),
    isHold: boolean("is_hold").notNull().default(false),
    isConcierge: boolean("is_concierge").notNull().default(false), // synthetic stay behind the property QR
    status: reservationStatus("status").notNull().default("upcoming"),
    chatToken: text("chat_token").unique(),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("reservations_property_external_uid_idx").on(
      t.propertyId,
      t.externalUid,
    ),
    index("reservations_org_idx").on(t.orgId),
    index("reservations_property_checkin_idx").on(t.propertyId, t.checkIn),
    index("reservations_checkout_idx").on(t.checkOut),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    reservationId: uuid("reservation_id")
      .notNull()
      .unique()
      .references(() => reservations.id, { onDelete: "cascade" }),
    hostUnreadCount: integer("host_unread_count").notNull().default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt,
  },
  (t) => [index("conversations_org_last_msg_idx").on(t.orgId, t.lastMessageAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    escalated: boolean("escalated").notNull().default(false),
    escalationReason: text("escalation_reason"),
    model: text("model"),
    createdAt,
  },
  (t) => [index("messages_conversation_created_idx").on(t.conversationId, t.createdAt)],
);

export const escalations = pgTable(
  "escalations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    source: escalationSource("source").notNull(),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    taskId: uuid("task_id").references(() => tasks.id),
    reason: text("reason").notNull(),
    summary: text("summary").notNull(),
    urgency: text("urgency").notNull().default("normal"),
    status: escalationStatus("status").notNull().default("open"),
    createdAt,
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => profiles.id),
  },
  (t) => [index("escalations_org_status_idx").on(t.orgId, t.status, t.createdAt)],
);

export const cleaners = pgTable(
  "cleaners",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt,
  },
  (t) => [index("cleaners_org_idx").on(t.orgId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id),
    reservationId: uuid("reservation_id")
      .unique()
      .references(() => reservations.id),
    cleanerId: uuid("cleaner_id").references(() => cleaners.id),
    status: taskStatus("status").notNull().default("pending"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    token: text("token").notNull().unique(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt,
  },
  (t) => [index("tasks_org_status_due_idx").on(t.orgId, t.status, t.dueAt)],
);

export const scheduledMessages = pgTable(
  "scheduled_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    type: messageType("type").notNull(),
    sendAt: timestamp("send_at", { withTimezone: true }).notNull(),
    status: messageStatus("status").notNull().default("pending"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    resendId: text("resend_id"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt,
  },
  (t) => [
    uniqueIndex("scheduled_messages_reservation_type_idx").on(
      t.reservationId,
      t.type,
    ),
    index("scheduled_messages_status_sendat_idx").on(t.status, t.sendAt),
  ],
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    type: text("type").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    updatedAt,
  },
  (t) => [uniqueIndex("email_templates_org_type_idx").on(t.orgId, t.type)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    actorType: eventActor("actor_type").notNull(),
    actorId: text("actor_id"),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id"),
    action: text("action").notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt,
  },
  (t) => [
    index("events_org_created_idx").on(t.orgId, t.createdAt),
    index("events_entity_idx").on(t.entity, t.entityId),
  ],
);
