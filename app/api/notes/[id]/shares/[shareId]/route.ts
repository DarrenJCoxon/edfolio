import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPermissionChanged, sendAccessRevoked } from '@/lib/email-service';
import { UpdateShareRequest } from '@/types';

/**
 * PATCH /api/notes/[id]/shares/[shareId]
 * Update share permission or status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId, shareId } = await params;
    const body: UpdateShareRequest = await request.json();

    // Validate at least one field to update
    if (!body.permission && !body.status) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Auto-detect base URL from request headers
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Verify note ownership
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        folio: { select: { ownerId: true } },
        published: { select: { id: true, slug: true } },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.folio.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!note.published) {
      return NextResponse.json(
        { error: 'Note is not published' },
        { status: 404 }
      );
    }

    // Verify share exists and belongs to this page
    const share = await prisma.pageShare.findFirst({
      where: {
        id: shareId,
        pageId: note.published.id,
      },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: {
      permission?: 'read' | 'edit';
      status?: 'active' | 'revoked';
    } = {};

    if (body.permission) {
      if (!['read', 'edit'].includes(body.permission)) {
        return NextResponse.json(
          { error: 'Invalid permission value' },
          { status: 400 }
        );
      }
      updateData.permission = body.permission;
    }

    if (body.status) {
      if (!['active', 'revoked'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    // Update share
    const updatedShare = await prisma.pageShare.update({
      where: { id: shareId },
      data: updateData,
    });

    // Send notification emails
    if (body.permission && body.permission !== share.permission) {
      // Permission changed
      await sendPermissionChanged({
        toEmail: share.invitedEmail,
        pageTitle: note.title,
        oldPermission: share.permission,
        newPermission: body.permission,
        baseUrl: baseUrl,
        slug: note.published!.slug,
      });
    }

    if (body.status === 'revoked') {
      // Access revoked
      await sendAccessRevoked({
        toEmail: share.invitedEmail,
        pageTitle: note.title,
        revokedBy: session.user.name,
        baseUrl: baseUrl,
      });
    }

    return NextResponse.json({
      data: {
        id: updatedShare.id,
        permission: updatedShare.permission,
        status: updatedShare.status,
      },
    });
  } catch (error) {
    console.error('Error updating share:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]/shares/[shareId]
 * Revoke a share (soft delete by setting status to 'revoked')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId, shareId } = await params;

    // Auto-detect base URL from request headers
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Verify note ownership
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        folio: { select: { ownerId: true } },
        published: { select: { id: true } },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.folio.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!note.published) {
      return NextResponse.json(
        { error: 'Note is not published' },
        { status: 404 }
      );
    }

    // Find share
    const share = await prisma.pageShare.findFirst({
      where: {
        id: shareId,
        pageId: note.published.id,
      },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Revoke share (soft delete)
    await prisma.pageShare.update({
      where: { id: shareId },
      data: { status: 'revoked' },
    });

    // Send notification email
    await sendAccessRevoked({
      toEmail: share.invitedEmail,
      pageTitle: note.title,
      revokedBy: session.user.name,
      baseUrl: baseUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Access revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking share:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
