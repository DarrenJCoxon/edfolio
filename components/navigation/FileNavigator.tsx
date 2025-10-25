'use client';

import { useFoliosStore } from '@/lib/stores/folios-store';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';
import { useDialogManagement } from '@/lib/hooks/useDialogManagement';
import { useFolioCrud } from '@/lib/hooks/useFolioCrud';
import { useSidebarResize } from '@/lib/hooks/useSidebarResize';
import { useFolioData } from '@/lib/hooks/useFolioData';
import { usePersistedActiveNote } from '@/lib/hooks/usePersistedActiveNote';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { useSwipeGesture } from '@/lib/hooks/useSwipeGesture';
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
import { SharedPagesList } from './SharedPagesList';
import { MoveFolderDialog } from './MoveFolderDialog';
import { useState } from 'react';
import { toast } from 'sonner';

// Utility function to count folder contents recursively
function getFolderContents(
  folderId: string,
  folders: Folder[],
  notes: Note[]
): { noteCount: number; folderCount: number } {
  let noteCount = 0;
  let folderCount = 0;

  // Count direct child notes
  noteCount = notes.filter((n) => n.folderId === folderId).length;

  // Count direct child folders
  const childFolders = folders.filter((f) => f.parentId === folderId);
  folderCount = childFolders.length;

  // Recursively count contents of child folders
  childFolders.forEach((childFolder) => {
    const childContents = getFolderContents(childFolder.id, folders, notes);
    noteCount += childContents.noteCount;
    folderCount += childContents.folderCount;
  });

  return { noteCount, folderCount };
}

export function FileNavigator({ className }: FileNavigatorProps) {
  const {
    folios,
    folders,
    notes,
    activeFolioId,
    activeNoteId,
    expandedFolderIds,
    sidebarCollapsed,
    mobileDrawerOpen,
    selectedFolderId,
    setActiveNote,
    toggleFolderExpanded,
    toggleSidebar,
    setMobileDrawerOpen,
    setSelectedFolder,
    openTab,
  } = useFoliosStore();

  const { isLoading } = useFolioData();
  usePersistedActiveNote();

  const isMobile = useIsMobile();

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

  // Move folder dialog state
  const [moveFolderDialog, setMoveFolderDialog] = useState<{
    open: boolean;
    noteId: string | null;
    noteTitle: string;
    currentFolderId: string | null;
  }>({
    open: false,
    noteId: null,
    noteTitle: '',
    currentFolderId: null,
  });

  // Swipe gesture for mobile drawer (close drawer on swipe left)
  useSwipeGesture({
    onSwipeLeft: () => {
      if (isMobile && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    },
    enabled: isMobile && mobileDrawerOpen,
  });

  // Handle note click to open in tab
  const handleNoteClick = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setActiveNote(noteId);
      openTab(noteId, note.title, note.folioId);

      // Close mobile drawer after selecting note (better mobile UX)
      if (isMobile) {
        setMobileDrawerOpen(false);
      }
    }
  };

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
    onOpenNote: handleNoteClick,
  });

  // Handler functions
  const handleCreateFolder = async (name: string) => {
    if (!activeFolioId) return;
    await createFolder(name, activeFolioId, createDialog.parentId);
  };

  const handleCreateNote = async (title: string) => {
    if (!activeFolioId) return;
    await createNote(title, activeFolioId, createDialog.parentId);
    // Note is created from folder menu if createDialog.parentId is set
  };

  const handleNewNoteInFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      openCreateDialog('note', folderId, folder.name);
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    // Count folder contents
    const contents = getFolderContents(folderId, folders, notes);

    // Open delete dialog with content count
    openDeleteDialog('folder', folderId, folder.name, contents);
  };

  const handleRename = async (newName: string) => {
    if (!renameDialog) return;
    await renameItem(renameDialog.type, renameDialog.id, newName);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    // If deleting a folder, close tabs for deleted notes
    if (deleteDialog.type === 'folder') {
      const folderId = deleteDialog.id;

      // Get all notes in folder (before deletion)
      const notesInFolder = notes.filter((n) => n.folderId === folderId);

      // Recursively get notes in subfolders
      const getAllDescendantNotes = (parentId: string): Note[] => {
        const directNotes = notes.filter((n) => n.folderId === parentId);
        const subfolders = folders.filter((f) => f.parentId === parentId);
        const subfoldersNotes = subfolders.flatMap((sf) =>
          getAllDescendantNotes(sf.id)
        );
        return [...directNotes, ...subfoldersNotes];
      };

      const childFolders = folders.filter((f) => f.parentId === folderId);
      const allNotesInFolder = [
        ...notesInFolder,
        ...childFolders.flatMap((cf) => getAllDescendantNotes(cf.id))
      ];

      // Delete the folder
      await deleteItem(deleteDialog.type, deleteDialog.id);

      // Close tabs for all notes that were in the folder
      const { closeTab } = useFoliosStore.getState();
      allNotesInFolder.forEach((note) => {
        if (activeNoteId === note.id) {
          setActiveNote(null);
        }
        closeTab(note.id);
      });
    } else {
      // Non-folder deletion (existing logic)
      await deleteItem(deleteDialog.type, deleteDialog.id);
    }
  };

  // Handle opening move dialog
  const handleOpenMoveDialog = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setMoveFolderDialog({
        open: true,
        noteId: note.id,
        noteTitle: note.title,
        currentFolderId: note.folderId,
      });
    }
  };

  // Handle moving a note
  const handleMoveNote = async (noteId: string, targetFolderId: string | null) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move note');
      }

      const { data } = await response.json();

      // Update note in store
      const { updateNote } = useFoliosStore.getState();
      updateNote(noteId, { folderId: targetFolderId, title: data.title });

      toast.success('Note moved successfully');
    } catch (error) {
      console.error('Move note error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to move note';
      toast.error(errorMessage);
      throw error; // Re-throw for dialog to handle
    }
  };

  // Handle duplicating a note
  const handleDuplicateNote = async (noteId: string) => {
    try {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      const response = await fetch(`/api/notes/${noteId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolderId: note.folderId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to duplicate note');
      }

      const result = await response.json();

      // Add duplicated note to store
      const { addNote } = useFoliosStore.getState();
      addNote({
        id: result.data.noteId,
        title: result.data.title,
        content: note.content,
        folioId: note.folioId,
        folderId: note.folderId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast.success(`Note duplicated: ${result.data.title}`);
    } catch (error) {
      console.error('Duplicate note error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate note';
      toast.error(errorMessage);
    }
  };

  const activeFolio = folios.find((f) => f.id === activeFolioId);
  const hasNoFiles = folders.length === 0 && notes.length === 0;
  const isSharedFolio = activeFolioId === '__shared__';

  // Mobile drawer overlay
  const drawerOverlay = isMobile && (
    <div
      className={cn('drawer-overlay', mobileDrawerOpen && 'visible')}
      onClick={() => setMobileDrawerOpen(false)}
      aria-hidden="true"
    />
  );

  if (sidebarCollapsed && !isMobile) {
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
      {drawerOverlay}

      <div
        className={cn(
          'flex flex-col h-screen bg-[var(--card)]',
          'border-r border-[var(--border)]',
          'transition-all duration-200',
          // Desktop: Fixed sidebar
          !isMobile && 'relative',
          // Mobile: Fixed drawer
          isMobile && 'file-navigator-mobile-drawer',
          isMobile && mobileDrawerOpen && 'open',
          className
        )}
        style={!isMobile ? { width: `${sidebarWidth}px` } : undefined}
      >
        <div className="flex items-center justify-between p-[var(--spacing-md)] border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {activeFolio?.name || 'Files'}
          </h2>
          <div className="flex gap-[var(--spacing-xs)]">
            {!isSharedFolio && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openCreateDialog('folder', selectedFolderId || undefined)}
                  aria-label="New folder"
                  className="h-8 w-8"
                  title="New folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openCreateDialog('note', selectedFolderId || undefined)}
                  aria-label="New note"
                  className="h-8 w-8"
                  title="New note"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            )}
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
            {isSharedFolio ? (
              <SharedPagesList />
            ) : isLoading ? (
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
                onSelectNote={handleNoteClick}
                onRename={(type, id, name) => openRenameDialog(type, id, name)}
                onDelete={(type, id, name) => openDeleteDialog(type, id, name)}
                onCreateNote={(parentId) => openCreateDialog('note', parentId)}
                onCreateFolder={(parentId) => openCreateDialog('folder', parentId)}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolder}
                onMoveNote={handleOpenMoveDialog}
                onDuplicateNote={handleDuplicateNote}
                onNewNoteInFolder={handleNewNoteInFolder}
                onDeleteFolder={handleDeleteFolder}
              />
            )}
          </div>
        </ScrollArea>

        <FolioSwitcher />

        {!isMobile && (
          <div
            className={cn(
              'absolute top-0 right-0 w-1 h-full cursor-col-resize',
              'hover:bg-accent/50 transition-colors',
              'border-r border-border',
              isResizing && 'bg-accent'
            )}
            onMouseDown={handleMouseDown}
            aria-label="Resize sidebar"
          />
        )}
      </div>

      <CreateItemDialog
        type={createDialog.type}
        isOpen={createDialog.isOpen}
        onClose={closeCreateDialog}
        onCreate={
          createDialog.type === 'folder' ? handleCreateFolder : handleCreateNote
        }
        parentFolderName={createDialog.parentName}
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
          contentCount={deleteDialog.contentCount}
        />
      )}

      <MoveFolderDialog
        open={moveFolderDialog.open}
        onOpenChange={(open) =>
          setMoveFolderDialog((prev) => ({ ...prev, open }))
        }
        noteId={moveFolderDialog.noteId || ''}
        noteTitle={moveFolderDialog.noteTitle}
        currentFolderId={moveFolderDialog.currentFolderId}
        folders={folders}
        activeFolioId={activeFolioId || ''}
        onConfirm={handleMoveNote}
      />
    </>
  );
}
