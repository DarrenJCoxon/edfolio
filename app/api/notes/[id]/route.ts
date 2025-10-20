import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const updateNoteSchema = z.object({
  title: z.string().min(1, 'Note title is required').max(200).optional(),
  content: z.unknown().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch note with ownership verification
    const note = await prisma.note.findFirst({
      where: {
        id,
        folio: {
          ownerId: session.user.id,
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        folioId: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error('Error in GET /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify note ownership through folio
    const note = await prisma.note.findFirst({
      where: {
        id,
        folio: {
          ownerId: session.user.id,
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { title, content } = updateNoteSchema.parse(body);

    // Build update data
    const updateData: Prisma.NoteUpdateInput = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (content !== undefined) {
      updateData.content = content as Prisma.InputJsonValue;
    }

    // Update note
    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        content: true,
        folioId: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updatedNote });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in PATCH /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify note ownership through folio
    const note = await prisma.note.findFirst({
      where: {
        id,
        folio: {
          ownerId: session.user.id,
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Delete note
    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({
      data: { success: true },
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
