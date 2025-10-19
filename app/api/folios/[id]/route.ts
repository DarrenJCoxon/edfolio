import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateFolioSchema = z.object({
  name: z.string().min(1, 'Folio name is required').max(100),
});

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

    // Verify folio ownership
    const folio = await prisma.folio.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
    });

    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { name } = updateFolioSchema.parse(body);

    // Check for duplicate name (excluding current folio)
    const existingFolio = await prisma.folio.findFirst({
      where: {
        ownerId: session.user.id,
        name,
        NOT: {
          id,
        },
      },
    });

    if (existingFolio) {
      return NextResponse.json(
        { error: 'A folio with this name already exists' },
        { status: 400 }
      );
    }

    // Update folio
    const updatedFolio = await prisma.folio.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updatedFolio });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in PATCH /api/folios/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update folio' },
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

    // Verify folio ownership
    const folio = await prisma.folio.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      include: {
        _count: {
          select: {
            folders: true,
            notes: true,
          },
        },
      },
    });

    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
    }

    // Check if user has other folios
    const folioCount = await prisma.folio.count({
      where: {
        ownerId: session.user.id,
      },
    });

    if (folioCount === 1) {
      return NextResponse.json(
        { error: 'Cannot delete your last folio' },
        { status: 400 }
      );
    }

    // Delete folio (cascade deletes folders and notes)
    await prisma.folio.delete({
      where: { id },
    });

    return NextResponse.json({
      data: { success: true },
      message: 'Folio deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/folios/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete folio' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
