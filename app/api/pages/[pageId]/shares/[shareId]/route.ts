import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPermissionChanged, sendAccessRevoked } from '@/lib/email-service';
import { z } from 'zod';

const updateShareSchema = z.object({
  permission: z.enum(['read', 'edit']).optional(),
  status: z.enum(['active', 'revoked']).optional(),
});

/**
 * PATCH /api/pages/[pageId]/shares/[shareId]
 * Update a share's permission or status (page owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string; shareId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId, shareId } = await params;

    // Get share with page ownership check
    const share = await prisma.pageShare.findUnique({
      where: { id: shareId },
      include: {
        page: {
          include: {
            note: {
              include: {
                folio: {
                  select: { ownerId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!share || share.pageId !== pageId) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Verify user is page owner
    if (share.page.note.folio.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the page owner can update shares' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { permission, status } = updateShareSchema.parse(body);

    if (!permission && !status) {
      return NextResponse.json(
        { error: 'Either permission or status must be provided' },
        { status: 400 }
      );
    }

    const oldPermission = share.permission;
    const oldStatus = share.status;

    // Update share
    const updatedShare = await prisma.pageShare.update({
      where: { id: shareId },
      data: {
        ...(permission && { permission }),
        ...(status && { status }),
      },
    });

    // Handle permission change
    if (permission && permission !== oldPermission) {
      // Update PageCollaborator role
      await prisma.pageCollaborator.updateMany({
        where: {
          shareId: shareId,
          pageId: pageId,
        },
        data: {
          role: permission === 'edit' ? 'editor' : 'viewer',
        },
      });

      // Send permission changed email
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      await sendPermissionChanged({
        toEmail: share.invitedEmail,
        pageTitle: share.page.note.title,
        slug: share.page.slug,
        oldPermission: oldPermission,
        newPermission: permission,
        baseUrl,
      });
    }

    // Handle status change to revoked
    if (status === 'revoked' && oldStatus !== 'revoked') {
      // Delete PageCollaborator records
      await prisma.pageCollaborator.deleteMany({
        where: {
          shareId: shareId,
          pageId: pageId,
        },
      });

      // Send access revoked email
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      await sendAccessRevoked({
        toEmail: share.invitedEmail,
        pageTitle: share.page.note.title,
        revokedBy: session.user.name || session.user.email || 'Page owner',
        baseUrl,
      });
    }

    return NextResponse.json({
      data: updatedShare,
      message: 'Share updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in PATCH /api/pages/[pageId]/shares/[shareId]:', error);
    return NextResponse.json(
      { error: 'Failed to update share' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pages/[pageId]/shares/[shareId]
 * Revoke a share (page owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string; shareId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId, shareId } = await params;

    // Get share with page ownership check
    const share = await prisma.pageShare.findUnique({
      where: { id: shareId },
      include: {
        page: {
          include: {
            note: {
              include: {
                folio: {
                  select: { ownerId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!share || share.pageId !== pageId) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Verify user is page owner
    if (share.page.note.folio.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the page owner can revoke shares' },
        { status: 403 }
      );
    }

    // Update status to revoked (don't actually delete for audit trail)
    await prisma.pageShare.update({
      where: { id: shareId },
      data: { status: 'revoked' },
    });

    // Delete PageCollaborator records
    await prisma.pageCollaborator.deleteMany({
      where: {
        shareId: shareId,
        pageId: pageId,
      },
    });

    // Send access revoked email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    await sendAccessRevoked({
      toEmail: share.invitedEmail,
      pageTitle: share.page.note.title,
      revokedBy: session.user.name || session.user.email || 'Page owner',
      baseUrl,
    });

    return NextResponse.json({
      data: { success: true },
      message: 'Share revoked successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/pages/[pageId]/shares/[shareId]:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
