import type { User, Folio as PrismaFolio, Folder as PrismaFolder, Note as PrismaNote } from '@prisma/client';
import type { Folio, Folder, Note } from '@/types';

// Valid CUID-like IDs for testing (match the format expected by Zod validation)
export const TEST_IDS = {
  user1: 'clh0e8r5k0000jw0c8y5d6usr1',
  user2: 'clh0e8r5k0000jw0c8y5d6usr2',
  folio1: 'clh0e8r5k0000jw0c8y5d6fol1',
  folio2: 'clh0e8r5k0000jw0c8y5d6fol2',
  folder1: 'clh0e8r5k0000jw0c8y5d6fld1',
  folder2: 'clh0e8r5k0000jw0c8y5d6fld2',
  note1: 'clh0e8r5k0000jw0c8y5d6not1',
  note2: 'clh0e8r5k0000jw0c8y5d6not2',
};

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: TEST_IDS.user1,
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
    password: 'hashed_password',
    image: null,
    themePreference: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockFolio(overrides?: Partial<Folio>): Folio {
  return {
    id: TEST_IDS.folio1,
    name: 'Test Folio',
    ownerId: TEST_IDS.user1,
    folders: [],
    notes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockPrismaFolio(overrides?: Partial<PrismaFolio>): PrismaFolio {
  return {
    id: TEST_IDS.folio1,
    name: 'Test Folio',
    ownerId: TEST_IDS.user1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockFolder(overrides?: Partial<Folder>): Folder {
  return {
    id: TEST_IDS.folder1,
    name: 'Test Folder',
    folioId: TEST_IDS.folio1,
    parentId: null,
    children: [],
    notes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockPrismaFolder(overrides?: Partial<PrismaFolder>): PrismaFolder {
  return {
    id: TEST_IDS.folder1,
    name: 'Test Folder',
    folioId: TEST_IDS.folio1,
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockNote(overrides?: Partial<Note>): Note {
  return {
    id: TEST_IDS.note1,
    title: 'Test Note',
    content: { type: 'doc', content: [] },
    folioId: TEST_IDS.folio1,
    folderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockPrismaNote(overrides?: Partial<PrismaNote>): PrismaNote {
  return {
    id: TEST_IDS.note1,
    title: 'Test Note',
    content: { type: 'doc', content: [] },
    folioId: TEST_IDS.folio1,
    folderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}