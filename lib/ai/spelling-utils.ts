import { prisma } from '@/lib/prisma';
import type { SpellingPreference } from '@/types';

/**
 * Retrieves a user's spelling preference from the database.
 *
 * @param userId - The user's ID
 * @returns The user's spelling preference ('UK' | 'US')
 * @default 'UK' if user not found or preference not set
 */
export async function getUserSpellingPreference(
  userId: string
): Promise<SpellingPreference> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { spellingPreference: true },
    });

    // Return preference if found, otherwise default to 'UK'
    return (user?.spellingPreference as SpellingPreference) || 'UK';
  } catch (error) {
    console.error('Error fetching spelling preference:', error);
    // Return safe default on error
    return 'UK';
  }
}

/**
 * Returns a standardized prompt instruction for the given spelling preference.
 *
 * Use this instruction in AI system prompts to ensure consistent spelling across features.
 *
 * @param preference - The spelling preference ('UK' | 'US')
 * @returns A prompt instruction string for the AI
 */
export function getSpellingPromptInstruction(
  preference: SpellingPreference
): string {
  if (preference === 'US') {
    return 'Use American English spelling conventions (e.g., color, realize, analyze).';
  }
  return 'Use British English spelling conventions (e.g., colour, realise, analyse).';
}
