import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100),
  folioId: z.string().cuid('Invalid folio ID'),
  parentId: z.string().cuid('Invalid parent folder ID').nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { name, folioId, parentId } = createFolderSchema.parse(body);

    // Verify folio ownership
    const folio = await prisma.folio.findFirst({
      where: {
        id: folioId,
        ownerId: session.user.id,
      },
    });

    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
    }

    // If parentId provided, verify it belongs to the same folio
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          folioId,
        },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate folder name in same parent
    const existingFolder = await prisma.folder.findFirst({
      where: {
        folioId,
        parentId: parentId || null,
        name,
      },
    });

    if (existingFolder) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 400 }
      );
    }

    // Create folder
    const folder = await prisma.folder.create({
      data: {
        name,
        folioId,
        parentId: parentId || null,
      },
      select: {
        id: true,
        name: true,
        folioId: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/folders:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
