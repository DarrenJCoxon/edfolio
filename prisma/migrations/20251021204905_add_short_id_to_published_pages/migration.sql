-- AlterTable
-- Add shortId column as nullable initially to handle existing data
ALTER TABLE "PublishedPage" ADD COLUMN "shortId" TEXT;

-- Generate shortId for existing published pages
-- Using a simple random 8-character alphanumeric string
-- Format: lowercase letters and numbers (similar to nanoid)
UPDATE "PublishedPage"
SET "shortId" = lower(substring(md5(random()::text || id) from 1 for 8))
WHERE "shortId" IS NULL;

-- Update existing slugs to append the shortId
-- This maintains backwards compatibility while adding uniqueness
UPDATE "PublishedPage"
SET "slug" = slug || '-' || "shortId"
WHERE "shortId" IS NOT NULL;

-- Make shortId NOT NULL now that all rows have values
ALTER TABLE "PublishedPage" ALTER COLUMN "shortId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPage_shortId_key" ON "PublishedPage"("shortId");

-- CreateIndex
CREATE INDEX "PublishedPage_shortId_idx" ON "PublishedPage"("shortId");
