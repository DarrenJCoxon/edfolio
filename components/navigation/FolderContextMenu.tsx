'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Edit, Trash2, FilePlus, FolderPlus } from 'lucide-react';

export interface FolderContextMenuProps {
  children: React.ReactNode;
  onNewNote: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function FolderContextMenu({
  children,
  onNewNote,
  onNewFolder,
  onRename,
  onDelete,
}: FolderContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onNewNote}>
          <FilePlus className="mr-2 h-4 w-4" />
          <span>New Note</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={onNewFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          <span>New Folder</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onRename}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDelete}
          className="text-[var(--destructive)] focus:text-[var(--destructive)]"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}