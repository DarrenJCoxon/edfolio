import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/email-service', () => ({
  sendPermissionChanged: jest.fn(),
  sendAccessRevoked: jest.fn(),
}));

jest.mock('@/lib/api/csrf-validation', () => ({
  withCsrfProtection: (handler: Function) => handler,
}));

import { auth } from '@/lib/auth';
import { sendPermissionChanged, sendAccessRevoked } from '@/lib/email-service';

describe('PATCH /api/notes/[id]/shares/[shareId]', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if no fields to update', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({}), // No permission or status
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No fields to update');
  });

  it('should return 404 if note does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found');
  });

  it('should return 403 if user does not own note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'different-user' },
      published: { id: 'page-1', slug: 'test-slug' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should return 404 if note is not published', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note is not published');
  });

  it('should return 404 if share does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug' },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Share not found');
  });

  it('should return 400 if permission value is invalid', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug' },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'invalid' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid permission value');
  });

  it('should return 400 if status value is invalid', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug' },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid status value');
  });

  it('should successfully update permission from read to edit', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug' },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      permission: 'edit',
      status: 'active',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      headers: {
        'x-forwarded-proto': 'https',
        'host': 'example.com',
      },
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.permission).toBe('edit');
    expect(data.data.status).toBe('active');

    expect(prismaMock.pageShare.update).toHaveBeenCalledWith({
      where: { id: 'share-1' },
      data: { permission: 'edit' },
    });

    expect(sendPermissionChanged).toHaveBeenCalledWith({
      toEmail: 'user@example.com',
      pageTitle: 'Test Note',
      oldPermission: 'read',
      newPermission: 'edit',
      baseUrl: 'https://example.com',
      slug: 'test-slug',
    });
  });

  it('should successfully revoke access by setting status to revoked', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug' },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      permission: 'read',
      status: 'revoked',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      headers: {
        'x-forwarded-proto': 'https',
        'host': 'example.com',
      },
      body: JSON.stringify({ status: 'revoked' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.status).toBe('revoked');

    expect(prismaMock.pageShare.update).toHaveBeenCalledWith({
      where: { id: 'share-1' },
      data: { status: 'revoked' },
    });

    expect(sendAccessRevoked).toHaveBeenCalledWith({
      toEmail: 'user@example.com',
      pageTitle: 'Test Note',
      revokedBy: 'Owner User',
      baseUrl: 'https://example.com',
    });
  });

  it('should not send permission email if permission unchanged', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug' },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      permission: 'read',
      status: 'active',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'read' }), // Same as current
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    expect(sendPermissionChanged).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});

describe('DELETE /api/notes/[id]/shares/[shareId]', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if note does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found');
  });

  it('should return 403 if user does not own note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'different-user' },
      published: { id: 'page-1' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should return 404 if note is not published', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note is not published');
  });

  it('should return 404 if share does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1' },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Share not found');
  });

  it('should successfully revoke share and send notification email', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1' },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      status: 'revoked',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'DELETE',
      headers: {
        'x-forwarded-proto': 'https',
        'host': 'example.com',
      },
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Access revoked successfully');

    expect(prismaMock.pageShare.update).toHaveBeenCalledWith({
      where: { id: 'share-1' },
      data: { status: 'revoked' },
    });

    expect(sendAccessRevoked).toHaveBeenCalledWith({
      toEmail: 'user@example.com',
      pageTitle: 'Test Note',
      revokedBy: 'Owner User',
      baseUrl: 'https://example.com',
    });
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'note-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
