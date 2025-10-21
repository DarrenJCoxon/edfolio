import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';
import { expectApiResponse } from '@/__tests__/utils/test-helpers';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';

const mockSession = {
  user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe('GET /api/folders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folders?folioId=clh0e8r5k0000jw0c8y5d6fol1'
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if folioId is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/folders');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('folioId is required');
  });

  it('should return 404 if folio not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folders?folioId=nonexistent'
    );
    const response = await GET(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folio not found');
  });

  it('should return folders for folio', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Test Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockFolders = [
      {
        id: 'clh0e8r5k0000jw0c8y5d6fld1',
        name: 'Folder A',
        folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'clh0e8r5k0000jw0c8y5d6fld2',
        name: 'Folder B',
        folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.folder.findMany.mockResolvedValue(mockFolders);

    const request = new NextRequest(
      'http://localhost:3000/api/folders?folioId=clh0e8r5k0000jw0c8y5d6fol1'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expectApiResponse(data.data, mockFolders);
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3000/api/folders?folioId=clh0e8r5k0000jw0c8y5d6fol1'
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch folders');
  });
});

describe('POST /api/folders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Folder', folioId: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should create folder successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Test Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockFolder = {
      id: 'clh0e8r5k0000jw0c8y5d6fld1',
      name: 'New Folder',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.folder.findFirst.mockResolvedValue(null);
    prismaMock.folder.create.mockResolvedValue(mockFolder);

    const request = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Folder', folioId: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expectApiResponse(data.data, mockFolder);
  });

  it('should create nested folder with parentId', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Test Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockParentFolder = {
      id: 'clh0e8r5k0000jw0c8y5parent',
      name: 'Parent',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockFolder = {
      id: 'clh0e8r5k0000jw0c8y5d6fld1',
      name: 'Child Folder',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: 'clh0e8r5k0000jw0c8y5parent',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.folder.findFirst.mockResolvedValueOnce(mockParentFolder);
    prismaMock.folder.findMany.mockResolvedValue([]); // No existing folders with the same name
    prismaMock.folder.create.mockResolvedValue(mockFolder);

    const request = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Child Folder',
        folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
        parentId: 'clh0e8r5k0000jw0c8y5parent',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.parentId).toBe('clh0e8r5k0000jw0c8y5parent');
  });

  it('should return 404 if folio not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockResolvedValue(null);
    prismaMock.folder.findMany.mockResolvedValue([]); // Mock for name validation

    const request = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Folder',
        folioId: 'clh0e8r5k0000jw0c8nonexist' // Valid CUID format but doesn't exist
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folio not found');
  });

  it('should return 404 if clh0e8r5k0000jw0c8y5parent folder not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Test Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.folder.findFirst.mockResolvedValue(null);
    prismaMock.folder.findMany.mockResolvedValue([]); // Mock for name validation

    const request = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Folder',
        folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
        parentId: 'clh0e8r5k0000jw0cnonexist', // Valid CUID format but doesn't exist
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Parent folder not found');
  });

  it('should return 400 if folder name already exists in same location', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Test Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingFolder = {
      id: 'existing-folder',
      name: 'Duplicate',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(mockFolio);
    prismaMock.folder.findFirst.mockResolvedValue(existingFolder);

    const request = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'Duplicate', folioId: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      'A folder with this name already exists in this location'
    );
  });

  it('should return 400 for invalid input', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: '', folioId: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Folder', folioId: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to create folder');
  });
});
