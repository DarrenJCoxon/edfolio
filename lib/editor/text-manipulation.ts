import { Editor } from '@tiptap/react';

/**
 * Replace text at a specific range in the TipTap editor
 *
 * This function handles text replacement while preserving cursor position
 * and maintaining the document structure. It works across different node types
 * (paragraphs, headings, etc.) and handles formatted text appropriately.
 *
 * @param editor - TipTap editor instance
 * @param from - Start position of text to replace
 * @param to - End position of text to replace
 * @param newText - New text to insert
 *
 * @example
 * ```typescript
 * const editor = useEditor(...);
 * replaceTextAtRange(editor, 10, 25, 'new text here');
 * ```
 */
export function replaceTextAtRange(
  editor: Editor,
  from: number,
  to: number,
  newText: string
): void {
  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContentAt(from, newText)
    .run();
}

/**
 * Get the current selection range from TipTap editor
 *
 * Returns the start and end positions of the current text selection.
 * Returns null if there is no selection (cursor is at a single position).
 *
 * @param editor - TipTap editor instance
 * @returns Object with from and to positions, or null if no selection
 *
 * @example
 * ```typescript
 * const range = getSelectionRange(editor);
 * if (range) {
 *   console.log(`Selected from ${range.from} to ${range.to}`);
 * }
 * ```
 */
export function getSelectionRange(
  editor: Editor
): { from: number; to: number } | null {
  const { from, to } = editor.state.selection;

  if (from === to) {
    return null; // No selection
  }

  return { from, to };
}

/**
 * Get selected text from TipTap editor
 *
 * Extracts the text content between the current selection range.
 * Returns empty string if nothing is selected.
 *
 * @param editor - TipTap editor instance
 * @returns Selected text or empty string
 *
 * @example
 * ```typescript
 * const selectedText = getSelectedText(editor);
 * console.log(`You selected: ${selectedText}`);
 * ```
 */
export function getSelectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to);
}

/**
 * Count the number of words in a text string
 *
 * This function splits text by whitespace and filters out empty strings
 * to provide an accurate word count. Handles edge cases like multiple
 * spaces, line breaks, and punctuation.
 *
 * @param text - Text to count words in
 * @returns Number of words
 *
 * @example
 * ```typescript
 * const count = countWords('Hello world');
 * console.log(count); // 2
 *
 * const count2 = countWords('  Multiple   spaces  ');
 * console.log(count2); // 2
 * ```
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Split by whitespace and filter out empty strings
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}
