'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder as FolderType } from '@/types';
import { Folder, ChevronDown, ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface MoveFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
  currentFolderId: string | null;
  folders: FolderType[];
  activeFolioId: string;
  onConfirm: (noteId: string, targetFolderId: string | null) => Promise<void>;
}

interface FolderTreeItemProps {
  folder: FolderType | null; // null = root
  depth: number;
  isSelected: boolean;
  isCurrent: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  children?: React.ReactNode;
}

function FolderTreeItem({
  folder,
  depth,
  isSelected,
  isCurrent,
  isExpanded,
  onToggleExpand,
  onSelect,
  children,
}: FolderTreeItemProps) {
  const indentStyle = {
    paddingLeft: `calc(var(--spacing-md) + ${depth} * var(--spacing-lg))`,
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3',
          'cursor-pointer rounded-[var(--radius-sm)]',
          'hover:bg-[var(--muted)]/10',
          'min-h-[44px]', // Touch target
          isSelected && 'bg-[var(--accent)]/10 text-[var(--accent)]',
          isCurrent && 'opacity-50 cursor-not-allowed'
        )}
        style={indentStyle}
        onClick={isCurrent ? undefined : onSelect}
        role="treeitem"
        aria-selected={isSelected}
        aria-disabled={isCurrent}
      >
        {folder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="w-4 h-4 shrink-0"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}

        {!folder && <Home className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />}
        {folder && <Folder className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />}

        <span className="flex-1 text-sm">
          {folder ? folder.name : 'Root (No folder)'}
        </span>

        {isCurrent && (
          <span className="text-xs text-[var(--muted)]">(current)</span>
        )}
      </div>

      {isExpanded && children}
    </>
  );
}

export function MoveFolderDialog({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  currentFolderId,
  folders,
  activeFolioId,
  onConfirm,
}: MoveFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter folders for current folio only
  const folioFolders = folders.filter((f) => f.folioId === activeFolioId);

  // Build folder hierarchy
  const buildFolderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const childFolders = folioFolders.filter((f) => f.parentId === parentId);

    return childFolders.map((folder) => {
      const isExpanded = expandedFolderIds.has(folder.id);
      const isSelected = selectedFolderId === folder.id;
      const isCurrent = currentFolderId === folder.id;

      return (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          depth={depth}
          isSelected={isSelected}
          isCurrent={isCurrent}
          isExpanded={isExpanded}
          onToggleExpand={() => {
            setExpandedFolderIds((prev) => {
              const next = new Set(prev);
              if (next.has(folder.id)) {
                next.delete(folder.id);
              } else {
                next.add(folder.id);
              }
              return next;
            });
          }}
          onSelect={() => setSelectedFolderId(folder.id)}
        >
          {buildFolderTree(folder.id, depth + 1)}
        </FolderTreeItem>
      );
    });
  };

  const handleConfirm = async () => {
    // Prevent moving to current location
    if (selectedFolderId === currentFolderId) {
      setError('Note is already in this location');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onConfirm(noteId, selectedFolderId);
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move note';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[500px]',
          'bg-[var(--card)] border-[var(--border)]'
        )}
      >
        <DialogHeader>
          <DialogTitle>Move note</DialogTitle>
          <DialogDescription>
            Choose a new location for &quot;{noteTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-1" role="tree">
            {/* Root option */}
            <FolderTreeItem
              folder={null}
              depth={0}
              isSelected={selectedFolderId === null}
              isCurrent={currentFolderId === null}
              isExpanded={false}
              onToggleExpand={() => {}}
              onSelect={() => setSelectedFolderId(null)}
            />

            {/* Folder tree */}
            {buildFolderTree(null, 0)}
          </div>
        </ScrollArea>

        {error && (
          <div className="text-sm text-[var(--destructive)] px-1">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedFolderId === currentFolderId}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
