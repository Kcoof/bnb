ALTER TABLE "properties" ADD COLUMN "type" text DEFAULT 'apartment' NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "concierge_token" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "is_concierge" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_concierge_token_unique" UNIQUE("concierge_token");