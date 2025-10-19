import { useFoliosStore } from './folios-store';
import { Folio, Folder, Note } from '@/types';

describe('FoliosStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { setFolios, setFolders, setNotes } = useFoliosStore.getState();
    setFolios([]);
    setFolders([]);
    setNotes([]);
  });

  describe('Folio actions', () => {
    it('should add a folio', () => {
      const folio: Folio = {
        id: '1',
        name: 'Test Folio',
        ownerId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addFolio, folios } = useFoliosStore.getState();
      addFolio(folio);

      expect(useFoliosStore.getState().folios).toHaveLength(1);
      expect(useFoliosStore.getState().folios[0]).toEqual(folio);
    });

    it('should update a folio', () => {
      const folio: Folio = {
        id: '1',
        name: 'Test Folio',
        ownerId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addFolio, updateFolio } = useFoliosStore.getState();
      addFolio(folio);
      updateFolio('1', { name: 'Updated Folio' });

      expect(useFoliosStore.getState().folios[0].name).toBe('Updated Folio');
    });

    it('should delete a folio and its contents', () => {
      const folio: Folio = {
        id: '1',
        name: 'Test Folio',
        ownerId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const folder: Folder = {
        id: 'f1',
        name: 'Test Folder',
        folioId: '1',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const note: Note = {
        id: 'n1',
        title: 'Test Note',
        folioId: '1',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addFolio, addFolder, addNote, deleteFolio } =
        useFoliosStore.getState();

      addFolio(folio);
      addFolder(folder);
      addNote(note);

      deleteFolio('1');

      const state = useFoliosStore.getState();
      expect(state.folios).toHaveLength(0);
      expect(state.folders).toHaveLength(0);
      expect(state.notes).toHaveLength(0);
    });
  });

  describe('Folder actions', () => {
    it('should add a folder', () => {
      const folder: Folder = {
        id: 'f1',
        name: 'Test Folder',
        folioId: '1',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addFolder } = useFoliosStore.getState();
      addFolder(folder);

      expect(useFoliosStore.getState().folders).toHaveLength(1);
      expect(useFoliosStore.getState().folders[0]).toEqual(folder);
    });

    it('should delete folder and its children', () => {
      const parentFolder: Folder = {
        id: 'f1',
        name: 'Parent',
        folioId: '1',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const childFolder: Folder = {
        id: 'f2',
        name: 'Child',
        folioId: '1',
        parentId: 'f1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const note: Note = {
        id: 'n1',
        title: 'Note in child',
        folioId: '1',
        folderId: 'f2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addFolder, addNote, deleteFolder } = useFoliosStore.getState();

      addFolder(parentFolder);
      addFolder(childFolder);
      addNote(note);

      deleteFolder('f1');

      const state = useFoliosStore.getState();
      expect(state.folders).toHaveLength(0);
      expect(state.notes).toHaveLength(0);
    });

    it('should toggle folder expanded state', () => {
      const { toggleFolderExpanded, expandedFolderIds } =
        useFoliosStore.getState();

      toggleFolderExpanded('f1');
      expect(useFoliosStore.getState().expandedFolderIds.has('f1')).toBe(true);

      toggleFolderExpanded('f1');
      expect(useFoliosStore.getState().expandedFolderIds.has('f1')).toBe(false);
    });
  });

  describe('Note actions', () => {
    it('should add a note', () => {
      const note: Note = {
        id: 'n1',
        title: 'Test Note',
        folioId: '1',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addNote } = useFoliosStore.getState();
      addNote(note);

      expect(useFoliosStore.getState().notes).toHaveLength(1);
      expect(useFoliosStore.getState().notes[0]).toEqual(note);
    });

    it('should update a note', () => {
      const note: Note = {
        id: 'n1',
        title: 'Test Note',
        folioId: '1',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addNote, updateNote } = useFoliosStore.getState();
      addNote(note);
      updateNote('n1', { title: 'Updated Note' });

      expect(useFoliosStore.getState().notes[0].title).toBe('Updated Note');
    });

    it('should delete a note', () => {
      const note: Note = {
        id: 'n1',
        title: 'Test Note',
        folioId: '1',
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addNote, deleteNote, setActiveNote } = useFoliosStore.getState();

      addNote(note);
      setActiveNote('n1');
      deleteNote('n1');

      const state = useFoliosStore.getState();
      expect(state.notes).toHaveLength(0);
      expect(state.activeNoteId).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('should get active folio', () => {
      const folio: Folio = {
        id: '1',
        name: 'Test Folio',
        ownerId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addFolio, setActiveFolio, getActiveFolio } =
        useFoliosStore.getState();

      addFolio(folio);
      setActiveFolio('1');

      expect(getActiveFolio()).toEqual(folio);
    });

    it('should get folders by folio', () => {
      const folder1: Folder = {
        id: 'f1',
        name: 'Folder 1',
        folioId: '1',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const folder2: Folder = {
        id: 'f2',
        name: 'Folder 2',
        folioId: '2',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addFolder, getFoldersByFolio } = useFoliosStore.getState();

      addFolder(folder1);
      addFolder(folder2);

      const folioFolders = getFoldersByFolio('1');
      expect(folioFolders).toHaveLength(1);
      expect(folioFolders[0].id).toBe('f1');
    });

    it('should get notes by folder', () => {
      const note1: Note = {
        id: 'n1',
        title: 'Note 1',
        folioId: '1',
        folderId: 'f1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const note2: Note = {
        id: 'n2',
        title: 'Note 2',
        folioId: '1',
        folderId: 'f2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { addNote, getNotesByFolder } = useFoliosStore.getState();

      addNote(note1);
      addNote(note2);

      const folderNotes = getNotesByFolder('f1', '1');
      expect(folderNotes).toHaveLength(1);
      expect(folderNotes[0].id).toBe('n1');
    });
  });
});
