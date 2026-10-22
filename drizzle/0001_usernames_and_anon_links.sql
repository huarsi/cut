ALTER TABLE "link" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN "anon_id" text;--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
CREATE INDEX "link_anon_id_idx" ON "link" USING btree ("anon_id");--> statement-breakpoint
CREATE INDEX "link_ip_hash_created_at_idx" ON "link" USING btree ("ip_hash","created_at");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");