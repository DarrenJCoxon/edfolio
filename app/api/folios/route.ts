import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withCsrfProtection } from '@/lib/api/csrf-validation';

const createFolioSchema = z.object({
  name: z.string().min(1, 'Folio name is required').max(100),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's folios
    const folios = await prisma.folio.findMany({
      where: {
        ownerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Check if user has any shared pages
    const sharedPageCount = await prisma.pageCollaborator.count({
      where: {
        userId: session.user.id,
      },
    });

    // Prepend virtual "Shared with Me" folio if user has shares
    const allFolios = sharedPageCount > 0
      ? [
          {
            id: '__shared__',
            name: 'Shared with Me',
            ownerId: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            isSystem: true,
            shareCount: sharedPageCount,
          },
          ...folios,
        ]
      : folios;

    return NextResponse.json({ data: allFolios });
  } catch (error) {
    console.error('Error in GET /api/folios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folios' },
      { status: 500 }
    );
  }
}

export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { name } = createFolioSchema.parse(body);

    // Check for duplicate folio name
    const existingFolio = await prisma.folio.findFirst({
      where: {
        ownerId: session.user.id,
        name,
      },
    });

    if (existingFolio) {
      return NextResponse.json(
        { error: 'A folio with this name already exists' },
        { status: 400 }
      );
    }

    // Create folio
    const folio = await prisma.folio.create({
      data: {
        name,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: folio }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/folios:', error);
    return NextResponse.json(
      { error: 'Failed to create folio' },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';
