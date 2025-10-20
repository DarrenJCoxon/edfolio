'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveOptions {
  noteId: string;
  initialContent: unknown;
  delay?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export interface AutoSaveReturn {
  saveStatus: SaveStatus;
  save: (content: unknown) => void;
  forceSave: () => Promise<void>;
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
  const contentRef = useRef<unknown>(initialContent);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Perform the actual save operation
  const performSave = useCallback(
    async (noteIdToSave: string, content: unknown) => {
      // Don't attempt to save if no noteId
      if (!noteIdToSave) {
        return;
      }

      try {
        setSaveStatus('saving');
        setError(null);

        const response = await fetch(`/api/notes/${noteIdToSave}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save note');
        }

        setSaveStatus('saved');
        onSaveSuccess?.();

        // Reset to idle after 2 seconds
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (err) {
        const saveError = err instanceof Error ? err : new Error('Unknown error');
        setError(saveError);
        setSaveStatus('error');
        onSaveError?.(saveError);
      }
    },
    [onSaveSuccess, onSaveError]
  );

  // Create a stable debounced save function using useRef
  const debouncedSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Save function that triggers debounced save
  const save = useCallback(
    (content: unknown) => {
      // Don't attempt to save if no noteId
      if (!noteId) {
        return;
      }

      // Store the content
      contentRef.current = content;

      // Cancel any existing timeout
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }

      // Set a new timeout
      debouncedSaveRef.current = setTimeout(() => {
        performSave(noteId, content);
      }, delay);
    },
    [noteId, performSave, delay]
  );

  // Force save function for manual save (Cmd+S)
  const forceSave = useCallback(async () => {
    // Don't attempt to save if no noteId
    if (!noteId) {
      return;
    }
    // Cancel any pending debounced saves
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
      debouncedSaveRef.current = null;
    }
    // Perform the save immediately
    await performSave(noteId, contentRef.current);
  }, [noteId, performSave]);

  // Cleanup on unmount or when noteId changes
  useEffect(() => {
    return () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    save,
    forceSave,
    error,
  };
}