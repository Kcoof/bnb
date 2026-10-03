CREATE TABLE "appliance_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"default_instructions" text NOT NULL,
	"default_troubleshooting" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "appliance_templates_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "custom_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"to_phone" text NOT NULL,
	"body" text NOT NULL,
	"channel" text DEFAULT 'sms' NOT NULL,
	"provider" text DEFAULT 'twilio' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"provider_ref" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_appliances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"template_type" text NOT NULL,
	"label" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"troubleshooting" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" text DEFAULT 'starter' NOT NULL,
	"status" text DEFAULT 'trialing' NOT NULL,
	"current_period_end" timestamp with time zone,
	"property_limit" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "host_phone" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "maps_url" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "amenities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_faqs" ADD CONSTRAINT "custom_faqs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_faqs" ADD CONSTRAINT "custom_faqs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_appliances" ADD CONSTRAINT "property_appliances_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_appliances" ADD CONSTRAINT "property_appliances_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_faqs_property_idx" ON "custom_faqs" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "notifications_org_idx" ON "notifications" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "property_appliances_property_type_idx" ON "property_appliances" USING btree ("property_id","template_type");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("org_id");