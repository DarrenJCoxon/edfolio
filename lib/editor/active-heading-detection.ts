/**
 * Utilities for detecting which heading is currently active/visible in the viewport
 */

import { HeadingItem } from '@/types';

/**
 * Detects which heading is currently active based on scroll position
 * Uses position-based calculation to determine the closest heading to viewport top
 *
 * @param headings - Array of heading items from the document
 * @param scrollTop - Current scroll position of the container
 * @returns ID of the active heading, or null if no heading is active
 */
export function detectActiveHeading(
  headings: HeadingItem[],
  scrollTop: number
): string | null {
  if (headings.length === 0) return null;

  // Find the heading closest to the top of the viewport
  // We use a 100px offset for better UX (heading is considered active slightly before reaching top)
  let activeHeading: HeadingItem | null = null;

  for (const heading of headings) {
    // Calculate if this heading is at or above the scroll position
    // We compare heading position directly since it's from the document structure
    if (heading.position <= scrollTop + 100) {
      activeHeading = heading;
    } else {
      // We've passed the active heading
      break;
    }
  }

  // Special case: If user scrolled past all headings (near bottom of document),
  // highlight the last heading
  if (!activeHeading && headings.length > 0) {
    const lastHeading = headings[headings.length - 1];
    // Estimate if we're near the bottom
    if (scrollTop > lastHeading.position) {
      activeHeading = lastHeading;
    }
  }

  return activeHeading?.id || null;
}

/**
 * Scrolls the editor container to a specific heading position
 *
 * @param headingPosition - Document position of the heading
 * @param scrollContainer - The scrollable container element
 * @param offset - Offset from top in pixels (default: 80px for proper top alignment)
 */
export function scrollToHeadingPosition(
  headingPosition: number,
  scrollContainer: Element,
  offset: number = 80
): void {
  // Scroll to the heading position with smooth behavior
  // The offset ensures the heading appears at the top of the viewport with comfortable spacing
  scrollContainer.scrollTo({
    top: headingPosition - offset,
    behavior: 'smooth'
  });
}
