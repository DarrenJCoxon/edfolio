import { prisma } from '@/lib/prisma';

/**
 * List of reserved slugs that cannot be used for public pages.
 * These conflict with application routes and system pages.
 */
const RESERVED_SLUGS = [
  'api',
  'auth',
  'admin',
  'public',
  'login',
  'signup',
  'settings',
  'account',
];

/**
 * Maximum length for a slug (characters)
 */
const MAX_SLUG_LENGTH = 100;

/**
 * Maximum attempts to find a unique slug before throwing an error
 */
const MAX_UNIQUENESS_ATTEMPTS = 100;

/**
 * Generates a URL-friendly slug from a page title.
 *
 * Transformation rules:
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove all non-alphanumeric characters except hyphens
 * - Collapse consecutive hyphens into one
 * - Trim hyphens from start and end
 * - Limit to MAX_SLUG_LENGTH characters
 * - Default to 'untitled' if empty after processing
 *
 * @param title - The page title to convert into a slug
 * @returns A clean, SEO-friendly slug
 *
 * @example
 * generateSlugFromTitle("My First Blog Post") // "my-first-blog-post"
 * generateSlugFromTitle("Hello, World!!!") // "hello-world"
 * generateSlugFromTitle("   Spaces   Everywhere   ") // "spaces-everywhere"
 * generateSlugFromTitle("2024 Summer Vacation!") // "2024-summer-vacation"
 * generateSlugFromTitle("🚀 Rocket Launch 🚀") // "rocket-launch"
 */
export function generateSlugFromTitle(title: string): string {
  let slug = title
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Collapse multiple consecutive hyphens into one
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit to maximum length
    .substring(0, MAX_SLUG_LENGTH);

  // Default to 'untitled' if empty after processing
  if (slug.length === 0) {
    slug = 'untitled';
  }

  return slug;
}

/**
 * Checks if a slug is reserved and cannot be used for public pages.
 *
 * Reserved slugs conflict with application routes and would break
 * the system if used for published pages.
 *
 * @param slug - The slug to check
 * @returns true if the slug is reserved, false otherwise
 *
 * @example
 * isReservedSlug("api") // true
 * isReservedSlug("auth") // true
 * isReservedSlug("my-post") // false
 * isReservedSlug("API") // true (case-insensitive)
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * Generates a unique slug for a note, handling conflicts automatically.
 *
 * Process:
 * 1. Check if base slug is reserved (throw error if true)
 * 2. Query database for existing PublishedPage with this slug
 * 3. If no conflict, return base slug
 * 4. If conflict with same noteId, return base slug (re-publishing same note)
 * 5. If conflict with different noteId, append -2, -3, etc. until unique
 * 6. Maximum MAX_UNIQUENESS_ATTEMPTS attempts (throw error if exceeded)
 *
 * @param baseSlug - The initial slug generated from the title
 * @param noteId - The ID of the note being published
 * @returns A unique slug that doesn't conflict with existing published pages
 * @throws Error if slug is reserved or max attempts exceeded
 *
 * @example
 * // First note titled "Guide"
 * await generateUniqueSlug("guide", "note-1") // "guide"
 *
 * // Second note titled "Guide"
 * await generateUniqueSlug("guide", "note-2") // "guide-2"
 *
 * // Re-publishing first note
 * await generateUniqueSlug("guide", "note-1") // "guide" (same as before)
 *
 * // Reserved slug
 * await generateUniqueSlug("api", "note-3") // throws Error
 */
export async function generateUniqueSlug(
  baseSlug: string,
  noteId: string
): Promise<string> {
  // Check if base slug is reserved
  if (isReservedSlug(baseSlug)) {
    throw new Error(
      `The slug "${baseSlug}" is reserved and cannot be used for published pages.`
    );
  }

  // Check if base slug is available
  const existingPage = await prisma.publishedPage.findUnique({
    where: { slug: baseSlug },
    select: { noteId: true },
  });

  // If no conflict, base slug is available
  if (!existingPage) {
    return baseSlug;
  }

  // If existing page belongs to the same note, return base slug
  // (This handles re-publishing the same note)
  if (existingPage.noteId === noteId) {
    return baseSlug;
  }

  // Slug conflict with different note - find unique variant
  let attempt = 2;
  while (attempt <= MAX_UNIQUENESS_ATTEMPTS) {
    const candidateSlug = `${baseSlug}-${attempt}`;

    const conflictingPage = await prisma.publishedPage.findUnique({
      where: { slug: candidateSlug },
      select: { noteId: true },
    });

    if (!conflictingPage) {
      return candidateSlug;
    }

    // If this variant belongs to the same note, use it
    if (conflictingPage.noteId === noteId) {
      return candidateSlug;
    }

    attempt++;
  }

  // Max attempts exceeded
  throw new Error(
    `Unable to generate unique slug for "${baseSlug}" after ${MAX_UNIQUENESS_ATTEMPTS} attempts. Please choose a different title.`
  );
}
