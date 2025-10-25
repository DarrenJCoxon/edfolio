import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/validation/name-validation', () => ({
  validateFolderName: jest.fn(),
}));

jest.mock('@/lib/api/csrf-validation', () => ({
  withCsrfProtection: (handler: Function) => handler,
}));

import { auth } from '@/lib/auth';
import { validateFolderName } from '@/lib/validation/name-validation';

describe('PATCH /api/folders/[id]', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if folder does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.folder.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folder not found');
  });

  it('should return 404 if user does not own folder', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    // findFirst with ownership filter returns null
    prismaMock.folder.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folder not found');
  });

  it('should return 400 if name is empty', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should return 400 if name exceeds 255 characters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const longName = 'a'.repeat(256);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: longName }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should successfully update folder name without validation if name unchanged', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockResolvedValue({
      id: 'folder-1',
      name: 'Projects',
      folioId: 'folio-1',
      parentId: null,
    } as any);

    prismaMock.folder.update.mockResolvedValue({
      id: 'folder-1',
      name: 'Projects',
      folioId: 'folio-1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Projects' }), // Same name
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.name).toBe('Projects');

    // Validation should not be called if name unchanged
    expect(validateFolderName).not.toHaveBeenCalled();
  });

  it('should validate and update folder name if changed', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockResolvedValue({
      id: 'folder-1',
      name: 'Old Name',
      folioId: 'folio-1',
      parentId: null,
    } as any);

    prismaMock.folder.findMany.mockResolvedValue([
      { name: 'Existing Folder' },
    ] as any);

    (validateFolderName as jest.Mock).mockReturnValue({ valid: true });

    prismaMock.folder.update.mockResolvedValue({
      id: 'folder-1',
      name: 'New Name',
      folioId: 'folio-1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.name).toBe('New Name');

    expect(validateFolderName).toHaveBeenCalledWith('New Name', ['Existing Folder']);
  });

  it('should return 400 if name validation fails', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockResolvedValue({
      id: 'folder-1',
      name: 'Old Name',
      folioId: 'folio-1',
      parentId: null,
    } as any);

    prismaMock.folder.findMany.mockResolvedValue([
      { name: 'Conflicting Name' },
    ] as any);

    (validateFolderName as jest.Mock).mockReturnValue({
      valid: false,
      error: 'Folder name already exists',
    });

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Conflicting Name' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Folder name already exists');
  });

  it('should trim whitespace from name', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockResolvedValue({
      id: 'folder-1',
      name: 'Old Name',
      folioId: 'folio-1',
      parentId: null,
    } as any);

    prismaMock.folder.findMany.mockResolvedValue([]);

    (validateFolderName as jest.Mock).mockReturnValue({ valid: true });

    prismaMock.folder.update.mockResolvedValue({
      id: 'folder-1',
      name: 'Trimmed Name',
      folioId: 'folio-1',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '  Trimmed Name  ' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(200);

    expect(prismaMock.folder.update).toHaveBeenCalledWith({
      where: { id: 'folder-1' },
      data: { name: 'Trimmed Name' },
      select: expect.any(Object),
    });
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to update folder');
  });
});

describe('DELETE /api/folders/[id]', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if folder does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.folder.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folder not found');
  });

  it('should return 404 if user does not own folder', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    // findFirst with ownership filter returns null
    prismaMock.folder.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Folder not found');
  });

  it('should successfully delete empty folder', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockResolvedValue({
      id: 'folder-1',
      name: 'Empty Folder',
      folioId: 'folio-1',
      parentId: null,
      _count: {
        children: 0,
        notes: 0,
      },
    } as any);

    prismaMock.folder.delete.mockResolvedValue({
      id: 'folder-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.success).toBe(true);
    expect(data.message).toBe('Folder deleted successfully');

    expect(prismaMock.folder.delete).toHaveBeenCalledWith({
      where: { id: 'folder-1' },
    });
  });

  it('should delete folder with children (cascade)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockResolvedValue({
      id: 'folder-1',
      name: 'Parent Folder',
      folioId: 'folio-1',
      parentId: null,
      _count: {
        children: 3,
        notes: 2,
      },
    } as any);

    prismaMock.folder.delete.mockResolvedValue({
      id: 'folder-1',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.success).toBe(true);

    // Cascade delete handled by Prisma
    expect(prismaMock.folder.delete).toHaveBeenCalledWith({
      where: { id: 'folder-1' },
    });
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.folder.findFirst.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/folders/folder-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'folder-1' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete folder');
  });
});
