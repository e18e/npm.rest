ALTER TABLE "core"."change" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."change" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "core"."change" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."change" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "core"."package" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."package" ALTER COLUMN "npm_updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."package" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."package" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "core"."repository" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."repository" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."repository" ALTER COLUMN "last_fetched" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."repository" ALTER COLUMN "last_fetched" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "core"."version" ALTER COLUMN "published_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."version" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."version" ALTER COLUMN "updated_at" SET DEFAULT now();