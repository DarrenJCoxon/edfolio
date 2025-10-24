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

    // Fetch note with all necessary relations
    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        folio: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        published: {
          select: {
            id: true,
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

    // Check if user is owner
    const isOwner = note.folio.ownerId === session.user.id;

    // Check if user is a collaborator (viewer or editor)
    // CRITICAL: Check collaborator status even if published is null, as PageCollaborator
    // records can exist independently of current publish status
    let collaboratorRole: string | null = null;
    if (!isOwner) {
      // First try to find collaborator via published page
      if (note.published) {
        const collaborator = await prisma.pageCollaborator.findFirst({
          where: {
            pageId: note.published.id,
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        });
        collaboratorRole = collaborator?.role || null;
      }

      // If no published page, check if collaborator record exists via note ID
      // This handles cases where publish status changed but collaboration remains
      if (!collaboratorRole) {
        const collaboratorViaNote = await prisma.pageCollaborator.findFirst({
          where: {
            page: {
              noteId: note.id,
            },
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        });
        collaboratorRole = collaboratorViaNote?.role || null;
      }
    }

    // Deny access if user is neither owner nor collaborator
    if (!isOwner && !collaboratorRole) {
      return NextResponse.json(
        { error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    // Return note data with access metadata
    return NextResponse.json({
      data: note,
      meta: {
        isOwner,
        collaboratorRole,
        canEdit: isOwner || collaboratorRole === 'editor',
      }
    });
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

    // Verify note exists
    const existingNote = await prisma.note.findUnique({
      where: { id },
      include: {
        folio: {
          select: { ownerId: true },
        },
        published: {
          select: { id: true },
        },
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Check if user is owner
    const isOwner = existingNote.folio.ownerId === session.user.id;

    // Check if user is a collaborator with editor role
    // CRITICAL: Check collaborator status even if published is null
    let isCollaborator = false;
    if (!isOwner) {
      // First try via published page
      if (existingNote.published) {
        const collaborator = await prisma.pageCollaborator.findFirst({
          where: {
            pageId: existingNote.published.id,
            userId: session.user.id,
            role: 'editor',
          },
        });
        isCollaborator = !!collaborator;
      }

      // If not found and no published page, check via note ID
      if (!isCollaborator) {
        const collaboratorViaNote = await prisma.pageCollaborator.findFirst({
          where: {
            page: {
              noteId: existingNote.id,
            },
            userId: session.user.id,
            role: 'editor',
          },
        });
        isCollaborator = !!collaboratorViaNote;
      }
    }

    // Deny access if user is neither owner nor editor
    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
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
