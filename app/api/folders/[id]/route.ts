import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateFolderName } from '@/lib/validation/name-validation';
import { withCsrfProtection } from '@/lib/api/csrf-validation';

const updateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255),
});

export const PATCH = withCsrfProtection(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify folder ownership through folio
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        folio: {
          ownerId: session.user.id,
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { name } = updateFolderSchema.parse(body);

    // Validate name if it changed
    if (name !== folder.name) {
      const trimmedName = name.trim();

      // Fetch sibling folders (same parent level)
      const siblingFolders = await prisma.folder.findMany({
        where: {
          folioId: folder.folioId,
          parentId: folder.parentId,
          id: { not: id }, // Exclude current folder
        },
        select: { name: true },
      });

      const existingNames = siblingFolders.map((f) => f.name);
      const validation = validateFolderName(trimmedName, existingNames);

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Update folder
    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        folioId: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updatedFolder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in PATCH /api/folders/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
});

export const DELETE = withCsrfProtection(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify folder ownership through folio and get counts
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        folio: {
          ownerId: session.user.id,
        },
      },
      include: {
        _count: {
          select: {
            children: true,
            notes: true,
          },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Delete folder (cascade deletes children and notes)
    await prisma.folder.delete({
      where: { id },
    });

    return NextResponse.json({
      data: { success: true },
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/folders/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';
