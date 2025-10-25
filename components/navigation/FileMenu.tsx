'use client';

import { MoreVertical, FolderInput, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface FileMenuProps {
  noteId: string;
  noteTitle: string;
  folderId: string | null;
  onMove: (noteId: string) => void;
  onDuplicate: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  className?: string;
}

export function FileMenu({
  noteId,
  noteTitle,
  folderId,
  onMove,
  onDuplicate,
  onDelete,
  className,
}: FileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent note selection
    setIsOpen(false);
    onMove(noteId);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDuplicate(noteId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDelete(noteId);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0',
            'opacity-0 group-hover:opacity-100', // Show on hover (desktop)
            'hover:bg-[var(--muted)]/20',
            'focus-visible:opacity-100',
            'min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0', // Touch target on mobile
            className
          )}
          style={{
            // Always show on mobile (touch devices)
            opacity: 'var(--menu-mobile-opacity, 0)',
          }}
          onClick={(e) => e.stopPropagation()} // Prevent note selection
          aria-label={`File menu for ${noteTitle}`}
          aria-expanded={isOpen}
        >
          <MoreVertical className="h-4 w-4 text-[var(--muted-foreground)]" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          'w-48',
          'bg-[var(--card)] border-[var(--border)]',
          'shadow-lg'
        )}
      >
        <DropdownMenuItem
          onClick={handleMove}
          className="flex items-center gap-2 cursor-pointer"
        >
          <FolderInput className="h-4 w-4" />
          <span>Move to folder</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleDuplicate}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Copy className="h-4 w-4" />
          <span>Duplicate</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleDelete}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            'text-[var(--destructive)] focus:text-[var(--destructive)]',
            'focus:bg-[var(--destructive-bg)]'
          )}
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
