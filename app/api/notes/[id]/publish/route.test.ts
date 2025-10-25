import { NextRequest } from 'next/server';
import { POST, DELETE } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock slug generator
jest.mock('@/lib/slug-generator', () => ({
  generateSlugFromTitle: jest.fn((title: string) => title.toLowerCase().replace(/\s+/g, '-')),
  generateUniqueSlug: jest.fn(),
}));

// Mock CSRF validation HOC
jest.mock('@/lib/api/csrf-validation', () => ({
  withCsrfProtection: (handler: Function) => handler,
}));

import { auth } from '@/lib/auth';
import { generateSlugFromTitle, generateUniqueSlug } from '@/lib/slug-generator';

describe('POST /api/notes/[id]/publish', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockNoteId = 'clh0e8r5k0000jw0c8y5d6not1';
  const mockFolioId = 'clh0e8r5k0000jw0c8y5d6fol1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should return 404 if note does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found');
  });

  it('should return 403 if user does not own the note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      title: 'Test Note',
      folio: {
        ownerId: 'different-user-id', // Different owner
      },
    };

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("You don't have permission to publish this note");
  });

  it('should return 409 if note is already published', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      title: 'Test Note',
      folio: {
        ownerId: mockSession.user.id,
      },
    };

    const mockExistingPublication = {
      isPublished: true,
      slug: 'test-note-abc12345',
    };

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
    prismaMock.publishedPage.findUnique.mockResolvedValue(mockExistingPublication as any);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('Page is already published');
    expect(data.data.slug).toBe('test-note-abc12345');
    expect(data.data.publicUrl).toBe('/public/test-note-abc12345');
  });

  it('should successfully publish a new note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      title: 'My First Post',
      folio: {
        ownerId: mockSession.user.id,
      },
    };

    const mockSlug = 'my-first-post-abc12345';
    const mockShortId = 'abc12345';

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
    prismaMock.publishedPage.findUnique.mockResolvedValue(null); // Not published yet
    (generateSlugFromTitle as jest.Mock).mockReturnValue('my-first-post');
    (generateUniqueSlug as jest.Mock).mockResolvedValue({
      slug: mockSlug,
      shortId: mockShortId,
    });
    prismaMock.publishedPage.create.mockResolvedValue({
      slug: mockSlug,
    } as any);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.slug).toBe(mockSlug);
    expect(data.data.shortId).toBe(mockShortId);
    expect(data.data.publicUrl).toBe(`/public/${mockSlug}`);

    expect(prismaMock.publishedPage.create).toHaveBeenCalledWith({
      data: {
        noteId: mockNoteId,
        slug: mockSlug,
        shortId: mockShortId,
        isPublished: true,
      },
      select: {
        slug: true,
      },
    });
  });

  it('should re-publish a previously unpublished note (update existing record)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      title: 'Previously Published',
      folio: {
        ownerId: mockSession.user.id,
      },
    };

    const mockExistingPublication = {
      isPublished: false, // Was unpublished
      slug: 'old-slug-xyz98765',
    };

    const mockNewSlug = 'previously-published-abc12345';
    const mockShortId = 'abc12345';

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
    prismaMock.publishedPage.findUnique.mockResolvedValue(mockExistingPublication as any);
    (generateSlugFromTitle as jest.Mock).mockReturnValue('previously-published');
    (generateUniqueSlug as jest.Mock).mockResolvedValue({
      slug: mockNewSlug,
      shortId: mockShortId,
    });
    prismaMock.publishedPage.update.mockResolvedValue({
      slug: mockNewSlug,
    } as any);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.slug).toBe(mockNewSlug);

    expect(prismaMock.publishedPage.update).toHaveBeenCalledWith({
      where: { noteId: mockNoteId },
      data: {
        isPublished: true,
        publishedAt: expect.any(Date),
        slug: mockNewSlug,
        shortId: mockShortId,
      },
      select: {
        slug: true,
      },
    });
  });

  it('should handle reserved slug errors', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      title: 'API Documentation',
      folio: {
        ownerId: mockSession.user.id,
      },
    };

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
    prismaMock.publishedPage.findUnique.mockResolvedValue(null);
    (generateSlugFromTitle as jest.Mock).mockReturnValue('api');
    (generateUniqueSlug as jest.Mock).mockRejectedValue(
      new Error('The slug "api" is reserved and cannot be used for published pages.')
    );

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('reserved');
  });

  it('should handle unique slug generation failure', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      title: 'Test Note',
      folio: {
        ownerId: mockSession.user.id,
      },
    };

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
    prismaMock.publishedPage.findUnique.mockResolvedValue(null);
    (generateSlugFromTitle as jest.Mock).mockReturnValue('test-note');
    (generateUniqueSlug as jest.Mock).mockRejectedValue(
      new Error('Unable to generate unique slug after 100 attempts')
    );

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Unable to generate a unique URL');
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'POST',
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to publish page');
  });
});

describe('DELETE /api/notes/[id]/publish', () => {
  const mockSession = {
    user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockNoteId = 'clh0e8r5k0000jw0c8y5d6not1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should return 404 if note does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);
    prismaMock.note.findUnique.mockResolvedValue(null);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Note not found');
  });

  it('should return 403 if user does not own the note', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      folio: {
        ownerId: 'different-user-id', // Different owner
      },
    };

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("You don't have permission to unpublish this note");
  });

  it('should return 404 if published page does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      folio: {
        ownerId: mockSession.user.id,
      },
    };

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
    prismaMock.publishedPage.findUnique.mockResolvedValue(null); // Not published

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Page is not published');
  });

  it('should return 404 if page is already unpublished', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      folio: {
        ownerId: mockSession.user.id,
      },
    };

    const mockPublishedPage = {
      isPublished: false, // Already unpublished
    };

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
    prismaMock.publishedPage.findUnique.mockResolvedValue(mockPublishedPage as any);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Page is already unpublished');
  });

  it('should successfully unpublish a note (soft delete)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const mockNote = {
      id: mockNoteId,
      folio: {
        ownerId: mockSession.user.id,
      },
    };

    const mockPublishedPage = {
      isPublished: true,
    };

    prismaMock.note.findUnique.mockResolvedValue(mockNote as any);
    prismaMock.publishedPage.findUnique.mockResolvedValue(mockPublishedPage as any);
    prismaMock.publishedPage.update.mockResolvedValue({} as any);

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Page unpublished successfully');

    // Verify soft delete (isPublished set to false)
    expect(prismaMock.publishedPage.update).toHaveBeenCalledWith({
      where: { noteId: mockNoteId },
      data: {
        isPublished: false,
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.note.findUnique.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest(`http://localhost:3000/api/notes/${mockNoteId}/publish`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: mockNoteId }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to unpublish page');
  });
});
