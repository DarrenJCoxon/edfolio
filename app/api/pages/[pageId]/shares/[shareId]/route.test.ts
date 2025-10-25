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

describe('PATCH /api/pages/[pageId]/shares/[shareId]', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if share does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.pageShare.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Share not found');
  });

  it('should return 404 if share pageId does not match param', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'different-page',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
      page: {
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Share not found');
  });

  it('should return 403 if user does not own page', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
      page: {
        slug: 'test-slug',
        note: {
          title: 'Test Note',
          folio: { ownerId: 'different-user' },
        },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Only the page owner can update shares');
  });

  it('should return 400 if neither permission nor status provided', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
      page: {
        slug: 'test-slug',
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Either permission or status must be provided');
  });

  it('should successfully update permission and update PageCollaborator', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
      page: {
        slug: 'test-slug',
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      permission: 'edit',
      status: 'active',
    } as any);

    prismaMock.pageCollaborator.updateMany.mockResolvedValue({ count: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.permission).toBe('edit');

    expect(prismaMock.pageShare.update).toHaveBeenCalledWith({
      where: { id: 'share-1' },
      data: { permission: 'edit' },
    });

    expect(prismaMock.pageCollaborator.updateMany).toHaveBeenCalledWith({
      where: {
        shareId: 'share-1',
        pageId: 'page-1',
      },
      data: {
        role: 'editor',
      },
    });

    expect(sendPermissionChanged).toHaveBeenCalledWith({
      toEmail: 'user@example.com',
      pageTitle: 'Test Note',
      slug: 'test-slug',
      oldPermission: 'read',
      newPermission: 'edit',
      baseUrl: 'https://example.com',
    });
  });

  it('should not send email if permission unchanged', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
      page: {
        slug: 'test-slug',
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      permission: 'read',
      status: 'active',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'read' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    expect(sendPermissionChanged).not.toHaveBeenCalled();
  });

  it('should revoke access and delete PageCollaborator', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
      page: {
        slug: 'test-slug',
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      permission: 'read',
      status: 'revoked',
    } as any);

    prismaMock.pageCollaborator.deleteMany.mockResolvedValue({ count: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'revoked' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.status).toBe('revoked');

    expect(prismaMock.pageCollaborator.deleteMany).toHaveBeenCalledWith({
      where: {
        shareId: 'share-1',
        pageId: 'page-1',
      },
    });

    expect(sendAccessRevoked).toHaveBeenCalledWith({
      toEmail: 'user@example.com',
      pageTitle: 'Test Note',
      revokedBy: 'Owner User',
      baseUrl: 'https://example.com',
    });
  });

  it('should not send revoked email if status was already revoked', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'revoked',
      page: {
        slug: 'test-slug',
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      permission: 'read',
      status: 'revoked',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'revoked' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    expect(sendAccessRevoked).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid permission value', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
      page: {
        slug: 'test-slug',
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'invalid' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'PATCH',
      body: JSON.stringify({ permission: 'edit' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to update share');
  });
});

describe('DELETE /api/pages/[pageId]/shares/[shareId]', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if share does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.pageShare.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Share not found');
  });

  it('should return 404 if share pageId does not match param', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'different-page',
      invitedEmail: 'user@example.com',
      page: {
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Share not found');
  });

  it('should return 403 if user does not own page', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      page: {
        note: {
          title: 'Test Note',
          folio: { ownerId: 'different-user' },
        },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Only the page owner can revoke shares');
  });

  it('should successfully revoke share and delete PageCollaborator', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.pageShare.findUnique.mockResolvedValue({
      id: 'share-1',
      pageId: 'page-1',
      invitedEmail: 'user@example.com',
      permission: 'read',
      status: 'active',
      page: {
        note: {
          title: 'Test Note',
          folio: { ownerId: 'user-1' },
        },
      },
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      status: 'revoked',
    } as any);

    prismaMock.pageCollaborator.deleteMany.mockResolvedValue({ count: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.success).toBe(true);
    expect(data.message).toBe('Share revoked successfully');

    expect(prismaMock.pageShare.update).toHaveBeenCalledWith({
      where: { id: 'share-1' },
      data: { status: 'revoked' },
    });

    expect(prismaMock.pageCollaborator.deleteMany).toHaveBeenCalledWith({
      where: {
        shareId: 'share-1',
        pageId: 'page-1',
      },
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

    prismaMock.pageShare.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares/share-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ pageId: 'page-1', shareId: 'share-1' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to revoke share');
  });
});
