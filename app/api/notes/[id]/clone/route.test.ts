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

describe('POST /api/notes/[id]/clone', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'user@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if note does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found');
  });

  it('should allow owner to clone their own note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      folderId: null,
      folioId: 'folio-1',
      folio: {
        ownerId: 'user-1', // User is owner
      },
      published: null,
    } as any);

    prismaMock.folio.findFirst.mockResolvedValue({
      id: 'folio-1',
      ownerId: 'user-1',
    } as any);

    prismaMock.note.findFirst.mockResolvedValue(null); // No duplicate title

    prismaMock.note.create.mockResolvedValue({
      id: 'note-2',
      title: 'Test Note (Copy)',
      content: 'Test content',
      folderId: null,
      folioId: 'folio-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.noteId).toBe('note-2');
    expect(data.data.title).toBe('Test Note (Copy)');
    expect(data.data.redirectUrl).toBe('/editor/note-2');

    expect(prismaMock.note.create).toHaveBeenCalledWith({
      data: {
        title: 'Test Note (Copy)',
        content: 'Test content',
        folioId: 'folio-1',
        folderId: null,
      },
    });
  });

  it('should allow collaborator to clone note they have access to', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Shared Note',
      content: 'Shared content',
      folderId: null,
      folioId: 'folio-other',
      folio: {
        ownerId: 'different-user', // User is NOT owner
      },
      published: {
        id: 'page-1',
        isPublished: true,
      },
    } as any);

    // User IS a collaborator
    prismaMock.pageCollaborator.findFirst.mockResolvedValue({
      pageId: 'page-1',
      userId: 'user-1',
      role: 'viewer',
    } as any);

    prismaMock.folio.findFirst.mockResolvedValue({
      id: 'folio-1',
      ownerId: 'user-1',
    } as any);

    prismaMock.note.findFirst.mockResolvedValue(null);

    prismaMock.note.create.mockResolvedValue({
      id: 'note-2',
      title: 'Shared Note (Copy)',
      content: 'Shared content',
      folderId: null,
      folioId: 'folio-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.title).toBe('Shared Note (Copy)');
  });

  it('should return 403 if user is not owner and not a collaborator', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Private Note',
      content: 'Private content',
      folioId: 'folio-other',
      folio: {
        ownerId: 'different-user', // User is NOT owner
      },
      published: {
        id: 'page-1',
        isPublished: true,
      },
    } as any);

    // User is NOT a collaborator
    prismaMock.pageCollaborator.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('You do not have access to clone this page');
  });

  it('should return 403 if note is not published and user is not owner', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Unpublished Note',
      content: 'Unpublished content',
      folioId: 'folio-other',
      folio: {
        ownerId: 'different-user', // User is NOT owner
      },
      published: null, // Not published
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('You do not have access to clone this page');
  });

  it('should return 404 if user has no folio', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      folioId: 'folio-1',
      folio: {
        ownerId: 'user-1',
      },
      published: null,
    } as any);

    prismaMock.folio.findFirst.mockResolvedValue(null); // No folio for user

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('No folio found for user');
  });

  it('should clone to specified target folder', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      folderId: 'folder-1',
      folioId: 'folio-1',
      folio: {
        ownerId: 'user-1',
      },
      published: null,
    } as any);

    prismaMock.folio.findFirst.mockResolvedValue({
      id: 'folio-1',
      ownerId: 'user-1',
    } as any);

    prismaMock.note.findFirst.mockResolvedValue(null);

    prismaMock.note.create.mockResolvedValue({
      id: 'note-2',
      title: 'Test Note (Copy)',
      content: 'Test content',
      folderId: 'folder-2',
      folioId: 'folio-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({ targetFolderId: 'folder-2' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.title).toBe('Test Note (Copy)');

    expect(prismaMock.note.create).toHaveBeenCalledWith({
      data: {
        title: 'Test Note (Copy)',
        content: 'Test content',
        folioId: 'folio-1',
        folderId: 'folder-2',
      },
    });
  });

  it('should handle duplicate title by appending (Copy 2)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      folderId: null,
      folioId: 'folio-1',
      folio: {
        ownerId: 'user-1',
      },
      published: null,
    } as any);

    prismaMock.folio.findFirst.mockResolvedValue({
      id: 'folio-1',
      ownerId: 'user-1',
    } as any);

    // "Test Note (Copy)" already exists
    prismaMock.note.findFirst
      .mockResolvedValueOnce({ id: 'existing', title: 'Test Note (Copy)' } as any)
      .mockResolvedValueOnce(null); // "Test Note (Copy 2)" doesn't exist

    prismaMock.note.create.mockResolvedValue({
      id: 'note-2',
      title: 'Test Note (Copy 2)',
      content: 'Test content',
      folderId: null,
      folioId: 'folio-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.title).toBe('Test Note (Copy 2)');
  });

  it('should find next available Copy number', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      folderId: null,
      folioId: 'folio-1',
      folio: {
        ownerId: 'user-1',
      },
      published: null,
    } as any);

    prismaMock.folio.findFirst.mockResolvedValue({
      id: 'folio-1',
      ownerId: 'user-1',
    } as any);

    // Mock multiple duplicates exist
    prismaMock.note.findFirst
      .mockResolvedValueOnce({ id: 'dup1', title: 'Test Note (Copy)' } as any)
      .mockResolvedValueOnce({ id: 'dup2', title: 'Test Note (Copy 2)' } as any)
      .mockResolvedValueOnce({ id: 'dup3', title: 'Test Note (Copy 3)' } as any)
      .mockResolvedValueOnce(null); // (Copy 4) doesn't exist

    prismaMock.note.create.mockResolvedValue({
      id: 'note-2',
      title: 'Test Note (Copy 4)',
      content: 'Test content',
      folderId: null,
      folioId: 'folio-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.title).toBe('Test Note (Copy 4)');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/clone', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
