'use client';

import { EditorView } from '@/components/editor/EditorView';

/**
 * Main page container for the editor.
 *
 * EditorView handles all its own data fetching by activeNoteId from the store.
 * This includes both owned notes and shared notes (which won't be in the notes array
 * when user is viewing the __shared__ folio).
 *
 * This API-first architecture matches Google Docs pattern where documents are
 * fetched directly by ID with permission checking on the backend.
 */
export default function MainPage() {
  return <EditorView />;
}