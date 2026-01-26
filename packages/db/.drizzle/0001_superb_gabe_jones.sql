CREATE TYPE "public"."queue_state" AS ENUM('pending', 'processing', 'failed');--> statement-breakpoint
CREATE TABLE "queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"state" "queue_state" NOT NULL,
	"revId" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "queue_key_state_idx" ON "queue" USING btree ("key","state");