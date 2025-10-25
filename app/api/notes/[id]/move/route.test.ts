import { NextRequest } from 'next/server';
import { POST } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/api/csrf-validation', () => ({
  withCsrfProtection: (handler: Function) => handler,
}));

import { auth } from '@/lib/auth';

describe('POST /api/notes/[id]/move', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'folder-1' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if note does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'folder-1' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found');
  });

  it('should return 403 if user does not own note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folioId: 'folio-1',
      folio: {
        id: 'folio-1',
        ownerId: 'different-user',
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'folder-1' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Access denied');
  });

  it('should return 404 if target folder does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folioId: 'folio-1',
      folio: {
        id: 'folio-1',
        ownerId: 'user-1',
      },
    } as any);

    prismaMock.folder.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'non-existent-folder' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Target folder not found');
  });

  it('should return 400 if folder belongs to different folio', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folioId: 'folio-1',
      folio: {
        id: 'folio-1',
        ownerId: 'user-1',
      },
    } as any);

    prismaMock.folder.findUnique.mockResolvedValue({
      id: 'folder-1',
      name: 'Target Folder',
      folioId: 'different-folio',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'folder-1' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Cannot move note to folder in different folio');
  });

  it('should successfully move note to folder without duplicates', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folioId: 'folio-1',
      folio: {
        id: 'folio-1',
        ownerId: 'user-1',
      },
    } as any);

    prismaMock.folder.findUnique.mockResolvedValue({
      id: 'folder-1',
      name: 'Target Folder',
      folioId: 'folio-1',
    } as any);

    prismaMock.note.findMany.mockResolvedValue([]); // No duplicates

    prismaMock.note.update.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folderId: 'folder-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'folder-1' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Note moved successfully');
    expect(data.data.folderId).toBe('folder-1');
    expect(data.data.title).toBe('Test Note');

    expect(prismaMock.note.update).toHaveBeenCalledWith({
      where: { id: 'note-1' },
      data: {
        folderId: 'folder-1',
        title: 'Test Note',
      },
    });
  });

  it('should move note to root (null folderId)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folioId: 'folio-1',
      folio: {
        id: 'folio-1',
        ownerId: 'user-1',
      },
    } as any);

    prismaMock.note.findMany.mockResolvedValue([]); // No duplicates in root

    prismaMock.note.update.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folderId: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: null }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.folderId).toBeNull();

    expect(prismaMock.note.update).toHaveBeenCalledWith({
      where: { id: 'note-1' },
      data: {
        folderId: null,
        title: 'Test Note',
      },
    });
  });

  it('should rename note if duplicate exists (first duplicate)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folioId: 'folio-1',
      folio: {
        id: 'folio-1',
        ownerId: 'user-1',
      },
    } as any);

    prismaMock.folder.findUnique.mockResolvedValue({
      id: 'folder-1',
      name: 'Target Folder',
      folioId: 'folio-1',
    } as any);

    // findMany returns 1 duplicate with same title
    prismaMock.note.findMany.mockResolvedValue([
      {
        id: 'note-2',
        title: 'Test Note',
        folderId: 'folder-1',
      },
    ] as any);

    // findFirst returns null (no "Test Note (2)" exists)
    prismaMock.note.findFirst.mockResolvedValue(null);

    prismaMock.note.update.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note (2)',
      folderId: 'folder-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'folder-1' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.title).toBe('Test Note (2)');

    expect(prismaMock.note.update).toHaveBeenCalledWith({
      where: { id: 'note-1' },
      data: {
        folderId: 'folder-1',
        title: 'Test Note (2)',
      },
    });
  });

  it('should find next available duplicate number', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folioId: 'folio-1',
      folio: {
        id: 'folio-1',
        ownerId: 'user-1',
      },
    } as any);

    prismaMock.folder.findUnique.mockResolvedValue({
      id: 'folder-1',
      name: 'Target Folder',
      folioId: 'folio-1',
    } as any);

    // Multiple duplicates exist
    prismaMock.note.findMany.mockResolvedValue([
      { id: 'note-2', title: 'Test Note' },
    ] as any);

    // Mock findFirst to simulate "Test Note (2)" and "Test Note (3)" already exist
    prismaMock.note.findFirst
      .mockResolvedValueOnce({ id: 'note-3', title: 'Test Note (2)' } as any) // (2) exists
      .mockResolvedValueOnce({ id: 'note-4', title: 'Test Note (3)' } as any) // (3) exists
      .mockResolvedValueOnce(null); // (4) doesn't exist

    prismaMock.note.update.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note (4)',
      folderId: 'folder-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'folder-1' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.title).toBe('Test Note (4)');
  });

  it('should return 400 for invalid folderId format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 123 }), // Number instead of string/null
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/move', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'folder-1' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to move note');
  });
});
