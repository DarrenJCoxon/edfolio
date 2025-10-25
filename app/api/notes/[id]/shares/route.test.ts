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

describe('GET /api/notes/[id]/shares', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares');
    const response = await GET(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if note does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares');
    const response = await GET(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found');
  });

  it('should return 403 if user does not own the note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'different-user' },
      published: { id: 'page-1' },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares');
    const response = await GET(request, { params: Promise.resolve({ id: 'note-1' }) });

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

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares');
    const response = await GET(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note is not published');
  });

  it('should return list of shares for published note', async () => {
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

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1' },
    } as any);

    prismaMock.pageShare.findMany.mockResolvedValue(mockShares as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares');
    const response = await GET(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(2);
    expect(data.data[0].invitedEmail).toBe('user1@example.com');
    expect(data.data[1].invitedEmail).toBe('user2@example.com');
  });
});

describe('POST /api/notes/[id]/shares', () => {
  const mockSession = {
    user: { id: 'user-1', email: 'owner@example.com', name: 'Owner User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return 400 if missing required fields', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({ invitedEmail: 'test@example.com' }), // Missing permission
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 400 if email format is invalid', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invalid-email',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid email format');
  });

  it('should return 400 if permission value is invalid', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'invalid',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid permission value');
  });

  it('should return 404 if note does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(404);
  });

  it('should return 403 if user does not own note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      folio: { ownerId: 'different-user' },
      published: { id: 'page-1', slug: 'test-slug', isPublished: true },
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(403);
  });

  it('should return 400 if note is not published', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Note must be published before sharing');
  });

  it('should return 409 if email already has active access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug', isPublished: true },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue({
      id: 'existing-share',
      invitedEmail: 'test@example.com',
      status: 'active',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'test@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('This email already has access to the page');
  });

  it('should create share successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (generateAccessToken as jest.Mock).mockResolvedValue('access-token-123');

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug', isPublished: true },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue(null);
    prismaMock.pageShare.create.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'invited@example.com',
      permission: 'read',
      accessToken: 'access-token-123',
      expiresAt: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      headers: {
        'x-forwarded-proto': 'https',
        'host': 'example.com',
      },
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'read',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.invitedEmail).toBe('invited@example.com');
    expect(data.data.permission).toBe('read');
    expect(data.data.accessLink).toBe('https://example.com/public/test-slug?token=access-token-123');
    expect(sendShareInvitation).toHaveBeenCalledWith({
      toEmail: 'invited@example.com',
      fromUserName: 'Owner User',
      pageTitle: 'Test Note',
      baseUrl: 'https://example.com',
      slug: 'test-slug',
      token: 'access-token-123',
      permission: 'read',
      expiryDate: undefined,
    });
  });

  it('should handle expiry date correctly', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    (generateAccessToken as jest.Mock).mockResolvedValue('access-token-123');

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug', isPublished: true },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue(null);
    prismaMock.pageShare.create.mockResolvedValue({
      id: 'share-1',
      invitedEmail: 'invited@example.com',
      permission: 'edit',
      accessToken: 'access-token-123',
      expiresAt: futureDate,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'edit',
        expiresAt: futureDate.toISOString(),
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.expiresAt).toBeTruthy();
  });

  it('should return 400 for invalid expiry date format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      folio: { ownerId: 'user-1' },
      published: { id: 'page-1', slug: 'test-slug', isPublished: true },
    } as any);

    prismaMock.pageShare.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notes/note-1/shares', {
      method: 'POST',
      body: JSON.stringify({
        invitedEmail: 'invited@example.com',
        permission: 'read',
        expiresAt: 'invalid-date',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'note-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid expiry date format');
  });
});
