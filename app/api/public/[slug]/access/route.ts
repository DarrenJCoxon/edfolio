import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/access-tokens';
import { ValidateAccessRequest } from '@/types';

/**
 * POST /api/public/[slug]/access
 * Validate access token for a published page
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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
