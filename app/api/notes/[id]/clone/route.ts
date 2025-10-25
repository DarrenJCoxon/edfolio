import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ClonePageRequest } from '@/types';
import { z } from 'zod';

// Extended validation schema for clone request
const cloneRequestSchema = z.object({
  targetFolderId: z.string().nullable().optional(),
  accessToken: z.string().optional(),
});

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
    const body = await request.json();
    const { targetFolderId, accessToken } = cloneRequestSchema.parse(body);

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

    // Check if user has permission to clone
    let hasPermission = false;

    // Check if user is the owner
    if (note.folio.ownerId === session.user.id) {
      hasPermission = true;
    } else if (note.published) {
      // Check if user is a collaborator (either viewer or editor can clone)
      const collaborator = await prisma.pageCollaborator.findFirst({
        where: {
          pageId: note.published.id,
          userId: session.user.id,
        },
      });
      hasPermission = !!collaborator;
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have access to clone this page' },
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

    // Determine target folder (use source note's folder if not specified)
    const targetFolder = targetFolderId !== undefined ? targetFolderId : note.folderId;

    // Handle duplicate title in destination folder
    let duplicateTitle = `${note.title} (Copy)`;
    let counter = 2;
    while (true) {
      const exists = await prisma.note.findFirst({
        where: {
          folioId: userFolio.id,
          folderId: targetFolder,
          title: duplicateTitle,
        },
      });
      if (!exists) break;
      duplicateTitle = `${note.title} (Copy ${counter})`;
      counter++;
    }

    // Clone the note
    const clonedNote = await prisma.note.create({
      data: {
        title: duplicateTitle,
        content: note.content as Parameters<typeof prisma.note.create>[0]['data']['content'],
        folioId: userFolio.id,
        folderId: targetFolder, // Use determined folder
        // Not published by default
      },
    });

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
