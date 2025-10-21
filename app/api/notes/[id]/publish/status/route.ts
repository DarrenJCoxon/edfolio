import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notes/[id]/publish/status
 * Check if a note is published and get its publication details
 *
 * Authentication: Required
 * Authorization: Note owner only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: noteId } = await params;

    // Fetch note with folio ownership information
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        folio: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    // Verify note exists
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Verify user owns the note
    if (note.folio.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to access this note" },
        { status: 403 }
      );
    }

    // Query publication status
    const publishedPage = await prisma.publishedPage.findUnique({
      where: { noteId },
      select: {
        isPublished: true,
        slug: true,
      },
    });

    // Return publication status
    if (!publishedPage) {
      return NextResponse.json({
        isPublished: false,
        slug: null,
      });
    }

    return NextResponse.json({
      isPublished: publishedPage.isPublished,
      slug: publishedPage.slug,
    });
  } catch (error) {
    console.error('Error in GET /api/notes/[id]/publish/status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publication status' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
