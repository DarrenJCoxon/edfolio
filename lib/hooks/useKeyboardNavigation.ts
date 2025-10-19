import { useEffect } from 'react';
import { useFoliosStore } from '@/lib/stores/folios-store';

interface UseKeyboardNavigationProps {
  onRenameItem?: (id: string, type: 'folio' | 'folder' | 'note') => void;
  onDeleteItem?: (id: string, type: 'folio' | 'folder' | 'note') => void;
  onOpenNote?: (id: string) => void;
}

export function useKeyboardNavigation({
  onRenameItem,
  onDeleteItem,
  onOpenNote,
}: UseKeyboardNavigationProps) {
  const {
    folios,
    folders,
    notes,
    activeFolioId,
    expandedFolderIds,
    focusedItemId,
    focusedItemType,
    toggleFolderExpanded,
    setFocusedItem,
  } = useFoliosStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedItemId || !focusedItemType) return;

      // Build flat list of all items in order
      const buildFlatList = (): Array<{
        id: string;
        type: 'folio' | 'folder' | 'note';
      }> => {
        const items: Array<{ id: string; type: 'folio' | 'folder' | 'note' }> =
          [];

        // Add active folio
        if (activeFolioId) {
          items.push({ id: activeFolioId, type: 'folio' });

          // Add root folders and their children recursively
          const addFolderAndChildren = (folderId: string) => {
            items.push({ id: folderId, type: 'folder' });

            // If expanded, add children
            if (expandedFolderIds.has(folderId)) {
              const childFolders = folders.filter(
                (f) => f.parentId === folderId
              );
              const childNotes = notes.filter((n) => n.folderId === folderId);

              childFolders.forEach((child) => addFolderAndChildren(child.id));
              childNotes.forEach((note) =>
                items.push({ id: note.id, type: 'note' })
              );
            }
          };

          // Add root folders
          const rootFolders = folders.filter(
            (f) => f.folioId === activeFolioId && !f.parentId
          );
          rootFolders.forEach((folder) => addFolderAndChildren(folder.id));

          // Add root notes
          const rootNotes = notes.filter(
            (n) => n.folioId === activeFolioId && !n.folderId
          );
          rootNotes.forEach((note) => items.push({ id: note.id, type: 'note' }));
        }

        return items;
      };

      const flatList = buildFlatList();
      const currentIndex = flatList.findIndex((item) => item.id === focusedItemId);

      if (currentIndex === -1) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            const prev = flatList[currentIndex - 1];
            setFocusedItem(prev.id, prev.type);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < flatList.length - 1) {
            const next = flatList[currentIndex + 1];
            setFocusedItem(next.id, next.type);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (
            focusedItemType === 'folder' &&
            expandedFolderIds.has(focusedItemId)
          ) {
            toggleFolderExpanded(focusedItemId);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (
            focusedItemType === 'folder' &&
            !expandedFolderIds.has(focusedItemId)
          ) {
            toggleFolderExpanded(focusedItemId);
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (focusedItemType === 'note' && onOpenNote) {
            onOpenNote(focusedItemId);
          } else if (focusedItemType === 'folder') {
            toggleFolderExpanded(focusedItemId);
          }
          break;

        case 'Delete':
          e.preventDefault();
          if (onDeleteItem) {
            onDeleteItem(focusedItemId, focusedItemType);
          }
          break;

        case 'F2':
          e.preventDefault();
          if (onRenameItem) {
            onRenameItem(focusedItemId, focusedItemType);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    folios,
    folders,
    notes,
    activeFolioId,
    expandedFolderIds,
    focusedItemId,
    focusedItemType,
    toggleFolderExpanded,
    setFocusedItem,
    onRenameItem,
    onDeleteItem,
    onOpenNote,
  ]);
}
