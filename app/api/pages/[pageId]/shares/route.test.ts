import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/access-tokens', () => ({
  generateAccessToken: jest.fn(),
}));

jest.mock('@/lib/email-service', () => ({
  sendShareInvitation: jest.fn(),
}));

jest.mock('@/lib/api/csrf-validation', () => ({
  withCsrfProtection: (handler: Function) => handler,
}));

import { auth } from '@/lib/auth';
import { generateAccessToken } from '@/lib/access-tokens';
import { sendShareInvitation } from '@/lib/email-service';

describe('GET /api/pages/[pageId]/shares', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares');
    const response = await GET(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if published page does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.publishedPage.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares');
    const response = await GET(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Published page not found');
  });

  it('should return 403 if user does not own the page', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      note: {
        folio: { ownerId: 'different-user' },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares');
    const response = await GET(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Only the page owner can view shares');
  });

  it('should return list of shares for published page', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockShares = [
      {
        id: 'share-1',
        invitedEmail: 'user1@example.com',
        permission: 'read',
        status: 'active',
        createdAt: new Date(),
        lastAccessedAt: null,
        accessCount: 0,
        expiresAt: null,
      },
      {
        id: 'share-2',
        invitedEmail: 'user2@example.com',
        permission: 'edit',
        status: 'active',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 5,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      note: {
        folio: { ownerId: 'user-1' },
      },
    } as any);

    prismaMock.pageShare.findMany.mockResolvedValue(mockShares as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares');
    const response = await GET(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(2);
    expect(data.data[0].invitedEmail).toBe('user1@example.com');
    expect(data.data[1].invitedEmail).toBe('user2@example.com');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.publishedPage.findUnique.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares');
    const response = await GET(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch shares');
  });
});

describe('POST /api/pages/[pageId]/shares', () => {
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

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return 404 if published page does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.publishedPage.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(404);
  });

  it('should return 400 if page is not published', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      isPublished: false,
      note: {
        folio: { ownerId: 'user-1' },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Page must be published before sharing');
  });

  it('should return 403 if user does not own page', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      isPublished: true,
      note: {
        folio: { ownerId: 'different-user' },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Only the page owner can create shares');
  });

  it('should return 400 for invalid email format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      isPublished: true,
      slug: 'test-slug',
      note: {
        title: 'Test Note',
        folio: { ownerId: 'user-1' },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invalid-email',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should return 400 for invalid permission value', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      isPublished: true,
      slug: 'test-slug',
      note: {
        title: 'Test Note',
        folio: { ownerId: 'user-1' },
      },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'invalid',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should return 409 if email already has active access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      isPublished: true,
      slug: 'test-slug',
      note: {
        title: 'Test Note',
        folio: { ownerId: 'user-1' },
      },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue({
      id: 'existing-share',
      invitedEmail: 'test@example.com',
      status: 'active',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('This email already has access to this page');
  });

  it('should create share for non-existing user (no PageCollaborator)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (generateAccessToken as jest.Mock).mockResolvedValue('access-token-123');

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      isPublished: true,
      slug: 'test-slug',
      note: {
        title: 'Test Note',
        folio: { ownerId: 'user-1' },
      },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue(null);
    prismaMock.pageShare.create.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'invited@example.com',
      permission: 'read',
      accessToken: 'access-token-123',
      expiresAt: null,
    } as any);

    prismaMock.user.findUnique.mockResolvedValue(null); // User doesn't exist

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.share.invitedEmail).toBe('invited@example.com');
    expect(data.data.accessLink).toBe('https://example.com/accept-share?token=access-token-123');

    // Should NOT create PageCollaborator
    expect(prismaMock.pageCollaborator.create).not.toHaveBeenCalled();

    expect(sendShareInvitation).toHaveBeenCalledWith({
      toEmail: 'invited@example.com',
      fromUserName: 'Owner User',
      pageTitle: 'Test Note',
      slug: 'test-slug',
      token: 'access-token-123',
      permission: 'read',
      expiryDate: undefined,
      baseUrl: 'https://example.com',
    });
  });

  it('should create share and PageCollaborator for existing user', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (generateAccessToken as jest.Mock).mockResolvedValue('access-token-123');

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      isPublished: true,
      slug: 'test-slug',
      note: {
        title: 'Test Note',
        folio: { ownerId: 'user-1' },
      },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue(null);
    prismaMock.pageShare.create.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'invited@example.com',
      permission: 'edit',
      accessToken: 'access-token-123',
      expiresAt: null,
    } as any);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'invited@example.com',
    } as any);

    prismaMock.pageCollaborator.create.mockResolvedValue({
      pageId: 'page-1',
      userId: 'user-2',
      shareId: 'share-1',
      role: 'editor',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'edit',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.share.permission).toBe('edit');

    // Should create PageCollaborator for existing user
    expect(prismaMock.pageCollaborator.create).toHaveBeenCalledWith({
      data: {
        pageId: 'page-1',
        userId: 'user-2',
        shareId: 'share-1',
        role: 'editor',
      },
    });
  });

  it('should handle expiry date correctly', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (generateAccessToken as jest.Mock).mockResolvedValue('access-token-123');

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    prismaMock.publishedPage.findUnique.mockResolvedValue({
      id: 'page-1',
      isPublished: true,
      slug: 'test-slug',
      note: {
        title: 'Test Note',
        folio: { ownerId: 'user-1' },
      },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue(null);
    prismaMock.pageShare.create.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'invited@example.com',
      permission: 'read',
      accessToken: 'access-token-123',
      expiresAt: futureDate,
    } as any);

    prismaMock.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'read',
        expiresAt: futureDate.toISOString(),
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.share.expiresAt).toBeTruthy();
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.publishedPage.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/pages/page-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ pageId: 'page-1' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to create share');
  });
});
