import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';
import { createMockPrismaFolder } from '@/__tests__/utils/test-data';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/validation/name-validation', () => ({
  validateFolderName: jest.fn((name: string, existingNames: string[]) => ({
    valid: !existingNames.includes(name),
    error: existingNames.includes(name) ? 'Name already exists' : undefined,
  })),
}));

import { auth } from '@/lib/auth';
import { validateFolderName } from '@/lib/validation/name-validation';

const mockSession = {
  user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe('PATCH /api/folders/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should update folder successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolder = {
      id: 'clh0e8r5k0000jw0c8y5d6fld1',
      name: 'Old Name',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedFolder = {
      ...existingFolder,
      name: 'Updated Name',
      updatedAt: new Date(),
    };

    prismaMock.folder.findFirst.mockResolvedValue(existingFolder);
    prismaMock.folder.findMany.mockResolvedValue([]);
    prismaMock.folder.update.mockResolvedValue(updatedFolder);
    (validateFolderName as jest.Mock).mockReturnValue({ valid: true });

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.name).toBe('Updated Name');
  });

  it('should return 404 if folder not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folders/nonexistent',
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
    expect(data.error).toBe('Folder not found');
  });

  it('should return 400 if name validation fails', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolder = {
      id: 'clh0e8r5k0000jw0c8y5d6fld1',
      name: 'Old Name',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folder.findFirst.mockResolvedValue(existingFolder);
    prismaMock.folder.findMany.mockResolvedValue([createMockPrismaFolder({ name: 'Duplicate' })]);
    (validateFolderName as jest.Mock).mockReturnValue({
      valid: false,
      error: 'Name already exists',
    });

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Duplicate' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Name already exists');
  });

  it('should return 400 for invalid input', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    // The API first checks if folder exists, so we need to mock that
    const existingFolder = {
      id: 'clh0e8r5k0000jw0c8y5d6fld1',
      name: 'Old Name',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.folder.findFirst.mockResolvedValue(existingFolder);

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: '' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to update folder');
  });
});

describe('DELETE /api/folders/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should delete folder successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolder = {
      id: 'clh0e8r5k0000jw0c8y5d6fld1',
      name: 'Test Folder',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        children: 0,
        notes: 0,
      },
    };

    prismaMock.folder.findFirst.mockResolvedValue(existingFolder);
    prismaMock.folder.delete.mockResolvedValue(existingFolder);

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.success).toBe(true);
    expect(data.message).toBe('Folder deleted successfully');
  });

  it('should delete folder with children and notes (cascade)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolder = {
      id: 'clh0e8r5k0000jw0c8y5d6fld1',
      name: 'Parent Folder',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        children: 2,
        notes: 5,
      },
    };

    prismaMock.folder.findFirst.mockResolvedValue(existingFolder);
    prismaMock.folder.delete.mockResolvedValue(existingFolder);

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.folder.delete).toHaveBeenCalledWith({
      where: { id: 'clh0e8r5k0000jw0c8y5d6fld1' },
    });
  });

  it('should return 404 if folder not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/folders/nonexistent',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folder not found');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const existingFolder = {
      id: 'clh0e8r5k0000jw0c8y5d6fld1',
      name: 'Test Folder',
      folioId: 'clh0e8r5k0000jw0c8y5d6fol1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        children: 0,
        notes: 0,
      },
    };

    prismaMock.folder.findFirst.mockResolvedValue(existingFolder);
    prismaMock.folder.delete.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3000/api/folders/clh0e8r5k0000jw0c8y5d6fld1',
      {
        method: 'DELETE',
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'clh0e8r5k0000jw0c8y5d6fld1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete folder');
  });
});
