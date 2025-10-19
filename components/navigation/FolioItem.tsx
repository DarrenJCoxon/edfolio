'use client';

import { Folio } from '@/types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FolioItemProps {
  folio: Folio;
  isActive: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onClick: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

export function FolioItem({
  folio,
  isActive,
  isExpanded,
  onToggleExpand,
  onClick,
}: FolioItemProps) {
  const handleClick = () => {
    onClick(folio.id);
    onToggleExpand(folio.id);
  };

  return (
    <div
      role="treeitem"
      aria-expanded={isExpanded}
      aria-selected={isActive}
      aria-label={folio.name}
      className={cn(
        'flex items-center gap-[var(--spacing-xs)] px-[var(--spacing-sm)] py-[var(--spacing-xs)]',
        'cursor-pointer rounded-[var(--radius-sm)]',
        'hover:bg-[var(--muted)]/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        isActive && 'bg-[var(--accent)]/10 text-[var(--accent)]'
      )}
      onClick={handleClick}
      tabIndex={0}
    >
      <button
        aria-label={isExpanded ? 'Collapse folio' : 'Expand folio'}
        className="shrink-0 p-0 hover:bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand(folio.id);
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
        )}
      </button>

      <span className="flex-1 truncate text-sm font-medium">{folio.name}</span>
    </div>
  );
}
