'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileNavigatorProps, Folder, Note } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { FolderItem } from './FolderItem';
import { NoteItem } from './NoteItem';
import { FolioSwitcher } from './FolioSwitcher';
import { CreateItemDialog } from './CreateItemDialog';
import { RenameDialog } from './RenameDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ItemContextMenu } from './ItemContextMenu';

export function FileNavigator({ className }: FileNavigatorProps) {
  const {
    folios,
    folders,
    notes,
    activeFolioId,
    activeNoteId,
    expandedFolderIds,
    sidebarCollapsed,
    setFolios,
    setNotes,
    setActiveFolio,
    setActiveNote,
    toggleFolderExpanded,
    toggleSidebar,
    addFolder,
    updateFolder,
    deleteFolder,
    addNote,
    updateNote,
    deleteNote,
    updateFolio,
    deleteFolio,
  } = useFoliosStore();

  const [isLoading, setIsLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  // Dialog states
  const [createDialog, setCreateDialog] = useState<{
    isOpen: boolean;
    type: 'folder' | 'note';
    parentId?: string;
  }>({ isOpen: false, type: 'folder' });

  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    type: 'folio' | 'folder' | 'note';
    id: string;
    name: string;
  } | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'folio' | 'folder' | 'note';
    id: string;
    name: string;
  } | null>(null);

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
        setRenameDialog({
          isOpen: true,
          type,
          id,
          name: type === 'note' ? (item as Note).title : (item as Folder).name,
        });
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
        setDeleteDialog({
          isOpen: true,
          type,
          id,
          name: type === 'note' ? (item as Note).title : (item as Folder).name,
        });
      }
    },
    onOpenNote: (id) => {
      setActiveNote(id);
    },
  });

  // Fetch folios on mount
  useEffect(() => {
    const fetchFolios = async () => {
      try {
        const response = await fetch('/api/folios');
        if (!response.ok) throw new Error('Failed to fetch folios');

        const { data } = await response.json();
        const foliosWithDates = data.map((f: unknown) => ({
          ...(f as Record<string, unknown>),
          createdAt: new Date((f as { createdAt: string }).createdAt),
          updatedAt: new Date((f as { updatedAt: string }).updatedAt),
        }));

        setFolios(foliosWithDates);

        if (foliosWithDates.length > 0 && !activeFolioId) {
          setActiveFolio(foliosWithDates[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch folios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFolios();
  }, []);

  // Fetch folders and notes when active folio changes
  useEffect(() => {
    if (!activeFolioId) return;

    const fetchFolioData = async () => {
      try {
        const notesRes = await fetch(`/api/notes?folioId=${activeFolioId}`);

        if (notesRes.ok) {
          const { data: notesData } = await notesRes.json();
          const notesWithDates = notesData.map((n: unknown) => ({
            ...(n as Record<string, unknown>),
            createdAt: new Date((n as { createdAt: string }).createdAt),
            updatedAt: new Date((n as { updatedAt: string }).updatedAt),
          }));
          setNotes(notesWithDates);
        }
      } catch (error) {
        console.error('Failed to fetch folio data:', error);
      }
    };

    fetchFolioData();
  }, [activeFolioId]);

  // Load sidebar width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('sidebar-width');
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // Resize handler
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX - 48;
      const minWidth = 192;
      const maxWidth = 384;

      setSidebarWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('sidebar-width', sidebarWidth.toString());
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  // CRUD operations
  const handleCreateFolder = async (name: string) => {
    if (!activeFolioId) return;

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          folioId: activeFolioId,
          parentId: createDialog.parentId || null,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      const { data } = await response.json();
      addFolder({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      });
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  };

  const handleCreateNote = async (title: string) => {
    if (!activeFolioId) return;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          folioId: activeFolioId,
          folderId: createDialog.parentId || null,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      const { data } = await response.json();
      addNote({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      });
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameDialog) return;

    try {
      const endpoint =
        renameDialog.type === 'folio'
          ? `/api/folios/${renameDialog.id}`
          : renameDialog.type === 'folder'
          ? `/api/folders/${renameDialog.id}`
          : `/api/notes/${renameDialog.id}`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          renameDialog.type === 'note' ? { title: newName } : { name: newName }
        ),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      // Successfully renamed
      if (renameDialog.type === 'folio') {
        updateFolio(renameDialog.id, { name: newName });
      } else if (renameDialog.type === 'folder') {
        updateFolder(renameDialog.id, { name: newName });
      } else {
        updateNote(renameDialog.id, { title: newName });
      }
    } catch (error) {
      console.error('Failed to rename:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      const endpoint =
        deleteDialog.type === 'folio'
          ? `/api/folios/${deleteDialog.id}`
          : deleteDialog.type === 'folder'
          ? `/api/folders/${deleteDialog.id}`
          : `/api/notes/${deleteDialog.id}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      if (deleteDialog.type === 'folio') {
        deleteFolio(deleteDialog.id);
      } else if (deleteDialog.type === 'folder') {
        deleteFolder(deleteDialog.id);
      } else {
        deleteNote(deleteDialog.id);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      throw error;
    }
  };

  // Render tree structure
  const renderFolder = (folder: Folder, depth: number = 0): JSX.Element => {
    const isExpanded = expandedFolderIds.has(folder.id);
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const childNotes = notes.filter((n) => n.folderId === folder.id);

    return (
      <div key={folder.id}>
        <ItemContextMenu
          onRename={() =>
            setRenameDialog({
              isOpen: true,
              type: 'folder',
              id: folder.id,
              name: folder.name,
            })
          }
          onDelete={() =>
            setDeleteDialog({
              isOpen: true,
              type: 'folder',
              id: folder.id,
              name: folder.name,
            })
          }
        >
          <FolderItem
            folder={folder}
            depth={depth}
            isExpanded={isExpanded}
            onToggleExpand={toggleFolderExpanded}
          />
        </ItemContextMenu>

        {isExpanded && (
          <div>
            {childFolders.map((child) => renderFolder(child, depth + 1))}
            {childNotes.map((note) => (
              <ItemContextMenu
                key={note.id}
                onRename={() =>
                  setRenameDialog({
                    isOpen: true,
                    type: 'note',
                    id: note.id,
                    name: note.title,
                  })
                }
                onDelete={() =>
                  setDeleteDialog({
                    isOpen: true,
                    type: 'note',
                    id: note.id,
                    name: note.title,
                  })
                }
              >
                <NoteItem
                  note={note}
                  depth={depth + 1}
                  isActive={note.id === activeNoteId}
                  onClick={(id) => setActiveNote(id)}
                />
              </ItemContextMenu>
            ))}
          </div>
        )}
      </div>
    );
  };

  const activeFolio = folios.find((f) => f.id === activeFolioId);
  const rootFolders = folders.filter(
    (f) => f.folioId === activeFolioId && !f.parentId
  );
  const rootNotes = notes.filter(
    (n) => n.folioId === activeFolioId && !n.folderId
  );

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
        {/* Header */}
        <div className="flex items-center justify-between p-[var(--spacing-md)] border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {activeFolio?.name || 'Files'}
          </h2>
          <div className="flex gap-[var(--spacing-xs)]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCreateDialog({ isOpen: true, type: 'note' })
              }
              aria-label="New note"
              className="h-8 w-8"
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

        {/* File Tree */}
        <ScrollArea className="flex-1">
          <div className="p-[var(--spacing-sm)]" role="tree">
            {isLoading ? (
              <p className="text-sm text-[var(--muted-foreground)] p-[var(--spacing-md)]">
                Loading...
              </p>
            ) : rootFolders.length === 0 && rootNotes.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] p-[var(--spacing-md)]">
                No files yet. Create a note or folder to get started.
              </p>
            ) : (
              <>
                {rootFolders.map((folder) => renderFolder(folder, 0))}
                {rootNotes.map((note) => (
                  <ItemContextMenu
                    key={note.id}
                    onRename={() =>
                      setRenameDialog({
                        isOpen: true,
                        type: 'note',
                        id: note.id,
                        name: note.title,
                      })
                    }
                    onDelete={() =>
                      setDeleteDialog({
                        isOpen: true,
                        type: 'note',
                        id: note.id,
                        name: note.title,
                      })
                    }
                  >
                    <NoteItem
                      note={note}
                      depth={0}
                      isActive={note.id === activeNoteId}
                      onClick={(id) => setActiveNote(id)}
                    />
                  </ItemContextMenu>
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Folio Switcher */}
        <FolioSwitcher />

        {/* Resize Handle */}
        <div
          className={cn(
            'absolute top-0 right-0 w-1 h-full cursor-col-resize',
            'hover:bg-[var(--accent)] transition-colors',
            isResizing && 'bg-[var(--accent)]'
          )}
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Dialogs */}
      <CreateItemDialog
        type={createDialog.type}
        isOpen={createDialog.isOpen}
        onClose={() => setCreateDialog({ isOpen: false, type: 'folder' })}
        onCreate={
          createDialog.type === 'folder' ? handleCreateFolder : handleCreateNote
        }
      />

      {renameDialog && (
        <RenameDialog
          type={renameDialog.type}
          currentName={renameDialog.name}
          isOpen={renameDialog.isOpen}
          onClose={() => setRenameDialog(null)}
          onRename={handleRename}
        />
      )}

      {deleteDialog && (
        <DeleteConfirmDialog
          type={deleteDialog.type}
          itemName={deleteDialog.name}
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
