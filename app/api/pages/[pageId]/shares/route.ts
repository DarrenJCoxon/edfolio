import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAccessToken } from '@/lib/access-tokens';
import { sendShareInvitation } from '@/lib/email-service';
import { z } from 'zod';

const createShareSchema = z.object({
  invitedEmail: z.string().email('Invalid email address'),
  permission: z.enum(['read', 'edit']),
  expiresAt: z.string().datetime().optional(),
});

/**
 * GET /api/pages/[pageId]/shares
 * List all shares for a published page (page owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId } = await params;

    // Get published page and verify ownership
    const publishedPage = await prisma.publishedPage.findUnique({
      where: { id: pageId },
      include: {
        note: {
          include: {
            folio: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!publishedPage) {
      return NextResponse.json({ error: 'Published page not found' }, { status: 404 });
    }

    // Verify user is page owner
    if (publishedPage.note.folio.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the page owner can view shares' },
        { status: 403 }
      );
    }

    // Query all shares for this page
    const shares = await prisma.pageShare.findMany({
      where: { pageId },
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
    console.error('Error in GET /api/pages/[pageId]/shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pages/[pageId]/shares
 * Create a new share (send invitation to specific email)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId } = await params;

    // Get published page and verify ownership
    const publishedPage = await prisma.publishedPage.findUnique({
      where: { id: pageId },
      include: {
        note: {
          include: {
            folio: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!publishedPage) {
      return NextResponse.json({ error: 'Published page not found' }, { status: 404 });
    }

    // Verify page is published
    if (!publishedPage.isPublished) {
      return NextResponse.json(
        { error: 'Page must be published before sharing' },
        { status: 400 }
      );
    }

    // Verify user is page owner
    if (publishedPage.note.folio.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the page owner can create shares' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { invitedEmail, permission, expiresAt } = createShareSchema.parse(body);

    // Check for existing active share with same email
    const existingShare = await prisma.pageShare.findFirst({
      where: {
        pageId,
        invitedEmail,
        status: 'active',
      },
    });

    if (existingShare) {
      return NextResponse.json(
        { error: 'This email already has access to this page' },
        { status: 409 }
      );
    }

    // Generate unique access token
    const accessToken = await generateAccessToken();

    // Create PageShare record
    const share = await prisma.pageShare.create({
      data: {
        pageId,
        invitedEmail,
        invitedBy: session.user.id,
        permission,
        accessToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'active',
      },
    });

    // CRITICAL: Check if invitee has Edfolio account
    const inviteeUser = await prisma.user.findUnique({
      where: { email: invitedEmail },
      select: { id: true },
    });

    // If user exists, create PageCollaborator immediately
    if (inviteeUser) {
      await prisma.pageCollaborator.create({
        data: {
          pageId,
          userId: inviteeUser.id,
          shareId: share.id,
          role: permission === 'edit' ? 'editor' : 'viewer',
        },
      });
      console.log(`✅ Created PageCollaborator for existing user: ${invitedEmail}`);
    } else {
      console.log(`ℹ️ User ${invitedEmail} does not exist yet. Collaborator will be created on first access.`);
    }

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    await sendShareInvitation({
      toEmail: invitedEmail,
      fromUserName: session.user.name || session.user.email || 'A user',
      pageTitle: publishedPage.note.title,
      slug: publishedPage.slug,
      token: accessToken,
      permission,
      expiryDate: expiresAt ? new Date(expiresAt) : undefined,
      baseUrl,
    });

    return NextResponse.json({
      data: {
        share,
        accessLink: `${baseUrl}/accept-share?token=${accessToken}`,
      },
      message: 'Share created and invitation sent',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in POST /api/pages/[pageId]/shares:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
