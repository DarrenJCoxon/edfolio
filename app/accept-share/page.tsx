import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/access-tokens';

export const metadata: Metadata = {
  title: 'Accept Share | Edfolio',
  description: 'Accept a shared document invitation',
};

interface PageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

/**
 * Share Acceptance Page
 *
 * This page handles the complete share acceptance flow:
 * 1. Requires authentication (redirects to login if needed)
 * 2. Verifies the share token
 * 3. Creates PageCollaborator record (makes doc appear in "Shared with Me")
 * 4. Redirects to main app where user can access the shared document
 */
export default async function AcceptSharePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  // Require share token
  if (!token) {
    redirect('/?error=missing_token');
  }

  // Require authentication
  const session = await auth();
  if (!session?.user?.id) {
    // Redirect to login with callback to this page
    const callbackUrl = `/accept-share?token=${encodeURIComponent(token)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  try {
    // Verify the access token
    const verification = await verifyAccessToken(token);

    if (!verification.valid || !verification.share) {
      console.error('Invalid or expired share token');
      redirect('/?error=invalid_token');
    }

    const share = verification.share;

    // Check if user is trying to accept their own share
    const publishedPage = await prisma.publishedPage.findUnique({
      where: { id: share.pageId },
      include: {
        note: {
          select: {
            title: true,
            folio: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!publishedPage) {
      console.error('Published page not found for share');
      redirect('/?error=page_not_found');
    }

    // Prevent owner from accepting their own share
    if (publishedPage.note.folio.ownerId === session.user.id) {
      console.log('Owner attempting to accept their own share - redirecting to document');
      redirect('/');
    }

    // Check if PageCollaborator already exists
    const existingCollaborator = await prisma.pageCollaborator.findUnique({
      where: {
        pageId_userId: {
          pageId: share.pageId,
          userId: session.user.id,
        },
      },
    });

    if (!existingCollaborator) {
      // Create PageCollaborator - this makes the document appear in "Shared with Me" folio
      await prisma.pageCollaborator.create({
        data: {
          pageId: share.pageId,
          userId: session.user.id,
          shareId: share.id,
          role: share.permission === 'edit' ? 'editor' : 'viewer',
        },
      });

      console.log(`✅ Created PageCollaborator for ${session.user.email} - Document will appear in "Shared with Me"`);
    } else {
      console.log(`ℹ️ PageCollaborator already exists for ${session.user.email}`);
    }

    // Update share access tracking
    await prisma.pageShare.update({
      where: { id: share.id },
      data: {
        lastAccessedAt: new Date(),
        accessCount: {
          increment: 1,
        },
      },
    });

    // Success! Redirect to main app
    // The document will now appear in the user's "Shared with Me" folio
    redirect('/?share_accepted=true');
  } catch (error) {
    console.error('Error in share acceptance flow:', error);
    redirect('/?error=acceptance_failed');
  }
}
