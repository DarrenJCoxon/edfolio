import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';

describe('PATCH /api/folios/[id]', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should update folio successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Old Name',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedFolio = {
      ...existingFolio,
      name: 'Updated Name',
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValueOnce(existingFolio);
    prismaMock.folio.findFirst.mockResolvedValueOnce(null);
    prismaMock.folio.update.mockResolvedValue(updatedFolio);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.name).toBe('Updated Name');
    expect(prismaMock.folio.update).toHaveBeenCalledWith({
      where: { id: 'clh0e8r5k0000jw0c8y5d6fol1' },
      data: { name: 'Updated Name' },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('should return 404 if folio not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/nonexistent',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folio not found');
  });

  it('should return 404 if user does not own folio', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol2',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol2' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folio not found');
  });

  it('should return 400 if new name already exists', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Old Name',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicateFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol2',
      name: 'Duplicate Name',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValueOnce(existingFolio);
    prismaMock.folio.findFirst.mockResolvedValueOnce(duplicateFolio);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Duplicate Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('A folio with this name already exists');
  });

  it('should return 400 for invalid input', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    // The API first checks if folio exists, so we need to mock that
    const existingFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Old Name',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folio.findFirst.mockResolvedValue(existingFolio);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: '' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to update folio');
  });
});

describe('DELETE /api/folios/[id]', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should delete folio successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Test Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        folders: 2,
        notes: 5,
      },
    };

    prismaMock.folio.findFirst.mockResolvedValue(existingFolio);
    prismaMock.folio.count.mockResolvedValue(2);
    prismaMock.folio.delete.mockResolvedValue(existingFolio);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.success).toBe(true);
    expect(data.message).toBe('Folio deleted successfully');
    expect(prismaMock.folio.delete).toHaveBeenCalledWith({
      where: { id: 'clh0e8r5k0000jw0c8y5d6fol1' },
    });
  });

  it('should return 404 if folio not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/nonexistent',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folio not found');
  });

  it('should return 400 if attempting to delete last folio', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'Last Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        folders: 0,
        notes: 0,
      },
    };

    prismaMock.folio.findFirst.mockResolvedValue(existingFolio);
    prismaMock.folio.count.mockResolvedValue(1);

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Cannot delete your last folio');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folio.findFirst.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3000/api/folios/clh0e8r5k0000jw0c8y5d6fol1',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fol1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete folio');
  });
});
