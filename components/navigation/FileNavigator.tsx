'use client';

import { useFoliosStore } from '@/lib/stores/folios-store';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';
import { useDialogManagement } from '@/lib/hooks/useDialogManagement';
import { useFolioCrud } from '@/lib/hooks/useFolioCrud';
import { useSidebarResize } from '@/lib/hooks/useSidebarResize';
import { useFolioData } from '@/lib/hooks/useFolioData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileNavigatorProps, Folder, Note } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, FolderPlus } from 'lucide-react';
import { FolioSwitcher } from './FolioSwitcher';
import { CreateItemDialog } from './CreateItemDialog';
import { RenameDialog } from './RenameDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { FolioTree } from './FolioTree';

export function FileNavigator({ className }: FileNavigatorProps) {
  const {
    folios,
    folders,
    notes,
    activeFolioId,
    activeNoteId,
    expandedFolderIds,
    sidebarCollapsed,
    setActiveNote,
    toggleFolderExpanded,
    toggleSidebar,
  } = useFoliosStore();

  const { isLoading } = useFolioData();

  const {
    createDialog,
    renameDialog,
    deleteDialog,
    openCreateDialog,
    closeCreateDialog,
    openRenameDialog,
    closeRenameDialog,
    openDeleteDialog,
    closeDeleteDialog,
  } = useDialogManagement();

  const { createFolder, createNote, renameItem, deleteItem } = useFolioCrud();
  const { sidebarWidth, isResizing, handleMouseDown } = useSidebarResize();

  // Keyboard navigation
  useKeyboardNavigation({
    onRenameItem: (id, type) => {
      const item =
        type === 'folio'
          ? folios.find((f) => f.id === id)
          : type === 'folder'
          ? folders.find((f) => f.id === id)
          : notes.find((n) => n.id === id);

      if (item) {
        openRenameDialog(
          type,
          id,
          type === 'note' ? (item as Note).title : (item as Folder).name
        );
      }
    },
    onDeleteItem: (id, type) => {
      const item =
        type === 'folio'
          ? folios.find((f) => f.id === id)
          : type === 'folder'
          ? folders.find((f) => f.id === id)
          : notes.find((n) => n.id === id);

      if (item) {
        openDeleteDialog(
          type,
          id,
          type === 'note' ? (item as Note).title : (item as Folder).name
        );
      }
    },
    onOpenNote: setActiveNote,
  });

  // Handler functions
  const handleCreateFolder = async (name: string) => {
    if (!activeFolioId) return;
    await createFolder(name, activeFolioId, createDialog.parentId);
  };

  const handleCreateNote = async (title: string) => {
    if (!activeFolioId) return;
    await createNote(title, activeFolioId, createDialog.parentId);
  };

  const handleRename = async (newName: string) => {
    if (!renameDialog) return;
    await renameItem(renameDialog.type, renameDialog.id, newName);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    await deleteItem(deleteDialog.type, deleteDialog.id);
  };

  const activeFolio = folios.find((f) => f.id === activeFolioId);
  const hasNoFiles = folders.length === 0 && notes.length === 0;

  if (sidebarCollapsed) {
    return (
      <div
        className={cn(
          'flex flex-col h-screen',
          'w-[var(--action-rail-width)] bg-[var(--card)]',
          'border-r border-[var(--border)]',
          className
        )}
      >
        <div className="flex items-center justify-center p-[var(--spacing-md)]">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-col h-screen bg-[var(--card)]',
          'border-r border-[var(--border)]',
          'transition-all duration-200',
          className
        )}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="flex items-center justify-between p-[var(--spacing-md)] border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {activeFolio?.name || 'Files'}
          </h2>
          <div className="flex gap-[var(--spacing-xs)]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openCreateDialog('folder')}
              aria-label="New folder"
              className="h-8 w-8"
              title="New folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openCreateDialog('note')}
              aria-label="New note"
              className="h-8 w-8"
              title="New note"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-[var(--spacing-sm)]" role="tree">
            {isLoading ? (
              <p className="text-sm text-[var(--muted-foreground)] p-[var(--spacing-md)]">
                Loading...
              </p>
            ) : hasNoFiles ? (
              <p className="text-sm text-[var(--muted-foreground)] p-[var(--spacing-md)]">
                No files yet. Create a note or folder to get started.
              </p>
            ) : (
              <FolioTree
                folders={folders}
                notes={notes}
                activeFolioId={activeFolioId}
                activeNoteId={activeNoteId}
                expandedFolderIds={expandedFolderIds}
                onToggleFolderExpand={toggleFolderExpanded}
                onSelectNote={setActiveNote}
                onRename={(type, id, name) => openRenameDialog(type, id, name)}
                onDelete={(type, id, name) => openDeleteDialog(type, id, name)}
                onCreateNote={(parentId) => openCreateDialog('note', parentId)}
                onCreateFolder={(parentId) => openCreateDialog('folder', parentId)}
              />
            )}
          </div>
        </ScrollArea>

        <FolioSwitcher />

        <div
          className={cn(
            'absolute top-0 right-0 w-1 h-full cursor-col-resize',
            'hover:bg-[var(--accent)] transition-colors',
            isResizing && 'bg-[var(--accent)]'
          )}
          onMouseDown={handleMouseDown}
        />
      </div>

      <CreateItemDialog
        type={createDialog.type}
        isOpen={createDialog.isOpen}
        onClose={closeCreateDialog}
        onCreate={
          createDialog.type === 'folder' ? handleCreateFolder : handleCreateNote
        }
      />

      {renameDialog && (
        <RenameDialog
          type={renameDialog.type}
          currentName={renameDialog.name}
          isOpen={renameDialog.isOpen}
          onClose={closeRenameDialog}
          onRename={handleRename}
        />
      )}

      {deleteDialog && (
        <DeleteConfirmDialog
          type={deleteDialog.type}
          itemName={deleteDialog.name}
          isOpen={deleteDialog.isOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
