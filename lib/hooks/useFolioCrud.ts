import { useCallback } from 'react';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';

export function useFolioCrud() {
  const {
    addFolder,
    updateFolder,
    deleteFolder,
    addNote,
    updateNote,
    deleteNote,
    updateFolio,
    deleteFolio,
  } = useFoliosStore();

  const createFolder = useCallback(
    async (name: string, folioId: string, parentId?: string) => {
      try {
        const response = await fetchWithCsrf('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            folioId,
            parentId: parentId || null,
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
    },
    [addFolder]
  );

  const createNote = useCallback(
    async (title: string, folioId: string, folderId?: string) => {
      try {
        const response = await fetchWithCsrf('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            folioId,
            ...(folderId && { folderId }),
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
    },
    [addNote]
  );

  const renameItem = useCallback(
    async (
      type: 'folio' | 'folder' | 'note',
      id: string,
      newName: string
    ) => {
      try {
        const endpoint =
          type === 'folio'
            ? `/api/folios/${id}`
            : type === 'folder'
            ? `/api/folders/${id}`
            : `/api/notes/${id}`;

        const response = await fetchWithCsrf(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            type === 'note' ? { title: newName } : { name: newName }
          ),
        });

        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error);
        }

        if (type === 'folio') {
          updateFolio(id, { name: newName });
        } else if (type === 'folder') {
          updateFolder(id, { name: newName });
        } else {
          updateNote(id, { title: newName });
        }
      } catch (error) {
        console.error('Failed to rename:', error);
        throw error;
      }
    },
    [updateFolio, updateFolder, updateNote]
  );

  const deleteItem = useCallback(
    async (type: 'folio' | 'folder' | 'note', id: string) => {
      try {
        const endpoint =
          type === 'folio'
            ? `/api/folios/${id}`
            : type === 'folder'
            ? `/api/folders/${id}`
            : `/api/notes/${id}`;

        const response = await fetchWithCsrf(endpoint, { method: 'DELETE' });

        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error);
        }

        if (type === 'folio') {
          deleteFolio(id);
        } else if (type === 'folder') {
          deleteFolder(id);
        } else {
          deleteNote(id);
        }
      } catch (error) {
        console.error('Failed to delete:', error);
        throw error;
      }
    },
    [deleteFolio, deleteFolder, deleteNote]
  );

  return {
    createFolder,
    createNote,
    renameItem,
    deleteItem,
  };
}
