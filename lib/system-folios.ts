/**
 * System Folios Utility
 * Creates and manages system folios like "Shared with Me"
 * System folios are special folios that cannot be deleted or renamed by users
 */

import { prisma } from '@/lib/prisma';

/**
 * Constant for the "Shared with Me" system folio name
 * This name must never be changed as it's used throughout the app
 */
export const SHARED_WITH_ME_FOLIO_NAME = 'Shared with Me';

/**
 * Creates all required system folios for a user
 * Currently creates: "Shared with Me" folio
 *
 * @param userId - The ID of the user to create system folios for
 * @throws Error if folio creation fails
 */
export async function createSystemFoliosForUser(userId: string): Promise<void> {
  try {
    // Check if "Shared with Me" folio already exists
    const existingSharedFolio = await prisma.folio.findFirst({
      where: {
        ownerId: userId,
        name: SHARED_WITH_ME_FOLIO_NAME,
        isSystem: true,
      },
    });

    // Only create if it doesn't exist
    if (!existingSharedFolio) {
      await prisma.folio.create({
        data: {
          name: SHARED_WITH_ME_FOLIO_NAME,
          isSystem: true,
          ownerId: userId,
        },
      });
      console.log(`Created "${SHARED_WITH_ME_FOLIO_NAME}" system folio for user: ${userId}`);
    } else {
      console.log(`"${SHARED_WITH_ME_FOLIO_NAME}" system folio already exists for user: ${userId}`);
    }
  } catch (error) {
    console.error(`Failed to create system folios for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Gets the "Shared with Me" system folio for a user
 * Returns null if the folio doesn't exist
 *
 * @param userId - The ID of the user
 * @returns The Shared with Me folio or null
 */
export async function getSharedWithMeFolio(userId: string) {
  try {
    return await prisma.folio.findFirst({
      where: {
        ownerId: userId,
        name: SHARED_WITH_ME_FOLIO_NAME,
        isSystem: true,
      },
    });
  } catch (error) {
    console.error(`Failed to get Shared with Me folio for user ${userId}:`, error);
    return null;
  }
}

/**
 * Checks if a folio is a system folio
 *
 * @param folioId - The ID of the folio to check
 * @returns true if the folio is a system folio, false otherwise
 */
export async function isSystemFolio(folioId: string): Promise<boolean> {
  try {
    const folio = await prisma.folio.findUnique({
      where: { id: folioId },
      select: { isSystem: true },
    });
    return folio?.isSystem ?? false;
  } catch (error) {
    console.error(`Failed to check if folio ${folioId} is a system folio:`, error);
    return false;
  }
}
