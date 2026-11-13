ALTER TABLE "properties" ADD COLUMN "placement" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "share_links" ADD COLUMN "expires_at" timestamp with time zone;