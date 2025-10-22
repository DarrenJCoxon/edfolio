-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('read', 'edit');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('active', 'revoked');

-- CreateTable
CREATE TABLE "PageShare" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "permission" "SharePermission" NOT NULL DEFAULT 'read',
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "ShareStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageCollaborator" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shareId" TEXT,
    "role" TEXT NOT NULL,
    "lastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageShare_accessToken_key" ON "PageShare"("accessToken");

-- CreateIndex
CREATE INDEX "PageShare_pageId_idx" ON "PageShare"("pageId");

-- CreateIndex
CREATE INDEX "PageShare_accessToken_idx" ON "PageShare"("accessToken");

-- CreateIndex
CREATE INDEX "PageShare_invitedEmail_idx" ON "PageShare"("invitedEmail");

-- CreateIndex
CREATE INDEX "PageShare_status_idx" ON "PageShare"("status");

-- CreateIndex
CREATE INDEX "PageShare_expiresAt_idx" ON "PageShare"("expiresAt");

-- CreateIndex
CREATE INDEX "PageCollaborator_pageId_idx" ON "PageCollaborator"("pageId");

-- CreateIndex
CREATE INDEX "PageCollaborator_userId_idx" ON "PageCollaborator"("userId");

-- CreateIndex
CREATE INDEX "PageCollaborator_shareId_idx" ON "PageCollaborator"("shareId");

-- CreateIndex
CREATE UNIQUE INDEX "PageCollaborator_pageId_userId_key" ON "PageCollaborator"("pageId", "userId");

-- AddForeignKey
ALTER TABLE "PageShare" ADD CONSTRAINT "PageShare_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "PublishedPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageShare" ADD CONSTRAINT "PageShare_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageCollaborator" ADD CONSTRAINT "PageCollaborator_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "PublishedPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageCollaborator" ADD CONSTRAINT "PageCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageCollaborator" ADD CONSTRAINT "PageCollaborator_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "PageShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;
