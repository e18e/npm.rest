CREATE TABLE "core"."license" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	CONSTRAINT "license_resource_id" CHECK ("core"."license"."id" LIKE 'lcs_%')
);
--> statement-breakpoint
CREATE TABLE "core"."version_license" (
	"version_id" varchar(40) NOT NULL,
	"license_id" varchar(40) NOT NULL,
	CONSTRAINT "version_license_version_id_license_id_pk" PRIMARY KEY("version_id","license_id")
);
--> statement-breakpoint
ALTER TABLE "core"."version_license" ADD CONSTRAINT "version_license_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "core"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."version_license" ADD CONSTRAINT "version_license_license_id_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "core"."license"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "license_type_idx" ON "core"."license" USING btree ("type");--> statement-breakpoint
ALTER TABLE "core"."version" DROP COLUMN "license";