import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z, ZodError } from 'zod';
import { withCsrfProtection } from '@/lib/api/csrf-validation';

// Validation schema for POST requests
const createNoteSchema = z.object({
  title: z.string().min(1).max(255).default('Untitled'),
  folioId: z.string().cuid(),
  folderId: z.string().cuid().nullable().optional(),
});

// GET /api/notes - List all notes for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const folioId = searchParams.get('folioId');
    const folderId = searchParams.get('folderId');

    // Build where clause
    const where = {
      folio: {
        ownerId: session.user.id,
      },
      ...(folioId && { folioId }),
      ...(folderId && { folderId }),
    };

    // Fetch notes
    const notes = await prisma.note.findMany({
      where,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        folio: {
          select: {
            id: true,
            name: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
export const POST = withCsrfProtection(async (request: NextRequest) => {
  let body: unknown;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    body = await request.json();
    console.log('Creating note with body:', body);
    const { title, folioId, folderId } = createNoteSchema.parse(body);

    // Verify folio ownership
    const folio = await prisma.folio.findFirst({
      where: {
        id: folioId,
        ownerId: session.user.id,
      },
    });

    if (!folio) {
      return NextResponse.json(
        { error: 'Folio not found or access denied' },
        { status: 404 }
      );
    }

    // If folderId provided, verify folder ownership
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          folioId,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Create note with default empty TipTap content
    const note = await prisma.note.create({
      data: {
        title,
        folioId,
        folderId: folderId || null,
        content: { type: 'doc', content: [] },
      },
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Validation error:', error.issues);
      console.error('Received body:', body);
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';
