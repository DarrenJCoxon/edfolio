'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TipTapEditor } from './TipTapEditor';
import { SaveIndicator } from './SaveIndicator';
import { InlineFileNameEditor } from './InlineFileNameEditor';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { EditorViewProps } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { toast } from 'sonner';

export function EditorView({ className, note }: EditorViewProps) {
  const [noteContent, setNoteContent] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const activeNoteId = note?.id;
  const updateNote = useFoliosStore((state) => state.updateNote);

  // Fetch note content when activeNoteId changes
  useEffect(() => {
    if (!activeNoteId) {
      setNoteContent(null);
      setError(null);
      return;
    }

    const fetchNote = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/notes/${activeNoteId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load note');
        }

        const { data } = await response.json();
        setNoteContent(data.content);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load note';
        setError(errorMessage);
        console.error('Error fetching note:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [activeNoteId]);

  // Initialize auto-save hook only when there's an active note and content is loaded
  const { saveStatus, save, forceSave, error: saveError } = useAutoSave({
    noteId: activeNoteId || '',
    initialContent: noteContent || {},
    delay: 500,
    onSaveSuccess: () => {
      // Note saved successfully
    },
    onSaveError: (err) => {
      // Handle save error silently
    },
  });

  // Handle content changes from editor
  const handleContentChange = useCallback(
    (content: unknown) => {
      setNoteContent(content);
      // Always call save - it will handle the check internally
      save(content);
    },
    [save]
  );

  // Handle keyboard shortcut for manual save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        forceSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forceSave]);

  // Handle reload button click
  const handleReload = () => {
    if (activeNoteId) {
      window.location.reload();
    }
  };

  // Handle file name save
  const handleFileNameSave = async (newName: string) => {
    if (!activeNoteId || !note) return;

    try {
      const response = await fetch(`/api/notes/${activeNoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename file');
      }

      // Update local state
      updateNote(activeNoteId, { title: newName });
      setIsEditingFileName(false);
      toast.success('File renamed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
      toast.error(errorMessage);
      throw err; // Re-throw to let InlineFileNameEditor handle it
    }
  };

  const handleFileNameCancel = () => {
    setIsEditingFileName(false);
  };

  const handleFileNameEditStart = () => {
    setIsEditingFileName(true);
  };

  // Empty state - no note selected
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
        <div className="text-center">
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
        <div className="flex flex-col items-center gap-[var(--spacing-md)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted)]">Loading note...</p>
        </div>
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
        <div className="flex flex-col items-center gap-[var(--spacing-md)] max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-[var(--destructive)]" />
          <p className="text-lg font-semibold text-[var(--foreground)]">
            Failed to load note
          </p>
          <p className="text-sm text-[var(--muted)]">{error}</p>
          <Button
            onClick={handleReload}
            variant="outline"
            className="mt-[var(--spacing-sm)]"
          >
            Reload
          </Button>
        </div>
      </div>
    );
  }

  // Main editor view
  return (
    <div
      className={cn(
        'flex-1 h-screen flex flex-col',
        'bg-[var(--background)]',
        className
      )}
    >
      {/* Header with save indicator */}
      <div className="flex items-center justify-between p-[var(--spacing-md)] border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          <InlineFileNameEditor
            fileName={note?.title || 'Untitled'}
            isEditing={isEditingFileName}
            onSave={handleFileNameSave}
            onCancel={handleFileNameCancel}
            onEditStart={handleFileNameEditStart}
          />
        </h2>
        <SaveIndicator status={saveStatus} error={saveError} />
      </div>

      {/* Editor content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-[var(--spacing-xl)]">
          <TipTapEditor
            content={noteContent}
            onChange={handleContentChange}
            editable={true}
            placeholder="Start typing..."
          />
        </div>
      </ScrollArea>
    </div>
  );
}
