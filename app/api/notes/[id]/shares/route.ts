import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAccessToken } from '@/lib/access-tokens';
import { sendShareInvitation } from '@/lib/email-service';
import { CreateShareRequest } from '@/types';

/**
 * GET /api/notes/[id]/shares
 * List all shares for a note (owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;

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

    // Fetch all shares for this page
    const shares = await prisma.pageShare.findMany({
      where: { pageId: note.published.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invitedEmail: true,
        permission: true,
        status: true,
        createdAt: true,
        lastAccessedAt: true,
        accessCount: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ data: shares });
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/[id]/shares
 * Create a new share invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body: CreateShareRequest = await request.json();

    // Validate request body
    if (!body.invitedEmail || !body.permission) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.invitedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate permission
    if (!['read', 'edit'].includes(body.permission)) {
      return NextResponse.json(
        { error: 'Invalid permission value' },
        { status: 400 }
      );
    }

    // Verify note ownership and publication status
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        folio: { select: { ownerId: true } },
        published: {
          select: {
            id: true,
            slug: true,
            isPublished: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.folio.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!note.published || !note.published.isPublished) {
      return NextResponse.json(
        { error: 'Note must be published before sharing' },
        { status: 400 }
      );
    }

    // Check for duplicate email invitation
    const existingShare = await prisma.pageShare.findFirst({
      where: {
        pageId: note.published.id,
        invitedEmail: body.invitedEmail,
        status: 'active',
      },
    });

    if (existingShare) {
      return NextResponse.json(
        { error: 'This email already has access to the page' },
        { status: 409 }
      );
    }

    // Generate unique access token
    const accessToken = await generateAccessToken();

    // Parse expiry date if provided
    let expiresAt: Date | null = null;
    if (body.expiresAt) {
      expiresAt = new Date(body.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiry date format' },
          { status: 400 }
        );
      }
    }

    // Create share record
    const share = await prisma.pageShare.create({
      data: {
        pageId: note.published.id,
        invitedEmail: body.invitedEmail,
        invitedBy: session.user.id,
        permission: body.permission,
        accessToken: accessToken,
        expiresAt: expiresAt,
        status: 'active',
      },
    });

    // Auto-detect base URL from request headers (works in all environments)
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const accessLink = `${baseUrl}/public/${note.published.slug}?token=${accessToken}`;

    // Send invitation email with separate URL components
    await sendShareInvitation({
      toEmail: body.invitedEmail,
      fromUserName: session.user.name,
      pageTitle: note.title,
      baseUrl: baseUrl,
      slug: note.published.slug,
      token: accessToken,
      permission: body.permission,
      expiryDate: expiresAt || undefined,
    });

    return NextResponse.json(
      {
        data: {
          id: share.id,
          invitedEmail: share.invitedEmail,
          permission: share.permission,
          accessLink: accessLink,
          expiresAt: share.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
