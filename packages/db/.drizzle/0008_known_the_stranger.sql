CREATE TYPE "core"."funding_type" AS ENUM('patreon', 'github', 'open-collective', 'paypal', 'ko-fi', 'cashapp', 'buy-me-a-coffee', 'liberapay', 'thanks.dev', 'unknown');--> statement-breakpoint
CREATE TABLE "core"."funding" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"type" "core"."funding_type" NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "funding_resource_id" CHECK ("core"."funding"."id" LIKE 'fnd_%')
);
--> statement-breakpoint
CREATE TABLE "core"."version_funding" (
	"version_id" varchar(40) NOT NULL,
	"funding_id" varchar(40) NOT NULL,
	CONSTRAINT "version_funding_version_id_funding_id_pk" PRIMARY KEY("version_id","funding_id")
);
--> statement-breakpoint
ALTER TABLE "core"."version_funding" ADD CONSTRAINT "version_funding_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "core"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."version_funding" ADD CONSTRAINT "version_funding_funding_id_funding_id_fk" FOREIGN KEY ("funding_id") REFERENCES "core"."funding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "funding_type_url_unique_idx" ON "core"."funding" USING btree ("type","url");