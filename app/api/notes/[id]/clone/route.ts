import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/access-tokens';
import { ClonePageRequest } from '@/types';

/**
 * POST /api/notes/[id]/clone
 * Clone a note to user's vault (requires edit permission via share or ownership)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    // Must be authenticated to clone
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body: ClonePageRequest = await request.json();

    // Check if user has permission to clone
    let hasPermission = false;

    // Fetch the note with published page info
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        folio: { select: { ownerId: true } },
        published: {
          select: {
            id: true,
            isPublished: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (note.folio.ownerId === session.user.id) {
      // Owner can clone (though unusual)
      hasPermission = true;
    } else if (body.accessToken && note.published) {
      // Check if user has edit permission via share token
      const verification = await verifyAccessToken(body.accessToken);

      if (
        verification.valid &&
        verification.share &&
        verification.share.permission === 'edit' &&
        verification.share.pageId === note.published.id
      ) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You must have edit permission to clone this page' },
        { status: 403 }
      );
    }

    // Get user's default folio
    const userFolio = await prisma.folio.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (!userFolio) {
      return NextResponse.json(
        { error: 'No folio found for user' },
        { status: 404 }
      );
    }

    // Clone the note
    const clonedNote = await prisma.note.create({
      data: {
        title: `${note.title} (Copy)`,
        content: note.content as Parameters<typeof prisma.note.create>[0]['data']['content'],
        folioId: userFolio.id,
        // Not published by default
        // No folder assigned
      },
    });

    // Record collaboration if cloned via share
    if (body.accessToken && note.published) {
      const verification = await verifyAccessToken(body.accessToken);
      if (verification.valid && verification.share) {
        await prisma.pageCollaborator.create({
          data: {
            pageId: note.published.id,
            userId: session.user.id,
            shareId: verification.share.id,
            role: 'editor',
          },
        });
      }
    }

    return NextResponse.json(
      {
        data: {
          noteId: clonedNote.id,
          title: clonedNote.title,
          redirectUrl: `/editor/${clonedNote.id}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Clone error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
