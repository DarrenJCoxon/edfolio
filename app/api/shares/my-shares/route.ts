import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shares/my-shares
 * Retrieve all pages shared with the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Query all PageCollaborator records for this user
    const sharedPages = await prisma.pageCollaborator.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        page: {
          include: {
            note: {
              select: {
                id: true,
                title: true,
                folio: {
                  select: {
                    owner: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        share: {
          select: {
            permission: true,
            lastAccessedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to simplified format
    const formattedShares = sharedPages.map((collab) => ({
      id: collab.id,
      pageId: collab.page.id,
      noteId: collab.page.note.id,
      pageTitle: collab.page.note.title,
      slug: collab.page.slug,
      sharerName: collab.page.note.folio.owner.name,
      sharerEmail: collab.page.note.folio.owner.email,
      permission: collab.share?.permission || collab.role,
      lastAccessedAt: collab.share?.lastAccessedAt || collab.createdAt,
      sharedAt: collab.createdAt,
    }));

    return NextResponse.json({ data: formattedShares });
  } catch (error) {
    console.error('Error fetching shared pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared pages' },
      { status: 500 }
    );
  }
}
