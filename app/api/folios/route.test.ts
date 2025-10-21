import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';
import { expectApiResponse } from '@/__tests__/utils/test-helpers';

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';

describe('GET /api/folios', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folios');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return user folios', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolios = [
      {
        id: 'clh0e8r5k0000jw0c8y5d6fol1',
        name: 'Work',
        ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'clh0e8r5k0000jw0c8y5d6fol2',
        name: 'Personal',
        ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    prismaMock.folio.findMany.mockResolvedValue(mockFolios);

    const request = new NextRequest('http://localhost:3000/api/folios');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expectApiResponse(data.data, mockFolios);
    expect(prismaMock.folio.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  });

  it('should return empty array if user has no folios', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/folios');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/folios');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch folios');
  });
});

describe('POST /api/folios', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folios', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Folio' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should create folio successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'New Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(null);
    prismaMock.folio.create.mockResolvedValue(mockFolio);

    const request = new NextRequest('http://localhost:3000/api/folios', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Folio' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expectApiResponse(data.data, mockFolio);
    expect(prismaMock.folio.create).toHaveBeenCalledWith({
      data: {
        name: 'New Folio',
        ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('should return 400 if folio name already exists', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Duplicate Name',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(existingFolio);

    const request = new NextRequest('http://localhost:3000/api/folios', {
      method: 'POST',
      body: JSON.stringify({ name: 'Duplicate Name' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('A folio with this name already exists');
  });

  it('should return 400 for empty name', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/folios', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
    expect(data.details).toBeDefined();
  });

  it('should return 400 for name exceeding max length', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const longName = 'a'.repeat(101);

    const request = new NextRequest('http://localhost:3000/api/folios', {
      method: 'POST',
      body: JSON.stringify({ name: longName }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should return 400 for missing name', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/folios', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/folios', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Folio' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to create folio');
  });
});
