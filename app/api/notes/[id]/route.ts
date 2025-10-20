import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z, ZodError } from 'zod';
import type { Prisma } from '@prisma/client';
import { validateFileName } from '@/lib/validation/name-validation';

// Validation schema for PATCH requests
const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.unknown().optional(),
});

// GET /api/notes/[id] - Fetch a single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch note and verify ownership
    const note = await prisma.note.findFirst({
      where: {
        id,
        folio: {
          ownerId: session.user.id,
        },
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

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

// PATCH /api/notes/[id] - Update note content and/or title
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { title, content } = updateNoteSchema.parse(body);

    // Verify note exists and user has access
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        folio: {
          ownerId: session.user.id,
        },
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    // Validate title if being updated
    if (title !== undefined && title !== existingNote.title) {
      const trimmedTitle = title.trim();

      // Fetch sibling notes (in same folder or folio root)
      const siblingNotes = await prisma.note.findMany({
        where: {
          folioId: existingNote.folioId,
          folderId: existingNote.folderId,
          id: { not: existingNote.id }, // Exclude current note
        },
        select: { title: true },
      });

      const existingNames = siblingNotes.map((n) => n.title);
      const validation = validateFileName(trimmedTitle, existingNames);

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Build update data
    const updateData: Prisma.NoteUpdateInput = {};
    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (content !== undefined) {
      updateData.content = content as Prisma.InputJsonValue;
    }

    // Update note
    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updatedNote });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify note exists and user has access
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        folio: {
          ownerId: session.user.id,
        },
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    // Delete note
    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
