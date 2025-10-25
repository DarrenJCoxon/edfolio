'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Edit, Trash2, FilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FolderContextMenuProps {
  children: React.ReactNode;
  onNewNote: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function FolderContextMenu({
  children,
  onNewNote,
  onRename,
  onDelete,
}: FolderContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className={cn(
          'w-48',
          'bg-card border-border'
        )}
      >
        <ContextMenuItem
          onClick={onNewNote}
          className="flex items-center gap-2 cursor-pointer"
        >
          <FilePlus className="h-4 w-4" />
          <span>New Note</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onRename}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Edit className="h-4 w-4" />
          <span>Rename</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onDelete}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            'text-destructive focus:text-destructive',
            'focus:bg-destructive/10'
          )}
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}