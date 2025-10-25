import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z, ZodError } from 'zod';

// Validation schema for move request
const moveNoteSchema = z.object({
  folderId: z.string().nullable(),
});

/**
 * POST /api/notes/[id]/move
 * Move a note to a different folder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: noteId } = await params;

    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { folderId } = moveNoteSchema.parse(body);

    // Fetch note with folio info
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        folio: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Verify user is owner (only owners can move notes)
    if (note.folio.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // If moving to a folder, verify folder exists and belongs to same folio
    if (folderId) {
      const targetFolder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: {
          id: true,
          folioId: true,
          name: true,
        },
      });

      if (!targetFolder) {
        return NextResponse.json(
          { error: 'Target folder not found' },
          { status: 404 }
        );
      }

      // Ensure folder belongs to same folio
      if (targetFolder.folioId !== note.folioId) {
        return NextResponse.json(
          { error: 'Cannot move note to folder in different folio' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate note names in destination
    const siblingNotes = await prisma.note.findMany({
      where: {
        folioId: note.folioId,
        folderId: folderId,
        id: { not: noteId }, // Exclude current note
        title: note.title, // Check for same title
      },
    });

    // If duplicate exists, append number to title
    let newTitle = note.title;
    if (siblingNotes.length > 0) {
      let counter = 2;
      while (true) {
        const candidateTitle = `${note.title} (${counter})`;
        const exists = await prisma.note.findFirst({
          where: {
            folioId: note.folioId,
            folderId: folderId,
            title: candidateTitle,
          },
        });
        if (!exists) {
          newTitle = candidateTitle;
          break;
        }
        counter++;
      }
    }

    // Update note's folder and title if changed
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        folderId: folderId,
        title: newTitle,
      },
    });

    return NextResponse.json({
      data: updatedNote,
      message: 'Note moved successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error moving note:', error);
    return NextResponse.json(
      { error: 'Failed to move note' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
