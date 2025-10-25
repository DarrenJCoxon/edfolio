import { create } from 'zustand';
import { Folio, Folder, Note } from '@/types';

interface Tab {
  noteId: string;
  title: string;
  folioId: string;
  isShared?: boolean; // NEW: Indicates if this tab is for a shared document
}

// Cache entry for note content
interface NoteContentCache {
  content: unknown;
  timestamp: number;
}

interface FoliosState {
  folios: Folio[];
  folders: Folder[];
  notes: Note[];
  activeFolioId: string | null;
  activeNoteId: string | null;
  selectedFolderId: string | null;
  expandedFolderIds: Set<string>;
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  focusedItemId: string | null;
  focusedItemType: 'folio' | 'folder' | 'note' | null;
  openTabs: Tab[];
  MAX_TABS: number;

  // Note content cache for instant tab switching
  noteContentCache: Map<string, NoteContentCache>;

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
  setSelectedFolder: (id: string | null) => void;

  // Tab actions
  openTab: (noteId: string, title: string, folioId: string, isShared?: boolean) => void;
  closeTab: (noteId: string) => void;
  closeAllTabs: () => void;
  updateTabTitle: (noteId: string, newTitle: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Note content cache actions
  cacheNoteContent: (noteId: string, content: unknown) => void;
  getCachedNoteContent: (noteId: string) => unknown | null;
  clearNoteContentCache: () => void;
  removeCachedNote: (noteId: string) => void;

  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Mobile drawer actions
  setMobileDrawerOpen: (open: boolean) => void;
  toggleMobileDrawer: () => void;

  // Focus actions
  setFocusedItem: (id: string | null, type: 'folio' | 'folder' | 'note' | null) => void;

  // Selectors
  getActiveFolio: () => Folio | undefined;
  getFoldersByFolio: (folioId: string) => Folder[];
  getNotesByFolder: (folderId: string | null, folioId: string) => Note[];
  getRootFolders: (folioId: string) => Folder[];
  getTabsForCurrentFolio: () => Tab[];
}

// Helper to load tabs from localStorage
const loadTabsFromStorage = (): Tab[] => {
  try {
    const saved = localStorage.getItem('edfolio-open-tabs');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filter out legacy tabs without folioId (from before migration)
        // We can't assign them to a folio without knowing which one they belong to
        return parsed.filter((tab) => tab.folioId !== undefined);
      }
    }
  } catch (error) {
    console.error('Failed to load tabs from localStorage:', error);
  }
  return [];
};

// Helper to save tabs to localStorage
const saveTabsToStorage = (tabs: Tab[]): void => {
  try {
    localStorage.setItem('edfolio-open-tabs', JSON.stringify(tabs));
  } catch (error) {
    console.error('Failed to save tabs to localStorage:', error);
  }
};

export const useFoliosStore = create<FoliosState>((set, get) => ({
  folios: [],
  folders: [],
  notes: [],
  activeFolioId: null,
  activeNoteId: null,
  selectedFolderId: null,
  expandedFolderIds: new Set<string>(),
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  focusedItemId: null,
  focusedItemType: null,
  openTabs: typeof window !== 'undefined' ? loadTabsFromStorage() : [],
  MAX_TABS: 10,
  noteContentCache: new Map<string, NoteContentCache>(),

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
    set((state) => {
      const updatedNotes = state.notes.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      );

      // Update tab title if note title changed
      let updatedTabs = state.openTabs;
      if (updates.title !== undefined) {
        updatedTabs = state.openTabs.map((tab) =>
          tab.noteId === id ? { ...tab, title: updates.title as string } : tab
        );
        saveTabsToStorage(updatedTabs);
      }

      return {
        notes: updatedNotes,
        openTabs: updatedTabs,
      };
    }),

  deleteNote: (id) =>
    set((state) => {
      const newState: Partial<FoliosState> = {
        notes: state.notes.filter((n) => n.id !== id),
      };

      // Remove tab if note had one open
      const newTabs = state.openTabs.filter((t) => t.noteId !== id);
      newState.openTabs = newTabs;
      saveTabsToStorage(newTabs);

      // Remove cached content for deleted note
      const newCache = new Map(state.noteContentCache);
      newCache.delete(id);
      newState.noteContentCache = newCache;

      // If deleted note was active, clear active note
      if (state.activeNoteId === id) {
        newState.activeNoteId = null;
      }

      return newState as FoliosState;
    }),

  setActiveNote: (id) => set({ activeNoteId: id }),

  setSelectedFolder: (id) => set({ selectedFolderId: id }),

  // Tab actions
  openTab: (noteId, title, folioId, isShared = false) => {
    const state = get();
    const existingTabIndex = state.openTabs.findIndex((t) => t.noteId === noteId);

    if (existingTabIndex !== -1) {
      // Tab exists, just switch to it
      set({ activeNoteId: noteId });
      return;
    }

    // Create new tab with optional isShared flag
    let newTabs = [...state.openTabs, { noteId, title, folioId, isShared }];

    // If exceeds max, remove oldest tab (first in array)
    if (newTabs.length > state.MAX_TABS) {
      newTabs = newTabs.slice(1);
    }

    saveTabsToStorage(newTabs);
    set({
      openTabs: newTabs,
      activeNoteId: noteId,
    });
  },

  closeTab: (noteId) => {
    const state = get();
    const tabIndex = state.openTabs.findIndex((t) => t.noteId === noteId);

    if (tabIndex === -1) return;

    const newTabs = state.openTabs.filter((t) => t.noteId !== noteId);

    // Determine new active tab if closing active tab
    let newActiveNoteId = state.activeNoteId;

    if (noteId === state.activeNoteId) {
      if (newTabs.length === 0) {
        newActiveNoteId = null;
      } else {
        // Switch to adjacent tab (prefer right, fallback to left)
        const adjacentIndex = tabIndex < newTabs.length ? tabIndex : tabIndex - 1;
        newActiveNoteId = newTabs[adjacentIndex]?.noteId || null;
      }
    }

    saveTabsToStorage(newTabs);
    set({
      openTabs: newTabs,
      activeNoteId: newActiveNoteId,
    });
  },

  closeAllTabs: () => {
    saveTabsToStorage([]);
    set({
      openTabs: [],
      activeNoteId: null,
    });
  },

  updateTabTitle: (noteId, newTitle) => {
    const state = get();
    const newTabs = state.openTabs.map((tab) =>
      tab.noteId === noteId ? { ...tab, title: newTitle } : tab
    );
    saveTabsToStorage(newTabs);
    set({ openTabs: newTabs });
  },

  reorderTabs: (fromIndex, toIndex) => {
    const state = get();
    const newTabs = [...state.openTabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);
    saveTabsToStorage(newTabs);
    set({ openTabs: newTabs });
  },

  // Note content cache actions
  cacheNoteContent: (noteId, content) =>
    set((state) => {
      const newCache = new Map(state.noteContentCache);
      newCache.set(noteId, {
        content,
        timestamp: Date.now(),
      });
      return { noteContentCache: newCache };
    }),

  getCachedNoteContent: (noteId) => {
    const cache = get().noteContentCache.get(noteId);
    return cache ? cache.content : null;
  },

  clearNoteContentCache: () =>
    set({ noteContentCache: new Map<string, NoteContentCache>() }),

  removeCachedNote: (noteId) =>
    set((state) => {
      const newCache = new Map(state.noteContentCache);
      newCache.delete(noteId);
      return { noteContentCache: newCache };
    }),

  // Sidebar actions
  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Mobile drawer actions
  setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),

  toggleMobileDrawer: () =>
    set((state) => ({ mobileDrawerOpen: !state.mobileDrawerOpen })),

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

  getTabsForCurrentFolio: () => {
    const state = get();
    if (!state.activeFolioId) return [];
    return state.openTabs.filter((tab) => tab.folioId === state.activeFolioId);
  },
}));
