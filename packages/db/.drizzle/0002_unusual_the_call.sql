ALTER TYPE "public"."queue_state" RENAME TO "change_state";--> statement-breakpoint
ALTER TYPE "public"."change_state" ADD VALUE 'completed';--> statement-breakpoint
ALTER TABLE "queue" RENAME TO "change";--> statement-breakpoint
ALTER TABLE "change" RENAME COLUMN "key" TO "name";--> statement-breakpoint
DROP INDEX "queue_key_state_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "change_name_state_idx" ON "change" USING btree ("name","state");--> statement-breakpoint
ALTER TABLE "change" DROP COLUMN "attempts";