ALTER TABLE "report" ADD COLUMN "locale" text DEFAULT 'es' NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "reply" text;