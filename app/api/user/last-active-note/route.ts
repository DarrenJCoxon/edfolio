import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/last-active-note
 * Retrieves the user's last active note ID
 */
export async function GET() {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Fetch user's last active note ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastActiveNoteId: true },
    });

    return NextResponse.json({
      data: { lastActiveNoteId: user?.lastActiveNoteId || null },
    });
  } catch (error) {
    console.error('Error fetching last active note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last active note' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/last-active-note
 * Updates the user's last active note ID
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const { noteId } = await request.json();

    // 3. Validate noteId (can be null to clear)
    if (noteId !== null && typeof noteId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid noteId' },
        { status: 400 }
      );
    }

    // 4. If noteId is provided, verify the note exists and user has access
    if (noteId) {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
        include: {
          folio: true,
          published: { select: { id: true } }
        },
      });

      if (!note) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }

      // Check if user is owner
      const isOwner = note.folio.ownerId === session.user.id;

      // Check if user is collaborator (has access to shared note)
      let isCollaborator = false;
      if (!isOwner && note.published) {
        const collaborator = await prisma.pageCollaborator.findFirst({
          where: {
            pageId: note.published.id,
            userId: session.user.id,
          },
        });
        isCollaborator = !!collaborator;
      }

      // Deny access if user is neither owner nor collaborator
      if (!isOwner && !isCollaborator) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // 5. Update user's last active note
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveNoteId: noteId },
    });

    return NextResponse.json({
      data: { lastActiveNoteId: noteId },
    });
  } catch (error) {
    console.error('Error updating last active note:', error);
    return NextResponse.json(
      { error: 'Failed to update last active note' },
      { status: 500 }
    );
  }
}
