import { useEffect, useRef } from 'react';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { getCsrfToken } from '@/lib/csrf';

/**
 * Hook that persists the active note ID to the database whenever it changes.
 * This ensures the user's last active note is remembered across sessions.
 */
export function usePersistedActiveNote() {
  const { activeNoteId } = useFoliosStore();
  const previousNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if note hasn't changed
    if (previousNoteIdRef.current === activeNoteId) {
      return;
    }

    // Skip initial mount (null -> null)
    if (previousNoteIdRef.current === null && activeNoteId === null) {
      previousNoteIdRef.current = activeNoteId;
      return;
    }

    // Update the previous ref
    previousNoteIdRef.current = activeNoteId;

    // Persist to database
    const persistActiveNote = async () => {
      try {
        const csrfToken = await getCsrfToken();
        const response = await fetch('/api/user/last-active-note', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ noteId: activeNoteId }),
        });

        if (!response.ok) {
          console.error('Failed to persist active note');
        }
      } catch (error) {
        console.error('Error persisting active note:', error);
      }
    };

    persistActiveNote();
  }, [activeNoteId]);
}
