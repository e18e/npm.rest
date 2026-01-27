ALTER TABLE "change" RENAME COLUMN "revId" TO "rev_id";--> statement-breakpoint
ALTER TABLE "change" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "change" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "packument" RENAME COLUMN "revId" TO "rev_id";--> statement-breakpoint
ALTER TABLE "change" DROP CONSTRAINT "change_name_revId_pk";--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_name_rev_id_pk" PRIMARY KEY("name","rev_id");