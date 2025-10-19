import { create } from 'zustand';
import { Folio, Folder, Note } from '@/types';

interface FoliosState {
  folios: Folio[];
  folders: Folder[];
  notes: Note[];
  activeFolioId: string | null;
  activeNoteId: string | null;
  expandedFolderIds: Set<string>;
  sidebarCollapsed: boolean;
  focusedItemId: string | null;
  focusedItemType: 'folio' | 'folder' | 'note' | null;

  // Folio actions
  setFolios: (folios: Folio[]) => void;
  addFolio: (folio: Folio) => void;
  updateFolio: (id: string, updates: Partial<Folio>) => void;
  deleteFolio: (id: string) => void;
  setActiveFolio: (id: string) => void;

  // Folder actions
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  toggleFolderExpanded: (id: string) => void;

  // Note actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;

  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Focus actions
  setFocusedItem: (id: string | null, type: 'folio' | 'folder' | 'note' | null) => void;

  // Selectors
  getActiveFolio: () => Folio | undefined;
  getFoldersByFolio: (folioId: string) => Folder[];
  getNotesByFolder: (folderId: string | null, folioId: string) => Note[];
  getRootFolders: (folioId: string) => Folder[];
}

export const useFoliosStore = create<FoliosState>((set, get) => ({
  folios: [],
  folders: [],
  notes: [],
  activeFolioId: null,
  activeNoteId: null,
  expandedFolderIds: new Set<string>(),
  sidebarCollapsed: false,
  focusedItemId: null,
  focusedItemType: null,

  // Folio actions
  setFolios: (folios) => set({ folios }),

  addFolio: (folio) =>
    set((state) => ({
      folios: [...state.folios, folio],
    })),

  updateFolio: (id, updates) =>
    set((state) => ({
      folios: state.folios.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  deleteFolio: (id) =>
    set((state) => {
      const newState: Partial<FoliosState> = {
        folios: state.folios.filter((f) => f.id !== id),
        folders: state.folders.filter((f) => f.folioId !== id),
        notes: state.notes.filter((n) => n.folioId !== id),
      };

      // If deleted folio was active, clear active folio
      if (state.activeFolioId === id) {
        newState.activeFolioId = newState.folios?.[0]?.id || null;
      }

      return newState as FoliosState;
    }),

  setActiveFolio: (id) => set({ activeFolioId: id }),

  // Folder actions
  setFolders: (folders) => set({ folders }),

  addFolder: (folder) =>
    set((state) => ({
      folders: [...state.folders, folder],
    })),

  updateFolder: (id, updates) =>
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  deleteFolder: (id) =>
    set((state) => {
      const deleteRecursive = (folderId: string): string[] => {
        const childIds = state.folders
          .filter((f) => f.parentId === folderId)
          .map((f) => f.id);
        return [folderId, ...childIds.flatMap(deleteRecursive)];
      };

      const idsToDelete = deleteRecursive(id);

      return {
        folders: state.folders.filter((f) => !idsToDelete.includes(f.id)),
        notes: state.notes.filter((n) => !idsToDelete.includes(n.folderId || '')),
      };
    }),

  toggleFolderExpanded: (id) =>
    set((state) => {
      const newExpanded = new Set(state.expandedFolderIds);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedFolderIds: newExpanded };
    }),

  // Note actions
  setNotes: (notes) => set({ notes }),

  addNote: (note) =>
    set((state) => ({
      notes: [...state.notes, note],
    })),

  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),

  deleteNote: (id) =>
    set((state) => {
      const newState: Partial<FoliosState> = {
        notes: state.notes.filter((n) => n.id !== id),
      };

      // If deleted note was active, clear active note
      if (state.activeNoteId === id) {
        newState.activeNoteId = null;
      }

      return newState as FoliosState;
    }),

  setActiveNote: (id) => set({ activeNoteId: id }),

  // Sidebar actions
  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Focus actions
  setFocusedItem: (id, type) =>
    set({ focusedItemId: id, focusedItemType: type }),

  // Selectors
  getActiveFolio: () => {
    const state = get();
    return state.folios.find((f) => f.id === state.activeFolioId);
  },

  getFoldersByFolio: (folioId) => {
    const state = get();
    return state.folders.filter((f) => f.folioId === folioId);
  },

  getNotesByFolder: (folderId, folioId) => {
    const state = get();
    return state.notes.filter(
      (n) => n.folderId === folderId && n.folioId === folioId
    );
  },

  getRootFolders: (folioId) => {
    const state = get();
    return state.folders.filter(
      (f) => f.folioId === folioId && f.parentId === null
    );
  },
}));
