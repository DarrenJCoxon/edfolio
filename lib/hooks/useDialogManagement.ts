import { useState, useCallback } from 'react';

interface CreateDialogState {
  isOpen: boolean;
  type: 'folder' | 'note';
  parentId?: string;
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
    (type: 'folder' | 'note', parentId?: string) => {
      setCreateDialog({ isOpen: true, type, parentId });
    },
    []
  );

  const closeCreateDialog = useCallback(() => {
    setCreateDialog({ isOpen: false, type: 'folder', parentId: undefined });
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
      name: string
    ) => {
      setDeleteDialog({ isOpen: true, type, id, name });
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
