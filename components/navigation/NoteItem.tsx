'use client';

import { Note } from '@/types';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NoteItemProps {
  note: Note;
  depth: number;
  isActive: boolean;
  onClick: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

export function NoteItem({
  note,
  depth,
  isActive,
  onClick,
}: NoteItemProps) {
  const handleClick = () => {
    onClick(note.id);
  };

  const indentStyle = {
    paddingLeft: `calc(var(--spacing-sm) + ${depth} * var(--spacing-md))`,
  };

  return (
    <div
      role="treeitem"
      aria-label={note.title}
      aria-selected={isActive}
      className={cn(
        'flex items-center gap-[var(--spacing-xs)] py-[var(--spacing-xs)]',
        'cursor-pointer rounded-[var(--radius-sm)]',
        'hover:bg-[var(--muted)]/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        isActive && 'bg-[var(--accent)]/10 text-[var(--accent)]'
      )}
      style={indentStyle}
      onClick={handleClick}
      tabIndex={0}
    >
      <div className="w-4" /> {/* Spacer for alignment with folders */}

      <FileText className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />

      <span className="flex-1 truncate text-sm">{note.title}</span>
    </div>
  );
}
