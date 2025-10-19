'use client';

import { Folder } from '@/types';
import { ChevronDown, ChevronRight, Folder as FolderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FolderItemProps {
  folder: Folder;
  depth: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
}

export function FolderItem({
  folder,
  depth,
  isExpanded,
  onToggleExpand,
  onClick,
}: FolderItemProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(folder.id);
    }
    onToggleExpand(folder.id);
  };

  const indentStyle = {
    paddingLeft: `calc(var(--spacing-sm) + ${depth} * var(--spacing-md))`,
  };

  return (
    <div
      role="treeitem"
      aria-expanded={isExpanded}
      aria-selected={false}
      aria-label={folder.name}
      className={cn(
        'flex items-center gap-[var(--spacing-xs)] py-[var(--spacing-xs)]',
        'cursor-pointer rounded-[var(--radius-sm)]',
        'hover:bg-[var(--muted)]/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]'
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

      <span className="flex-1 truncate text-sm">{folder.name}</span>
    </div>
  );
}
