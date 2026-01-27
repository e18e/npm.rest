ALTER TABLE "packument" ADD COLUMN "revId" text;--> statement-breakpoint
CREATE INDEX "packument_data_gin_idx" ON "packument" USING gin ("data");