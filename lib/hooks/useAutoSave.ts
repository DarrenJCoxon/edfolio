'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveOptions {
  noteId: string | null;
  initialContent: unknown;
  delay?: number; // Default 500ms per CLAUDE.md
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export interface AutoSaveReturn {
  saveStatus: SaveStatus;
  save: (content: unknown) => void;
  forceSave: () => void;
  error: Error | null;
}

export function useAutoSave({
  noteId,
  initialContent,
  delay = 500,
  onSaveSuccess,
  onSaveError,
}: AutoSaveOptions): AutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const contentRef = useRef(initialContent);
  const isMountedRef = useRef(true);

  // Actual save function that calls the API
  const performSave = useCallback(async () => {
    if (!noteId) return;

    setSaveStatus('saving');
    setError(null);

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentRef.current }),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      if (isMountedRef.current) {
        setSaveStatus('saved');
        onSaveSuccess?.();

        // Reset to idle after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 2000);
      }
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error('Unknown error');
      if (isMountedRef.current) {
        setSaveStatus('error');
        setError(saveError);
        onSaveError?.(saveError);
      }
    }
  }, [noteId, onSaveSuccess, onSaveError]);

  // Debounced save function
  const debouncedSave = useRef(
    debounce(() => {
      performSave();
    }, delay)
  ).current;

  // Save function that updates content and triggers debounced save
  const save = useCallback(
    (content: unknown) => {
      contentRef.current = content;
      debouncedSave();
    },
    [debouncedSave]
  );

  // Force immediate save (for Cmd+S)
  const forceSave = useCallback(() => {
    debouncedSave.cancel();
    performSave();
  }, [debouncedSave, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return { saveStatus, save, forceSave, error };
}
