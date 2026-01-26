DROP INDEX "change_name_state_idx";--> statement-breakpoint
ALTER TABLE "change" ADD PRIMARY KEY ("name");--> statement-breakpoint
ALTER TABLE "change" ADD PRIMARY KEY ("revId");--> statement-breakpoint
CREATE INDEX "change_state_idx" ON "change" USING btree ("state");--> statement-breakpoint
ALTER TABLE "change" DROP COLUMN "id";