/**
 * Utilities for extracting headings from TipTap editor content
 */

import { Editor } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { HeadingItem } from '@/types';

/**
 * Extracts all H1, H2, and H3 headings from the TipTap editor document
 * @param editor - TipTap editor instance
 * @returns Array of heading items in document order
 */
export function extractHeadings(editor: Editor): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const doc = editor.state.doc;

  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level;

      // Only extract H1, H2, H3 (as per requirements)
      if (level >= 1 && level <= 3) {
        const text = node.textContent || 'Untitled';
        const id = generateHeadingId(text, pos);

        headings.push({
          id,
          level: level as 1 | 2 | 3,
          text,
          position: pos,
        });
      }
    }
    return true; // Continue traversal
  });

  return headings;
}

/**
 * Generates a unique ID for a heading based on text content and position
 * @param text - Heading text content
 * @param position - Document position of the heading
 * @returns Unique heading ID
 */
export function generateHeadingId(text: string, position: number): string {
  // Create URL-safe slug from text
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Collapse multiple hyphens
    .trim();

  // Append position to ensure uniqueness (handles duplicate heading text)
  return `heading-${slug}-${position}`;
}

/**
 * Compares two heading arrays to determine if they're different
 * Used to prevent unnecessary re-renders
 * @param headings1 - First heading array
 * @param headings2 - Second heading array
 * @returns True if headings are different
 */
export function headingsHaveChanged(
  headings1: HeadingItem[],
  headings2: HeadingItem[]
): boolean {
  if (headings1.length !== headings2.length) {
    return true;
  }

  for (let i = 0; i < headings1.length; i++) {
    if (
      headings1[i].id !== headings2[i].id ||
      headings1[i].level !== headings2[i].level ||
      headings1[i].text !== headings2[i].text ||
      headings1[i].position !== headings2[i].position
    ) {
      return true;
    }
  }

  return false;
}
