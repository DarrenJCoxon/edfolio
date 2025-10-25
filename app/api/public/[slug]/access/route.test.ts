import { NextRequest } from 'next/server';
import { POST } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/access-tokens', () => ({
  verifyAccessToken: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { verifyAccessToken } from '@/lib/access-tokens';

describe('POST /api/public/[slug]/access', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'viewer@example.com', name: 'Viewer User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'token-123' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 if accessToken is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Access token is required');
  });

  it('should return invalid if token verification fails', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      valid: false,
      error: 'Token expired',
    });

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'expired-token' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Token expired');
  });

  it('should return invalid if verification returns no share', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      valid: true,
      share: null,
    });

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'token-123' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Invalid access token');
  });

  it('should return invalid if page does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      valid: true,
      share: {
        id: 'share-1',
        pageId: 'page-1',
        permission: 'read',
      },
    });

    prismaMock.publishedPage.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'token-123' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Page not found');
  });

  it('should return invalid if token does not match page', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      valid: true,
      share: {
        id: 'share-1',
        pageId: 'different-page',
        permission: 'read',
      },
    });

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      slug: 'test-slug',
      note: {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'token-123' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Access token does not match this page');
  });

  it('should successfully validate and create PageCollaborator on first access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      valid: true,
      share: {
        id: 'share-1',
        pageId: 'page-1',
        permission: 'read',
      },
    });

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      slug: 'test-slug',
      note: {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
      },
    } as any);

    prismaMock.pageCollaborator.upsert.mockResolvedValue({
      pageId: 'page-1',
      userId: 'user-1',
      shareId: 'share-1',
      role: 'viewer',
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      lastAccessedAt: new Date(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'token-123' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(true);
    expect(data.permission).toBe('read');
    expect(data.pageData).toEqual({
      id: 'page-1',
      title: 'Test Note',
      slug: 'test-slug',
      content: 'Test content',
    });

    expect(prismaMock.pageCollaborator.upsert).toHaveBeenCalledWith({
      where: {
        pageId_userId: {
          pageId: 'page-1',
          userId: 'user-1',
        },
      },
      create: {
        pageId: 'page-1',
        userId: 'user-1',
        shareId: 'share-1',
        role: 'viewer',
      },
      update: {
        shareId: 'share-1',
      },
    });

    expect(prismaMock.pageShare.update).toHaveBeenCalledWith({
      where: { id: 'share-1' },
      data: { lastAccessedAt: expect.any(Date) },
    });
  });

  it('should create editor role for edit permission', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      valid: true,
      share: {
        id: 'share-1',
        pageId: 'page-1',
        permission: 'edit',
      },
    });

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      slug: 'test-slug',
      note: {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
      },
    } as any);

    prismaMock.pageCollaborator.upsert.mockResolvedValue({
      pageId: 'page-1',
      userId: 'user-1',
      shareId: 'share-1',
      role: 'editor',
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-1',
      lastAccessedAt: new Date(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'token-123' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(true);
    expect(data.permission).toBe('edit');

    expect(prismaMock.pageCollaborator.upsert).toHaveBeenCalledWith({
      where: {
        pageId_userId: {
          pageId: 'page-1',
          userId: 'user-1',
        },
      },
      create: {
        pageId: 'page-1',
        userId: 'user-1',
        shareId: 'share-1',
        role: 'editor',
      },
      update: {
        shareId: 'share-1',
      },
    });
  });

  it('should update existing PageCollaborator on subsequent access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      valid: true,
      share: {
        id: 'share-2',
        pageId: 'page-1',
        permission: 'read',
      },
    });

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      slug: 'test-slug',
      note: {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
      },
    } as any);

    prismaMock.pageCollaborator.upsert.mockResolvedValue({
      pageId: 'page-1',
      userId: 'user-1',
      shareId: 'share-2',
      role: 'viewer',
    } as any);

    prismaMock.pageShare.update.mockResolvedValue({
      id: 'share-2',
      lastAccessedAt: new Date(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'token-456' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(true);

    // Upsert should update shareId to new token
    expect(prismaMock.pageCollaborator.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          shareId: 'share-2',
        },
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      valid: true,
      share: {
        id: 'share-1',
        pageId: 'page-1',
        permission: 'read',
      },
    });

    prismaMock.publishedPage.findUnique.mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new NextRequest('http://localhost:3000/api/public/test-slug/access', {
      method: 'POST',
      body: JSON.stringify({ accessToken: 'token-123' }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Internal server error');
  });
});
