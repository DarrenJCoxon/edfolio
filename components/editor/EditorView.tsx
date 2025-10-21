'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TipTapEditor } from './TipTapEditor';
import { SaveIndicator } from './SaveIndicator';
import { InlineFileNameEditor } from './InlineFileNameEditor';
import { HighlightMenu } from './HighlightMenu';
import { RephrasePreview } from './RephrasePreview';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { EditorViewProps, RephraseResponse } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { toast } from 'sonner';
import { calculateMenuPosition } from '@/lib/editor/menu-positioning';

export function EditorView({ className, note }: EditorViewProps) {
  const [noteContent, setNoteContent] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingOption, setProcessingOption] = useState<string | null>(null);
  const [showRephrasePreview, setShowRephrasePreview] = useState(false);
  const [rephrasedText, setRephrasedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const editorInstanceRef = useRef<unknown | null>(null);
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
    onSaveError: () => {
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

  // Handle text selection changes
  const handleSelectionChange = useCallback((text: string, hasSelection: boolean) => {
    if (hasSelection && text.trim().length > 0) {
      setSelectedText(text);
      // Calculate menu position based on selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const position = calculateMenuPosition(
          {
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          },
          { width: 280, height: 60 } // Menu dimensions
        );

        setMenuPosition(position);
        setShowHighlightMenu(true);
      }
    } else {
      setShowHighlightMenu(false);
      setSelectedText('');
    }
  }, []);

  // Handle editor ready callback
  const handleEditorReady = useCallback((editor: unknown) => {
    editorInstanceRef.current = editor;
  }, []);

  // Handle menu option clicks
  const handleOptionClick = useCallback(
    async (option: 'rephrase' | 'summarize' | 'fix-grammar') => {
      if (option !== 'rephrase') {
        // Other options not implemented yet (Stories 2.4, 2.5)
        return;
      }

      if (!selectedText || !activeNoteId || !note?.folioId) {
        toast.error('Unable to rephrase. Please try selecting text again.');
        return;
      }

      setIsProcessing(true);
      setProcessingOption(option);
      setOriginalText(selectedText);

      try {
        const response = await fetch('/api/ai/rephrase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: selectedText,
            vaultId: note.folioId,
            noteId: activeNoteId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();

          // Handle specific error cases
          if (response.status === 401) {
            throw new Error('Please log in to use AI features');
          } else if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new Error(
              `Too many requests. Please wait ${retryAfter || '60'} seconds.`
            );
          } else if (response.status === 500 || response.status === 503) {
            throw new Error('AI service is temporarily unavailable. Please try again later.');
          } else {
            throw new Error(error.error || 'Failed to rephrase text');
          }
        }

        const data: RephraseResponse = await response.json();
        setRephrasedText(data.data.rephrasedText);
        setShowRephrasePreview(true);
      } catch (error) {
        console.error('Rephrase error:', error);

        let errorMessage = 'Failed to rephrase text. Please try again.';

        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Connection failed. Please check your internet connection.';
          } else {
            errorMessage = error.message;
          }
        }

        toast.error(errorMessage);
      } finally {
        setIsProcessing(false);
        setProcessingOption(null);
      }
    },
    [selectedText, activeNoteId, note?.folioId]
  );

  // Handle accept rephrase
  const handleAcceptRephrase = useCallback(async () => {
    // Type assertion for editor instance
    const editor = editorInstanceRef.current as {
      state: { selection: { from: number; to: number } };
      chain: () => {
        focus: () => {
          deleteRange: (range: { from: number; to: number }) => {
            insertContentAt: (pos: number, content: string) => {
              run: () => void;
            };
          };
        };
      };
    } | null;

    if (!editor) {
      toast.error('Editor not ready. Please try again.');
      return;
    }

    setIsApplying(true);

    try {
      // Get current selection range
      const { from, to } = editor.state.selection;

      // Replace text in editor using TipTap chain API
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, rephrasedText)
        .run();

      // Auto-save will trigger via editor onChange
      setShowRephrasePreview(false);
      setShowHighlightMenu(false);
      toast.success('Text rephrased successfully');
    } catch (error) {
      console.error('Apply rephrase error:', error);
      toast.error('Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  }, [rephrasedText]);

  // Handle reject rephrase
  const handleRejectRephrase = useCallback(() => {
    setShowRephrasePreview(false);
    setRephrasedText('');
    setOriginalText('');
    // Keep highlight menu open so user can try again
  }, []);

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

  // Handle click outside menu to dismiss
  useEffect(() => {
    if (!showHighlightMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const menuElement = document.querySelector('.highlight-menu');
      if (menuElement && !menuElement.contains(event.target as Node)) {
        setShowHighlightMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHighlightMenu]);

  // Hide menu when note changes
  useEffect(() => {
    setShowHighlightMenu(false);
  }, [activeNoteId]);

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
            onSelectionChange={handleSelectionChange}
            onEditorReady={handleEditorReady}
            editable={true}
            placeholder="Start typing..."
          />
        </div>
      </ScrollArea>

      {/* Highlight Menu */}
      <HighlightMenu
        isVisible={showHighlightMenu}
        position={menuPosition}
        onOptionClick={handleOptionClick}
        isProcessing={isProcessing}
        processingOption={processingOption}
      />

      {/* Rephrase Preview Dialog */}
      <RephrasePreview
        isOpen={showRephrasePreview}
        originalText={originalText}
        rephrasedText={rephrasedText}
        onAccept={handleAcceptRephrase}
        onReject={handleRejectRephrase}
        isApplying={isApplying}
      />
    </div>
  );
}
