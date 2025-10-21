import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

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
 * Length of the short unique identifier appended to slugs
 */
const SHORT_ID_LENGTH = 8;

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
 * Generates a short, unique identifier for a published page.
 *
 * Uses nanoid to create an 8-character URL-safe identifier.
 * This is appended to the title slug to create globally unique URLs
 * in the format: /public/[title-slug]-[short-id]
 *
 * @returns An 8-character alphanumeric identifier
 *
 * @example
 * generateShortId() // "a1b2c3d4"
 * generateShortId() // "x9y8z7w6"
 */
export function generateShortId(): string {
  return nanoid(SHORT_ID_LENGTH);
}

/**
 * Generates a unique slug for a note with Notion-style format: [title-slug]-[short-id]
 *
 * Process:
 * 1. Check if base slug is reserved (throw error if true)
 * 2. Check if note is already published (re-use existing shortId)
 * 3. If new publication, generate new shortId
 * 4. Verify shortId is unique (retry if collision detected)
 * 5. Return object with full slug and shortId
 *
 * @param baseSlug - The title-based slug (e.g., "my-first-note")
 * @param noteId - The ID of the note being published
 * @returns Object containing the full slug and shortId
 * @throws Error if slug is reserved or max attempts exceeded
 *
 * @example
 * // First note titled "Guide"
 * await generateUniqueSlug("guide", "note-1")
 * // { slug: "guide-a1b2c3d4", shortId: "a1b2c3d4" }
 *
 * // Second note titled "Guide"
 * await generateUniqueSlug("guide", "note-2")
 * // { slug: "guide-x9y8z7w6", shortId: "x9y8z7w6" }
 *
 * // Re-publishing first note (preserves shortId)
 * await generateUniqueSlug("guide", "note-1")
 * // { slug: "guide-a1b2c3d4", shortId: "a1b2c3d4" }
 *
 * // Reserved slug
 * await generateUniqueSlug("api", "note-3") // throws Error
 */
export async function generateUniqueSlug(
  baseSlug: string,
  noteId: string
): Promise<{ slug: string; shortId: string }> {
  // Check if base slug is reserved
  if (isReservedSlug(baseSlug)) {
    throw new Error(
      `The slug "${baseSlug}" is reserved and cannot be used for published pages.`
    );
  }

  // Check if this note already has a published page (handle re-publishing)
  const existingPage = await prisma.publishedPage.findUnique({
    where: { noteId },
    select: { shortId: true },
  });

  // If re-publishing, reuse the existing shortId
  if (existingPage) {
    const fullSlug = `${baseSlug}-${existingPage.shortId}`;
    return {
      slug: fullSlug,
      shortId: existingPage.shortId,
    };
  }

  // New publication - generate unique shortId
  let attempt = 0;
  while (attempt < MAX_UNIQUENESS_ATTEMPTS) {
    const shortId = generateShortId();

    // Check if this shortId already exists (collision check)
    const collision = await prisma.publishedPage.findUnique({
      where: { shortId },
      select: { id: true },
    });

    // No collision - use this shortId
    if (!collision) {
      const fullSlug = `${baseSlug}-${shortId}`;
      return {
        slug: fullSlug,
        shortId,
      };
    }

    // Collision detected (extremely rare with nanoid) - retry
    attempt++;
  }

  // Max attempts exceeded (should never happen with nanoid)
  throw new Error(
    `Unable to generate unique identifier after ${MAX_UNIQUENESS_ATTEMPTS} attempts. Please try again.`
  );
}
