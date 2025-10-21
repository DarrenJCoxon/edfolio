import { useFoliosStore } from './folios-store';
import { createMockFolio, createMockFolder, createMockNote } from '@/__tests__/utils/test-data';

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
      const folio = createMockFolio({
        id: '1',
        name: 'Test Folio',
        ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      });

      const { addFolio, folios } = useFoliosStore.getState();
      addFolio(folio);

      expect(useFoliosStore.getState().folios).toHaveLength(1);
      expect(useFoliosStore.getState().folios[0]).toEqual(folio);
    });

    it('should update a folio', () => {
      const folio = createMockFolio({
        id: '1',
        name: 'Test Folio',
        ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      });

      const { addFolio, updateFolio } = useFoliosStore.getState();
      addFolio(folio);
      updateFolio('1', { name: 'Updated Folio' });

      expect(useFoliosStore.getState().folios[0].name).toBe('Updated Folio');
    });

    it('should delete a folio and its contents', () => {
      const folio = createMockFolio({
        id: '1',
        name: 'Test Folio',
        ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      });

      const folder = createMockFolder({
        id: 'f1',
        name: 'Test Folder',
        folioId: '1',
        parentId: null,
      });

      const note = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not1',
        title: 'Test Note',
        folioId: '1',
        folderId: null,
      });

      const { setFolios, setFolders, setNotes, deleteFolio } = useFoliosStore.getState();
      setFolios([folio]);
      setFolders([folder]);
      setNotes([note]);

      deleteFolio('1');

      expect(useFoliosStore.getState().folios).toHaveLength(0);
      expect(useFoliosStore.getState().folders).toHaveLength(0);
      expect(useFoliosStore.getState().notes).toHaveLength(0);
    });
  });

  describe('Folder actions', () => {
    it('should add a folder', () => {
      const folder = createMockFolder({
        id: 'clh0e8r5k0000jw0c8y5d6fld1',
        name: 'Test Folder',
        folioId: '1',
        parentId: null,
      });

      const { addFolder } = useFoliosStore.getState();
      addFolder(folder);

      expect(useFoliosStore.getState().folders).toHaveLength(1);
      expect(useFoliosStore.getState().folders[0]).toEqual(folder);
    });

    it('should update a folder', () => {
      const folder = createMockFolder({
        id: 'clh0e8r5k0000jw0c8y5d6fld1',
        name: 'Test Folder',
        folioId: '1',
        parentId: null,
      });

      const { addFolder, updateFolder } = useFoliosStore.getState();
      addFolder(folder);
      updateFolder('clh0e8r5k0000jw0c8y5d6fld1', { name: 'Updated Folder' });

      expect(useFoliosStore.getState().folders[0].name).toBe('Updated Folder');
    });

    it('should delete a folder and its contents', () => {
      const parentFolder = createMockFolder({
        id: 'clh0e8r5k0000jw0c8y5parent',
        name: 'Parent Folder',
        folioId: '1',
        parentId: null,
      });

      const childFolder = createMockFolder({
        id: 'clh0e8r5k0000jw0c8y5dchild',
        name: 'Child Folder',
        folioId: '1',
        parentId: 'clh0e8r5k0000jw0c8y5parent',
      });

      const note = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not1',
        title: 'Test Note',
        folioId: '1',
        folderId: 'clh0e8r5k0000jw0c8y5parent',
      });

      const { setFolders, setNotes, deleteFolder } = useFoliosStore.getState();
      setFolders([parentFolder, childFolder]);
      setNotes([note]);

      deleteFolder('clh0e8r5k0000jw0c8y5parent');

      expect(useFoliosStore.getState().folders).toHaveLength(0);
      expect(useFoliosStore.getState().notes).toHaveLength(0);
    });
  });

  describe('Note actions', () => {
    it('should add a note', () => {
      const note = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not1',
        title: 'Test Note',
        folioId: '1',
        folderId: null,
      });

      const { addNote } = useFoliosStore.getState();
      addNote(note);

      expect(useFoliosStore.getState().notes).toHaveLength(1);
      expect(useFoliosStore.getState().notes[0]).toEqual(note);
    });

    it('should update a note', () => {
      const note = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not1',
        title: 'Test Note',
        folioId: '1',
        folderId: null,
      });

      const { addNote, updateNote } = useFoliosStore.getState();
      addNote(note);
      updateNote('clh0e8r5k0000jw0c8y5d6not1', { title: 'Updated Note' });

      expect(useFoliosStore.getState().notes[0].title).toBe('Updated Note');
    });

    it('should delete a note', () => {
      const note = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not1',
        title: 'Test Note',
        folioId: '1',
        folderId: null,
      });

      const { addNote, deleteNote } = useFoliosStore.getState();
      addNote(note);
      deleteNote('clh0e8r5k0000jw0c8y5d6not1');

      expect(useFoliosStore.getState().notes).toHaveLength(0);
    });
  });

  describe('Search actions', () => {
    it('should find notes by folder and folio id', () => {
      const folio = createMockFolio({
        id: '1',
        name: 'Test Folio',
        ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      });

      const clh0e8r5k0000jw0c8y5d6not1 = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not1',
        title: 'Note 1',
        folioId: '1',
        folderId: null,
      });

      const clh0e8r5k0000jw0c8y5d6not2 = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not2',
        title: 'Note 2',
        folioId: '1',
        folderId: null,
      });

      const { setFolios, setNotes, getNotesByFolder } = useFoliosStore.getState();
      setFolios([folio]);
      setNotes([clh0e8r5k0000jw0c8y5d6not1, clh0e8r5k0000jw0c8y5d6not2]);

      // getNotesByFolder filters by BOTH folderId and folioId
      const notes = getNotesByFolder(null, '1');
      expect(notes).toHaveLength(2);
    });

    it('should find all folders with folio id', () => {
      const clh0e8r5k0000jw0c8y5d6fld1 = createMockFolder({
        id: 'clh0e8r5k0000jw0c8y5d6fld1',
        name: 'Folder 1',
        folioId: '1',
        parentId: null,
      });

      const clh0e8r5k0000jw0c8y5d6fld2 = createMockFolder({
        id: 'clh0e8r5k0000jw0c8y5d6fld2',
        name: 'Folder 2',
        folioId: '1',
        parentId: null,
      });

      const { setFolders, getFoldersByFolio } = useFoliosStore.getState();
      setFolders([clh0e8r5k0000jw0c8y5d6fld1, clh0e8r5k0000jw0c8y5d6fld2]);

      const folders = getFoldersByFolio('1');
      expect(folders).toHaveLength(2);
    });

    it('should find all notes with folder id', () => {
      const clh0e8r5k0000jw0c8y5d6not1 = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not1',
        title: 'Note 1',
        folioId: '1',
        folderId: 'clh0e8r5k0000jw0c8y5d6fld1',
      });

      const clh0e8r5k0000jw0c8y5d6not2 = createMockNote({
        id: 'clh0e8r5k0000jw0c8y5d6not2',
        title: 'Note 2',
        folioId: '1',
        folderId: 'clh0e8r5k0000jw0c8y5d6fld1',
      });

      const { setNotes, getNotesByFolder } = useFoliosStore.getState();
      setNotes([clh0e8r5k0000jw0c8y5d6not1, clh0e8r5k0000jw0c8y5d6not2]);

      const notes = getNotesByFolder('clh0e8r5k0000jw0c8y5d6fld1', '1');
      expect(notes).toHaveLength(2);
    });
  });
});