import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { verifyAccessToken } from '@/lib/access-tokens';
import { ValidateAccessRequest } from '@/types';

/**
 * POST /api/public/[slug]/access
 * Validate access token for a published page and create PageCollaborator on first access
 * REQUIRES AUTHENTICATION
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    // Authentication required for token-based access
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: ValidateAccessRequest = await request.json();

    if (!body.accessToken) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Access token is required',
        },
        { status: 400 }
      );
    }

    // Verify the access token
    const verification = await verifyAccessToken(body.accessToken);

    if (!verification.valid || !verification.share) {
      return NextResponse.json({
        valid: false,
        error: verification.error || 'Invalid access token',
      });
    }

    // Verify the token belongs to the requested page
    const publishedPage = await prisma.publishedPage.findUnique({
      where: { slug },
      include: {
        note: {
          select: {
            id: true,
            title: true,
            content: true,
          },
        },
      },
    });

    if (!publishedPage) {
      return NextResponse.json({
        valid: false,
        error: 'Page not found',
      });
    }

    if (verification.share.pageId !== publishedPage.id) {
      return NextResponse.json({
        valid: false,
        error: 'Access token does not match this page',
      });
    }

    // Create PageCollaborator record on first access (upsert to handle duplicates)
    await prisma.pageCollaborator.upsert({
      where: {
        pageId_userId: {
          pageId: publishedPage.id,
          userId: session.user.id,
        },
      },
      create: {
        pageId: publishedPage.id,
        userId: session.user.id,
        shareId: verification.share.id,
        role: verification.share.permission === 'edit' ? 'editor' : 'viewer',
      },
      update: {
        // Update share reference if token changed
        shareId: verification.share.id,
      },
    });

    // Update last accessed time on share
    await prisma.pageShare.update({
      where: { id: verification.share.id },
      data: { lastAccessedAt: new Date() },
    });

    // Return successful validation with page data
    return NextResponse.json({
      valid: true,
      permission: verification.share.permission,
      pageData: {
        id: publishedPage.id,
        title: publishedPage.note.title,
        slug: publishedPage.slug,
        content: publishedPage.note.content,
      },
    });
  } catch (error) {
    console.error('Error validating access token:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
