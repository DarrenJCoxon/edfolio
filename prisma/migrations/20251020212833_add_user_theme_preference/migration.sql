-- AlterTable
ALTER TABLE "Folio" RENAME CONSTRAINT "Vault_pkey" TO "Folio_pkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "themePreference" TEXT DEFAULT 'system';

-- RenameForeignKey
ALTER TABLE "Folio" RENAME CONSTRAINT "Vault_ownerId_fkey" TO "Folio_ownerId_fkey";

-- RenameIndex
ALTER INDEX "Vault_ownerId_idx" RENAME TO "Folio_ownerId_idx";
