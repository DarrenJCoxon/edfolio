/*
  Warnings:

  - You are about to drop the `Vault` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Vault" DROP CONSTRAINT "Vault_ownerId_fkey";

-- DropTable
DROP TABLE "public"."Vault";

-- CreateTable
CREATE TABLE "Folio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Folio_ownerId_idx" ON "Folio"("ownerId");

-- AddForeignKey
ALTER TABLE "Folio" ADD CONSTRAINT "Folio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
