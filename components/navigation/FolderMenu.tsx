'use client';

import { MoreVertical, FilePlus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface FolderMenuProps {
  folderId: string;
  folderName: string;
  hasChildren: boolean;
  onNewNote: (folderId: string) => void;
  onRename: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  className?: string;
}

export function FolderMenu({
  folderId,
  folderName,
  hasChildren,
  onNewNote,
  onRename,
  onDelete,
  className,
}: FolderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNewNote = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent folder expand/collapse
    setIsOpen(false);
    onNewNote(folderId);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onRename(folderId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDelete(folderId);
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
            'hover:bg-muted/20',
            'focus-visible:opacity-100',
            'min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0', // Touch target on mobile
            className
          )}
          style={{
            // Always show on mobile (touch devices)
            opacity: 'var(--menu-mobile-opacity, 0)',
          }}
          onClick={(e) => e.stopPropagation()} // Prevent folder expand/collapse
          aria-label={`Folder menu for ${folderName}`}
          aria-expanded={isOpen}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          'w-48',
          'bg-card border-border',
          'shadow-lg'
        )}
      >
        <DropdownMenuItem
          onClick={handleNewNote}
          className="flex items-center gap-2 cursor-pointer"
        >
          <FilePlus className="h-4 w-4" />
          <span>New Note</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleRename}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Edit className="h-4 w-4" />
          <span>Rename</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleDelete}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            'text-destructive focus:text-destructive',
            'focus:bg-destructive/10'
          )}
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
