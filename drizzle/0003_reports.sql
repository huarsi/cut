CREATE TABLE "blocked_domain" (
	"domain" text PRIMARY KEY NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"link_id" text,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"reporter_email" text,
	"ip_hash" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_link_id_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."link"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_status_created_at_idx" ON "report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "report_link_id_idx" ON "report" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "report_ip_hash_created_at_idx" ON "report" USING btree ("ip_hash","created_at");