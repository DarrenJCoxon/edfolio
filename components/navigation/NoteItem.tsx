'use client';

import { Note } from '@/types';
import { FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { FileMenu } from './FileMenu';

export interface NoteItemProps {
  note: Note;
  depth: number;
  isActive: boolean;
  onClick: (id: string) => void;
  onRename?: (id: string, newName: string) => Promise<void>;
  onDelete?: (id: string) => void;
  onMove?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  isEditingExternally?: boolean;
  onStartEdit?: () => void;
}

export function NoteItem({
  note,
  depth,
  isActive,
  onClick,
  onRename,
  onDelete,
  onMove,
  onDuplicate,
  isEditingExternally = false,
  onStartEdit,
}: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.title);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle external edit trigger
  useEffect(() => {
    if (isEditingExternally && !isEditing) {
      handleEditStart();
    }
  }, [isEditingExternally]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit value when note changes
  useEffect(() => {
    setEditValue(note.title);
  }, [note.title]);

  const handleEditStart = () => {
    setIsEditing(true);
    setEditValue(note.title);
    setError(null);
    if (onStartEdit) {
      onStartEdit();
    }
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    // Validate input
    if (trimmedValue.length === 0) {
      setError('Name cannot be empty');
      return;
    }

    // If name hasn't changed, just cancel
    if (trimmedValue === note.title) {
      setIsEditing(false);
      return;
    }

    if (!onRename) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onRename(note.id, trimmedValue);
      setIsEditing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(note.title);
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Don't save on blur if there's an error - let user fix it
    if (!error && !isLoading) {
      handleSave();
    }
  };

  const handleClick = () => {
    if (!isEditing) {
      onClick(note.id);
    }
  };

  const indentStyle = {
    paddingLeft: `calc(var(--spacing-sm) + ${depth} * var(--spacing-md))`,
  };

  if (isEditing) {
    return (
      <div
        role="treeitem"
        aria-label={`Editing ${note.title}`}
        aria-selected={isActive}
        className={cn(
          'flex items-center gap-[var(--spacing-xs)] py-[var(--spacing-xs)]',
          'rounded-[var(--radius-sm)]'
        )}
        style={indentStyle}
      >
        <div className="w-4" /> {/* Spacer for alignment with folders */}
        <FileText className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />

        <div className="flex-1 flex items-center gap-[var(--spacing-xs)]">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={isLoading}
            className={cn(
              'inline-editor-input text-sm',
              error && 'error'
            )}
            aria-label="Edit note name"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
          )}
        </div>

        {error && (
          <span className="text-xs text-[var(--destructive)] ml-[var(--spacing-xs)]">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      role="treeitem"
      aria-label={note.title}
      aria-selected={isActive}
      className={cn(
        'group', // Add group class for hover effects
        'flex items-center gap-[var(--spacing-xs)] py-[var(--spacing-xs)]',
        'cursor-pointer rounded-[var(--radius-sm)]',
        'hover:bg-[var(--muted)]/10 active:bg-[var(--muted)]/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'min-h-[44px] md:min-h-0', // Touch target minimum on mobile
        isActive && 'bg-[var(--accent)]/10 text-[var(--accent)]'
      )}
      style={indentStyle}
      onClick={handleClick}
      tabIndex={0}
    >
      <div className="w-4" /> {/* Spacer for alignment with folders */}

      <FileText className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />

      <span className="flex-1 break-words text-sm">{note.title}</span>

      {/* File Menu */}
      {(onMove || onDuplicate || onDelete) && (
        <FileMenu
          noteId={note.id}
          noteTitle={note.title}
          folderId={note.folderId}
          onMove={onMove || (() => {})}
          onDuplicate={onDuplicate || (() => {})}
          onDelete={onDelete || (() => {})}
        />
      )}
    </div>
  );
}
