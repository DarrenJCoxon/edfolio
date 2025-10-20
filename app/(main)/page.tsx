'use client';

import { EditorView } from '@/components/editor/EditorView';
import { useFoliosStore } from '@/lib/stores/folios-store';

export default function MainPage() {
  const { notes, activeNoteId } = useFoliosStore();

  // Find the active note from the store
  const activeNote = notes.find(note => note.id === activeNoteId);

  return <EditorView note={activeNote} />;
}