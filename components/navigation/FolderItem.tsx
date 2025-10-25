'use client';

import { Folder } from '@/types';
import { ChevronDown, ChevronRight, Folder as FolderIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';

export interface FolderItemProps {
  folder: Folder;
  depth: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onRename?: (id: string, newName: string) => Promise<void>;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
  isEditingExternally?: boolean;
  onStartEdit?: () => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function FolderItem({
  folder,
  depth,
  isExpanded,
  onToggleExpand,
  onClick,
  onRename,
  isEditingExternally = false,
  onStartEdit,
  isSelected = false,
  onSelect,
}: FolderItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(folder.name);
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

  // Reset edit value when folder changes
  useEffect(() => {
    setEditValue(folder.name);
  }, [folder.name]);

  const handleEditStart = () => {
    setIsEditing(true);
    setEditValue(folder.name);
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
    if (trimmedValue === folder.name) {
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
      await onRename(folder.id, trimmedValue);
      setIsEditing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(folder.name);
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
      if (onClick) {
        onClick(folder.id);
      }
      if (onSelect) {
        onSelect(folder.id);
      }
      onToggleExpand(folder.id);
    }
  };

  const indentStyle = {
    paddingLeft: `calc(var(--spacing-sm) + ${depth} * var(--spacing-md))`,
  };

  if (isEditing) {
    return (
      <div
        role="treeitem"
        aria-label={`Editing ${folder.name}`}
        aria-selected={false}
        className={cn(
          'flex items-center gap-[var(--spacing-xs)] py-[var(--spacing-xs)]',
          'rounded-[var(--radius-sm)]'
        )}
        style={indentStyle}
      >
        <button
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          className="shrink-0 p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
          )}
        </button>

        <FolderIcon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />

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
            aria-label="Edit folder name"
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
      aria-expanded={isExpanded}
      aria-selected={isSelected}
      aria-label={folder.name}
      className={cn(
        'flex items-center gap-[var(--spacing-xs)] py-[var(--spacing-xs)]',
        'cursor-pointer rounded-[var(--radius-sm)]',
        'hover:bg-[var(--muted)]/10 active:bg-[var(--muted)]/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'min-h-[44px] md:min-h-0', // Touch target minimum on mobile
        isSelected && 'bg-[var(--muted)]/20'
      )}
      style={indentStyle}
      onClick={handleClick}
      tabIndex={0}
    >
      <button
        aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
        className="shrink-0 p-0 hover:bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand(folder.id);
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
        )}
      </button>

      <FolderIcon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />

      <span className="flex-1 break-words text-sm">{folder.name}</span>
    </div>
  );
}
