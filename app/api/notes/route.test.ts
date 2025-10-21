import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';
import { TEST_IDS } from '@/__tests__/utils/test-data';
import { expectApiResponse } from '@/__tests__/utils/test-helpers';

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';

describe('GET /api/notes', () => {
  const mockSession = {
    user: { id: TEST_IDS.user1, email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return notes filtered by folioId', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNotes = [
      {
        id: TEST_IDS.note1,
        title: 'Note 1',
        content: { type: 'doc', content: [] },
        folioId: TEST_IDS.folio1,
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        folio: { id: TEST_IDS.folio1, name: 'Test Folio' },
        folder: null,
      },
    ];

    prismaMock.note.findMany.mockResolvedValue(mockNotes);

    const request = new NextRequest(
      `http://localhost:3000/api/notes?folioId=${TEST_IDS.folio1}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expectApiResponse(data.data, mockNotes);
    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      where: {
        folio: {
          ownerId: TEST_IDS.user1,
        },
        folioId: TEST_IDS.folio1,
      },
      orderBy: {
        updatedAt: 'desc',
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

  it('should return notes filtered by folioId and folderId', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNotes = [
      {
        id: TEST_IDS.note1,
        title: 'Note in Folder',
        content: { type: 'doc', content: [] },
        folioId: TEST_IDS.folio1,
        folderId: TEST_IDS.folder1,
        createdAt: new Date(),
        updatedAt: new Date(),
        folio: { id: TEST_IDS.folio1, name: 'Test Folio' },
        folder: { id: TEST_IDS.folder1, name: 'Test Folder' },
      },
    ];

    prismaMock.note.findMany.mockResolvedValue(mockNotes);

    const request = new NextRequest(
      `http://localhost:3000/api/notes?folioId=${TEST_IDS.folio1}&folderId=${TEST_IDS.folder1}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expectApiResponse(data.data, mockNotes);
    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      where: {
        folio: {
          ownerId: TEST_IDS.user1,
        },
        folioId: TEST_IDS.folio1,
        folderId: TEST_IDS.folder1,
      },
      orderBy: {
        updatedAt: 'desc',
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

  it('should return all notes if no filters provided', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNotes = [
      {
        id: TEST_IDS.note1,
        title: 'Note 1',
        content: { type: 'doc', content: [] },
        folioId: TEST_IDS.folio1,
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        folio: { id: TEST_IDS.folio1, name: 'Test Folio' },
        folder: null,
      },
      {
        id: TEST_IDS.note2,
        title: 'Note 2',
        content: { type: 'doc', content: [] },
        folioId: TEST_IDS.folio2,
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        folio: { id: TEST_IDS.folio2, name: 'Another Folio' },
        folder: null,
      },
    ];

    prismaMock.note.findMany.mockResolvedValue(mockNotes);

    const request = new NextRequest('http://localhost:3000/api/notes');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expectApiResponse(data.data, mockNotes);
    expect(prismaMock.note.findMany).toHaveBeenCalledWith({
      where: {
        folio: {
          ownerId: TEST_IDS.user1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
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

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/notes');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch notes');
  });
});

describe('POST /api/notes', () => {
  const mockSession = {
    user: { id: TEST_IDS.user1, email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Note',
        folioId: TEST_IDS.folio1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should create a note successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: TEST_IDS.folio1,
      name: 'Test Folio',
      ownerId: TEST_IDS.user1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockNote = {
      id: TEST_IDS.note1,
      title: 'New Note',
      content: { type: 'doc', content: [] },
      folioId: TEST_IDS.folio1,
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.note.create.mockResolvedValue(mockNote);

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Note',
        folioId: TEST_IDS.folio1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expectApiResponse(data.data, mockNote);
    expect(prismaMock.folio.findFirst).toHaveBeenCalledWith({
      where: {
        id: TEST_IDS.folio1,
        ownerId: TEST_IDS.user1,
      },
    });
  });

  it('should create a note with folderId', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: TEST_IDS.folio1,
      name: 'Test Folio',
      ownerId: TEST_IDS.user1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockFolder = {
      id: TEST_IDS.folder1,
      name: 'Test Folder',
      folioId: TEST_IDS.folio1,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockNote = {
      id: TEST_IDS.note1,
      title: 'New Note',
      content: { type: 'doc', content: [] },
      folioId: TEST_IDS.folio1,
      folderId: TEST_IDS.folder1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.folder.findFirst.mockResolvedValue(mockFolder);
    prismaMock.note.create.mockResolvedValue(mockNote);

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Note',
        folioId: TEST_IDS.folio1,
        folderId: TEST_IDS.folder1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expectApiResponse(data.data, mockNote);
  });

  it('should use default title if not provided', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: TEST_IDS.folio1,
      name: 'Test Folio',
      ownerId: TEST_IDS.user1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockNote = {
      id: TEST_IDS.note1,
      title: 'Untitled',
      content: { type: 'doc', content: [] },
      folioId: TEST_IDS.folio1,
      folderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.note.create.mockResolvedValue(mockNote);

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        folioId: TEST_IDS.folio1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.title).toBe('Untitled');
  });

  it('should return 404 if folio not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Note',
        folioId: TEST_IDS.folio1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folio not found or access denied');
  });

  it('should return 404 if folder not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: TEST_IDS.folio1,
      name: 'Test Folio',
      ownerId: TEST_IDS.user1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.folder.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Note',
        folioId: TEST_IDS.folio1,
        folderId: TEST_IDS.folder1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folder not found or access denied');
  });

  it('should return 400 for invalid input (missing folioId)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Note',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
    expect(data.details).toBeDefined();
  });

  it('should return 400 for invalid folioId format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Note',
        folioId: 'invalid-id', // Not a valid CUID
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
    expect(data.details).toBeDefined();
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: TEST_IDS.folio1,
      name: 'Test Folio',
      ownerId: TEST_IDS.user1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.note.create.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Note',
        folioId: TEST_IDS.folio1,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to create note');
  });
});