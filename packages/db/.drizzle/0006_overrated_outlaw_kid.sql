CREATE SCHEMA "core";
--> statement-breakpoint
CREATE SCHEMA "internal";
--> statement-breakpoint
CREATE TYPE "core"."dependency_type" AS ENUM('prod', 'dev', 'peer');--> statement-breakpoint
CREATE TYPE "core"."module_type" AS ENUM('cjs', 'esm', 'dual', 'faux', 'dts', 'unknown');--> statement-breakpoint
CREATE TYPE "core"."specifier_type" AS ENUM('git', 'tag', 'version', 'range', 'file', 'directory', 'remote');--> statement-breakpoint
CREATE TYPE "core"."types_state" AS ENUM('definitely-typed', 'built-in', 'none');--> statement-breakpoint
ALTER TYPE "public"."change_state" SET SCHEMA "core";--> statement-breakpoint
CREATE TABLE "core"."dependency" (
	"version_id" varchar(40) NOT NULL,
	"specifier_id" varchar(40) NOT NULL,
	"type" "core"."dependency_type" NOT NULL,
	"optional" boolean NOT NULL,
	"alias" text,
	CONSTRAINT "dependency_version_id_specifier_id_type_pk" PRIMARY KEY("version_id","specifier_id","type")
);
--> statement-breakpoint
CREATE TABLE "core"."package" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rev_id" text NOT NULL,
	"dist_tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"npm_updated_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "package_resource_id" CHECK ("core"."package"."id" LIKE 'pkg_%')
);
--> statement-breakpoint
CREATE TABLE "core"."publint" (
	"id" varchar(41) PRIMARY KEY NOT NULL,
	"version_id" varchar(40) NOT NULL,
	"publint_version" text NOT NULL,
	"messages" jsonb NOT NULL,
	CONSTRAINT "publint_resource_id" CHECK ("core"."publint"."id" LIKE 'publ_%'),
	CONSTRAINT "publint_version_resource_id" CHECK ("core"."publint"."version_id" LIKE 'pkv_%')
);
--> statement-breakpoint
CREATE TABLE "core"."repository" (
	"id" varchar(41) PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"stars" integer,
	"forks" integer,
	"archived" boolean,
	"languages" jsonb,
	"created_at" timestamp,
	"updated_at" timestamp,
	"last_fetched" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repository_resource_id" CHECK ("core"."repository"."id" LIKE 'repo_%')
);
--> statement-breakpoint
CREATE TABLE "core"."specifier" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"specifier" text NOT NULL,
	"type" "core"."specifier_type" NOT NULL,
	CONSTRAINT "specifier_resource_id" CHECK ("core"."specifier"."id" LIKE 'spc_%')
);
--> statement-breakpoint
CREATE TABLE "core"."version" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"package_id" varchar(40) NOT NULL,
	"version" text NOT NULL,
	"description" text,
	"homepage" text,
	"deprecated" text,
	"license" text,
	"unpacked_size" integer NOT NULL,
	"packed_size" integer NOT NULL,
	"types" "core"."types_state" NOT NULL,
	"module_type" "core"."module_type" NOT NULL,
	"keywords" text[],
	"repo" varchar(41),
	"repo_directory" text,
	"repo_branch" text,
	"published_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "version_resource_id" CHECK ("core"."version"."id" LIKE 'pkv_%'),
	CONSTRAINT "version_package_resource_id" CHECK ("core"."version"."package_id" LIKE 'pkg_%')
);
--> statement-breakpoint
ALTER TABLE "public"."change" SET SCHEMA "core";
--> statement-breakpoint
ALTER TABLE "public"."packument" SET SCHEMA "internal";
--> statement-breakpoint
ALTER TABLE "public"."state" SET SCHEMA "internal";
--> statement-breakpoint
ALTER TABLE "core"."dependency" ADD CONSTRAINT "dependency_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "core"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."dependency" ADD CONSTRAINT "dependency_specifier_id_specifier_id_fk" FOREIGN KEY ("specifier_id") REFERENCES "core"."specifier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."publint" ADD CONSTRAINT "publint_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "core"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."version" ADD CONSTRAINT "version_package_id_package_id_fk" FOREIGN KEY ("package_id") REFERENCES "core"."package"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."version" ADD CONSTRAINT "version_repo_repository_id_fk" FOREIGN KEY ("repo") REFERENCES "core"."repository"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dependency_specifier_idx" ON "core"."dependency" USING btree ("specifier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "package_name_unique_idx" ON "core"."package" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "publint_version_unique_idx" ON "core"."publint" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_url_unique_idx" ON "core"."repository" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "specifier_name_specifier_idx" ON "core"."specifier" USING btree ("name","specifier");--> statement-breakpoint
CREATE INDEX "specifier_name_idx" ON "core"."specifier" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "version_package_id_version_unique_idx" ON "core"."version" USING btree ("package_id","version");