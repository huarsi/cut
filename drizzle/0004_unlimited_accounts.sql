CREATE TABLE "support_ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'unlimited' NOT NULL,
	"message" text,
	"locale" text DEFAULT 'es' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "unlimited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_ticket_status_created_at_idx" ON "support_ticket" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "support_ticket_user_id_idx" ON "support_ticket" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "link_user_id_created_at_idx" ON "link" USING btree ("user_id","created_at");