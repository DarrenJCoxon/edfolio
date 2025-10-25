'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface NoteData {
  id: string;
  title: string;
  folioId: string;
}

export interface NoteMeta {
  isOwner: boolean;
  collaboratorRole: string | null;
  canEdit: boolean;
  ownerName?: string;
}

export interface UseNoteLoadingOptions {
  activeNoteId: string | null;
  getCachedNoteContent: (noteId: string) => unknown | null;
  cacheNoteContent: (noteId: string, content: unknown) => void;
  updateNote: (noteId: string, updates: { title: string }) => void;
}

export interface UseNoteLoadingReturn {
  noteContent: unknown | null;
  noteData: NoteData | null;
  noteMeta: NoteMeta | null;
  isLoading: boolean;
  error: string | null;
  handleTitleChange: (newTitle: string) => Promise<void>;
  handleReload: () => void;
}

export function useNoteLoading({
  activeNoteId,
  getCachedNoteContent,
  cacheNoteContent,
  updateNote,
}: UseNoteLoadingOptions): UseNoteLoadingReturn {
  const [noteContent, setNoteContent] = useState<unknown | null>(null);
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteMeta, setNoteMeta] = useState<NoteMeta | null>(null);

  // Fetch note content when activeNoteId changes, with cache-first strategy
  useEffect(() => {
    if (!activeNoteId) {
      setNoteContent(null);
      setError(null);
      return;
    }

    // Check cache first for instant loading
    const cachedContent = getCachedNoteContent(activeNoteId);
    if (cachedContent !== null) {
      // Use cached content - instant load, no API call, no loading state
      setNoteContent(cachedContent);
      setIsLoading(false);
      setError(null);
      // Note: We still need to fetch metadata even with cached content
      // So we don't return early here for metadata
    }

    // Fetch from API (for metadata or if not cached)
    const fetchNote = async () => {
      if (cachedContent === null) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(`/api/notes/${activeNoteId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load note');
        }

        const { data, meta } = await response.json();

        // Cache the content for instant future access
        cacheNoteContent(activeNoteId, data.content);
        setNoteContent(data.content);

        // Store note data (id, title, folioId) for use in AI features and title display
        setNoteData({
          id: data.id,
          title: data.title,
          folioId: data.folioId,
        });

        // Store metadata about collaboration status
        if (meta) {
          setNoteMeta({
            ...meta,
            ownerName: data.folio?.owner?.name || undefined,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load note';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [activeNoteId, getCachedNoteContent, cacheNoteContent]);

  // Handle title change from InlineTitleField
  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      if (!activeNoteId) return;

      try {
        const response = await fetch(`/api/notes/${activeNoteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: newTitle }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update title');
        }

        // Update local state
        updateNote(activeNoteId, { title: newTitle });
        // Also update noteData state for immediate UI update
        setNoteData(prev => prev ? { ...prev, title: newTitle } : null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update title';
        toast.error(errorMessage);
      }
    },
    [activeNoteId, updateNote]
  );

  // Handle reload button click
  const handleReload = useCallback(() => {
    if (activeNoteId) {
      window.location.reload();
    }
  }, [activeNoteId]);

  return {
    noteContent,
    noteData,
    noteMeta,
    isLoading,
    error,
    handleTitleChange,
    handleReload,
  };
}
