DROP INDEX "change_name_state_idx";--> statement-breakpoint
ALTER TABLE "change" DROP CONSTRAINT "queue_pkey";--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_name_revId_pk" PRIMARY KEY("name","revId");--> statement-breakpoint
CREATE INDEX "change_state_idx" ON "change" USING btree ("state");--> statement-breakpoint
ALTER TABLE "change" DROP COLUMN "id";
