import { useState, useCallback } from 'react';

interface CreateDialogState {
  isOpen: boolean;
  type: 'folder' | 'note';
  parentId?: string;
  parentName?: string;
}

interface RenameDialogState {
  isOpen: boolean;
  type: 'folio' | 'folder' | 'note';
  id: string;
  name: string;
}

interface DeleteDialogState {
  isOpen: boolean;
  type: 'folio' | 'folder' | 'note';
  id: string;
  name: string;
  contentCount?: { noteCount: number; folderCount: number };
}

export function useDialogManagement() {
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({
    isOpen: false,
    type: 'folder',
    parentId: undefined,
  });

  const [renameDialog, setRenameDialog] = useState<RenameDialogState | null>(
    null
  );

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(
    null
  );

  const openCreateDialog = useCallback(
    (type: 'folder' | 'note', parentId?: string, parentName?: string) => {
      setCreateDialog({ isOpen: true, type, parentId, parentName });
    },
    []
  );

  const closeCreateDialog = useCallback(() => {
    setCreateDialog({ isOpen: false, type: 'folder', parentId: undefined, parentName: undefined });
  }, []);

  const openRenameDialog = useCallback(
    (
      type: 'folio' | 'folder' | 'note',
      id: string,
      name: string
    ) => {
      setRenameDialog({ isOpen: true, type, id, name });
    },
    []
  );

  const closeRenameDialog = useCallback(() => {
    setRenameDialog(null);
  }, []);

  const openDeleteDialog = useCallback(
    (
      type: 'folio' | 'folder' | 'note',
      id: string,
      name: string,
      contentCount?: { noteCount: number; folderCount: number }
    ) => {
      setDeleteDialog({ isOpen: true, type, id, name, contentCount });
    },
    []
  );

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(null);
  }, []);

  return {
    createDialog,
    renameDialog,
    deleteDialog,
    openCreateDialog,
    closeCreateDialog,
    openRenameDialog,
    closeRenameDialog,
    openDeleteDialog,
    closeDeleteDialog,
  };
}
