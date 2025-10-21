-- CreateTable
CREATE TABLE "PublishedPage" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customSlug" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewed" TIMESTAMP(3),

    CONSTRAINT "PublishedPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPage_noteId_key" ON "PublishedPage"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPage_slug_key" ON "PublishedPage"("slug");

-- CreateIndex
CREATE INDEX "PublishedPage_slug_idx" ON "PublishedPage"("slug");

-- CreateIndex
CREATE INDEX "PublishedPage_noteId_idx" ON "PublishedPage"("noteId");

-- CreateIndex
CREATE INDEX "PublishedPage_publishedAt_idx" ON "PublishedPage"("publishedAt");

-- AddForeignKey
ALTER TABLE "PublishedPage" ADD CONSTRAINT "PublishedPage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
