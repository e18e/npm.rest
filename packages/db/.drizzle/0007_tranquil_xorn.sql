CREATE TYPE "core"."repository_type" AS ENUM('git', 'mercurial', 'unknown');--> statement-breakpoint
CREATE TABLE "core"."version_repository" (
	"version_id" varchar(40) NOT NULL,
	"repository_id" varchar(41) NOT NULL,
	"directory" text,
	"branch" text,
	CONSTRAINT "version_repository_version_id_repository_id_pk" PRIMARY KEY("version_id","repository_id")
);
--> statement-breakpoint
ALTER TABLE "core"."version" DROP CONSTRAINT "version_repo_repository_id_fk";
--> statement-breakpoint
ALTER TABLE "core"."repository" ADD COLUMN "type" "core"."repository_type";--> statement-breakpoint
UPDATE "core"."repository" SET "type" = 'git' WHERE "type" IS NULL;--> statement-breakpoint
ALTER TABLE "core"."repository" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."version_repository" ADD CONSTRAINT "version_repository_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "core"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."version_repository" ADD CONSTRAINT "version_repository_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "core"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."version" DROP COLUMN "repo";--> statement-breakpoint
ALTER TABLE "core"."version" DROP COLUMN "repo_directory";--> statement-breakpoint
ALTER TABLE "core"."version" DROP COLUMN "repo_branch";
