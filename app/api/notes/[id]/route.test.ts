import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';
import { createMockPrismaNote } from '@/__tests__/utils/test-data';
import { expectApiResponse } from '@/__tests__/utils/test-helpers';

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock validation module
jest.mock('@/lib/validation/name-validation', () => ({
  validateFileName: jest.fn((name: string, existingNames: string[]) => ({
    valid: !existingNames.includes(name),
    error: existingNames.includes(name) ? 'Name already exists' : undefined,
  })),
}));

import { auth } from '@/lib/auth';
import { validateFileName } from '@/lib/validation/name-validation';

describe('GET /api/notes/[id]', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return note if user owns it', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: 'clh0e8r5k0000jw0c8y5d6not1',
      title: 'Test Note',
      content: { type: 'doc', content: [] },
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      folio: { id: 'clh0e8r5k0000jw0c8y5d6fol1', name: 'Test Folio' },
      folder: null,
    };

    prismaMock.note.findFirst.mockResolvedValue(mockNote);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expectApiResponse(data.data, mockNote);
    expect(prismaMock.note.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'clh0e8r5k0000jw0c8y5d6not1',
        folio: {
          ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
        },
      },
      include: {
        folio: {
          select: {
            id: true,
            name: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  it('should return 404 if note not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/notes/nonexistent'
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found or access denied');
  });

  it('should return 404 if user does not own note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not2');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not2' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found or access denied');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findFirst.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch note');
  });
});

describe('PATCH /api/notes/[id]', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated Title' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should update note title successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingNote = {
      id: 'clh0e8r5k0000jw0c8y5d6not1',
      title: 'Old Title',
      content: { type: 'doc', content: [] },
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedNote = {
      ...existingNote,
      title: 'Updated Title',
      updatedAt: new Date(),
    };

    prismaMock.note.findFirst.mockResolvedValue(existingNote);
    prismaMock.note.findMany.mockResolvedValue([]);
    prismaMock.note.update.mockResolvedValue(updatedNote);
    (validateFileName as jest.Mock).mockReturnValue({ valid: true });

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated Title' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.title).toBe('Updated Title');
    expect(prismaMock.note.update).toHaveBeenCalledWith({
      where: { id: 'clh0e8r5k0000jw0c8y5d6not1' },
      data: { title: 'Updated Title' },
    });
  });

  it('should update note content successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingNote = {
      id: 'clh0e8r5k0000jw0c8y5d6not1',
      title: 'Test Note',
      content: { type: 'doc', content: [] },
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    };

    const updatedNote = {
      ...existingNote,
      content: newContent,
      updatedAt: new Date(),
    };

    prismaMock.note.findFirst.mockResolvedValue(existingNote);
    prismaMock.note.update.mockResolvedValue(updatedNote);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'PATCH',
      body: JSON.stringify({ content: newContent }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.content).toEqual(newContent);
    expect(prismaMock.note.update).toHaveBeenCalledWith({
      where: { id: 'clh0e8r5k0000jw0c8y5d6not1' },
      data: { content: newContent },
    });
  });

  it('should update both title and content', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingNote = {
      id: 'clh0e8r5k0000jw0c8y5d6not1',
      title: 'Old Title',
      content: { type: 'doc', content: [] },
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'New content' }],
        },
      ],
    };

    const updatedNote = {
      ...existingNote,
      title: 'New Title',
      content: newContent,
      updatedAt: new Date(),
    };

    prismaMock.note.findFirst.mockResolvedValue(existingNote);
    prismaMock.note.findMany.mockResolvedValue([]);
    prismaMock.note.update.mockResolvedValue(updatedNote);
    (validateFileName as jest.Mock).mockReturnValue({ valid: true });

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title', content: newContent }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.title).toBe('New Title');
    expect(data.data.content).toEqual(newContent);
  });

  it('should return 404 if note not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/notes/nonexistent',
      {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found or access denied');
  });

  it('should return 400 if title validation fails', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingNote = {
      id: 'clh0e8r5k0000jw0c8y5d6not1',
      title: 'Old Title',
      content: { type: 'doc', content: [] },
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.note.findFirst.mockResolvedValue(existingNote);
    prismaMock.note.findMany.mockResolvedValue([createMockPrismaNote({ title: 'Duplicate Title' })]);
    (validateFileName as jest.Mock).mockReturnValue({
      valid: false,
      error: 'Name already exists',
    });

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Duplicate Title' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Name already exists');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findFirst.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated Title' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to update note');
  });

  it('should return 400 for invalid input', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'PATCH',
      body: JSON.stringify({ title: '' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });
});

describe('DELETE /api/notes/[id]', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should delete note successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingNote = {
      id: 'clh0e8r5k0000jw0c8y5d6not1',
      title: 'Test Note',
      content: { type: 'doc', content: [] },
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.note.findFirst.mockResolvedValue(existingNote);
    prismaMock.note.delete.mockResolvedValue(existingNote);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Note deleted successfully');
    expect(prismaMock.note.delete).toHaveBeenCalledWith({
      where: { id: 'clh0e8r5k0000jw0c8y5d6not1' },
    });
  });

  it('should return 404 if note not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/notes/nonexistent',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found or access denied');
  });

  it('should return 404 if user does not own note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not2' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found or access denied');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingNote = {
      id: 'clh0e8r5k0000jw0c8y5d6not1',
      title: 'Test Note',
      content: { type: 'doc', content: [] },
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.note.findFirst.mockResolvedValue(existingNote);
    prismaMock.note.delete.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/notes/clh0e8r5k0000jw0c8y5d6not1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6not1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete note');
  });
});
