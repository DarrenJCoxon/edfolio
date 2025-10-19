import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createNoteSchema = z.object({
  title: z.string().min(1, 'Note title is required').max(200).optional(),
  folioId: z.string().cuid('Invalid folio ID'),
  folderId: z.string().cuid('Invalid folder ID').nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const folioId = searchParams.get('folioId');
    const folderId = searchParams.get('folderId');

    if (!folioId) {
      return NextResponse.json(
        { error: 'folioId is required' },
        { status: 400 }
      );
    }

    // Verify folio ownership
    const folio = await prisma.folio.findFirst({
      where: {
        id: folioId,
        ownerId: session.user.id,
      },
    });

    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
    }

    // Build where clause
    const whereClause: {
      folioId: string;
      folderId?: string | null;
    } = {
      folioId,
    };

    // If folderId is provided, filter by it; if "null" string, filter root notes
    if (folderId === 'null') {
      whereClause.folderId = null;
    } else if (folderId) {
      whereClause.folderId = folderId;
    }

    // Fetch notes (only needed fields for list view)
    const notes = await prisma.note.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        folioId: true,
        folderId: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error('Error in GET /api/notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { title, folioId, folderId } = createNoteSchema.parse(body);

    // Verify folio ownership
    const folio = await prisma.folio.findFirst({
      where: {
        id: folioId,
        ownerId: session.user.id,
      },
    });

    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
    }

    // If folderId provided, verify it belongs to the same folio
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          folioId,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
    }

    // Create note
    const note = await prisma.note.create({
      data: {
        title: title || 'Untitled',
        folioId,
        folderId: folderId || null,
        content: {},
      },
      select: {
        id: true,
        title: true,
        folioId: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/notes:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
