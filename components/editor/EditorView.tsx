'use client';

import { useEffect, useState, useCallback } from 'react';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { SaveIndicator } from '@/components/editor/SaveIndicator';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function EditorView({ className }: { className?: string }) {
  const { activeNoteId, updateNote } = useFoliosStore();
  const [noteContent, setNoteContent] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch note content when activeNoteId changes
  useEffect(() => {
    if (!activeNoteId) {
      setNoteContent(null);
      return;
    }

    const fetchNote = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/notes/${activeNoteId}`);

        if (!response.ok) {
          throw new Error('Failed to load note');
        }

        const { data } = await response.json();
        setNoteContent(data.content || { type: 'doc', content: [] });
      } catch (err) {
        console.error('Error fetching note:', err);
        setError(err instanceof Error ? err.message : 'Failed to load note');
        setNoteContent({ type: 'doc', content: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [activeNoteId]);

  // Auto-save hook
  const { saveStatus, save, forceSave, error: saveError } = useAutoSave({
    noteId: activeNoteId,
    initialContent: noteContent,
    delay: 500,
    onSaveSuccess: () => {
      // Update note's updatedAt in store
      if (activeNoteId) {
        updateNote(activeNoteId, { updatedAt: new Date() });
      }
    },
  });

  // Handle content changes from editor
  const handleContentChange = useCallback(
    (content: unknown) => {
      setNoteContent(content);
      save(content);
    },
    [save]
  );

  // Keyboard shortcut for force save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        forceSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [forceSave]);

  // Empty state when no note selected
  if (!activeNoteId) {
    return (
      <div
        className={cn(
          'flex-1 h-screen',
          'bg-[var(--background)]',
          'flex items-center justify-center',
          className
        )}
      >
        <div className="text-center space-y-[var(--spacing-sm)]">
          <p className="text-lg text-[var(--muted)]">
            Select a note to begin writing
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex-1 h-screen',
          'bg-[var(--background)]',
          'flex items-center justify-center',
          className
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'flex-1 h-screen',
          'bg-[var(--background)]',
          'flex items-center justify-center',
          className
        )}
      >
        <div className="text-center space-y-[var(--spacing-sm)]">
          <p className="text-lg text-[var(--destructive)]">
            Error: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-[var(--accent)] hover:underline"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  // Editor view
  return (
    <div
      className={cn(
        'flex-1 h-screen flex flex-col',
        'bg-[var(--background)]',
        className
      )}
    >
      {/* Save indicator */}
      <div className="flex justify-end p-[var(--spacing-md)] border-b border-[var(--border)]">
        <SaveIndicator status={saveStatus} error={saveError} />
      </div>

      {/* Editor */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-[var(--spacing-xl)]">
          <TipTapEditor
            content={noteContent}
            onChange={handleContentChange}
            placeholder="Start writing..."
          />
        </div>
      </ScrollArea>
    </div>
  );
}
