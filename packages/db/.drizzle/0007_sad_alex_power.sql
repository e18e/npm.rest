ALTER TYPE "core"."change_state" ADD VALUE 'skipped' BEFORE 'completed';--> statement-breakpoint
ALTER TABLE "core"."change" ADD COLUMN "deleted" boolean DEFAULT false NOT NULL;