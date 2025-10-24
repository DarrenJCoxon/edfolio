import { useEffect, useState } from 'react';
import { useFoliosStore } from '@/lib/stores/folios-store';

export function useFolioData() {
  const { activeFolioId, setFolios, setFolders, setNotes, setActiveFolio, setActiveNote } =
    useFoliosStore();
  const [isLoading, setIsLoading] = useState(true);

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

    // Skip folder/note loading for "Shared with Me" system folio
    // Shared documents are loaded individually via direct note fetch
    // Note: "Shared with Me" is a virtual folio that doesn't own folders or notes.
    // Shared documents are managed separately via PageCollaborator records and
    // loaded directly when opened, not through folio queries.
    if (activeFolioId === '__shared__') {
      // Clear folders and notes to avoid showing owner's data
      setFolders([]);
      setNotes([]);
      return;
    }

    const fetchFolioData = async () => {
      try {
        // Fetch folders
        const foldersRes = await fetch(`/api/folders?folioId=${activeFolioId}`);
        if (foldersRes.ok) {
          const { data: foldersData } = await foldersRes.json();
          const foldersWithDates = foldersData.map((f: unknown) => ({
            ...(f as Record<string, unknown>),
            createdAt: new Date((f as { createdAt: string }).createdAt),
            updatedAt: new Date((f as { updatedAt: string }).updatedAt),
          }));
          setFolders(foldersWithDates);
        }

        // Fetch notes
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

  // Restore last active note on initial load ONLY if no note is already active
  useEffect(() => {
    const restoreLastActiveNote = async () => {
      try {
        // Get current state to check if a note was already set
        const currentActiveNoteId = useFoliosStore.getState().activeNoteId;

        // Skip restoration if a note is already active (e.g., user clicked before restoration)
        if (currentActiveNoteId) {
          return;
        }

        const response = await fetch('/api/user/last-active-note');
        if (!response.ok) return;

        const { data } = await response.json();
        if (data?.lastActiveNoteId) {
          setActiveNote(data.lastActiveNoteId);
        }
      } catch (error) {
        console.error('Failed to restore last active note:', error);
      }
    };

    restoreLastActiveNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLoading };
}
