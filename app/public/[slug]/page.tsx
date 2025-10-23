import { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PublicPageLayout } from '@/components/public-page/PublicPageLayout';
import { verifyAccessToken } from '@/lib/access-tokens';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

/**
 * Extract a plain text excerpt from TipTap JSON content
 */
function extractExcerpt(content: unknown, maxLength: number): string {
  try {
    if (typeof content !== 'object' || content === null) {
      return 'Read this article on Edfolio.';
    }

    const contentObj = content as { type?: string; content?: unknown[] };

    // TipTap content structure: { type: 'doc', content: [...] }
    if (contentObj.type === 'doc' && Array.isArray(contentObj.content)) {
      // Find first paragraph with text
      for (const node of contentObj.content) {
        if (
          typeof node === 'object' &&
          node !== null &&
          'type' in node &&
          node.type === 'paragraph'
        ) {
          const paragraphNode = node as { content?: unknown[] };
          if (Array.isArray(paragraphNode.content)) {
            // Extract text from paragraph
            const text = paragraphNode.content
              .map((textNode) => {
                if (
                  typeof textNode === 'object' &&
                  textNode !== null &&
                  'text' in textNode
                ) {
                  return (textNode as { text: string }).text;
                }
                return '';
              })
              .join('');

            if (text.trim().length > 0) {
              return text.trim().substring(0, maxLength) +
                (text.length > maxLength ? '...' : '');
            }
          }
        }
      }
    }

    return 'Read this article on Edfolio.';
  } catch {
    return 'Read this article on Edfolio.';
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishedPage = await prisma.publishedPage.findUnique({
    where: { slug },
    include: {
      note: {
        select: {
          title: true,
          content: true,
        },
      },
    },
  });

  if (!publishedPage || !publishedPage.isPublished) {
    return {
      title: 'Page Not Found',
      description: 'This page does not exist or has been unpublished.',
    };
  }

  // Extract first paragraph from content for description
  const description = extractExcerpt(publishedPage.note.content, 160);

  return {
    title: publishedPage.note.title,
    description: description,
    openGraph: {
      title: publishedPage.note.title,
      description: description,
      type: 'article',
    },
  };
}

/**
 * Public page component (Server Component)
 */
export default async function PublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { token } = await searchParams;
  const session = await auth();

  // AUTHENTICATION GATE: Token-based shares require authentication
  // Public pages (no token) remain accessible without login
  if (token && !session) {
    // Auto-detect base URL from request headers
    const headersList = await headers();
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const host = headersList.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const callbackUrl = `${baseUrl}/public/${slug}?token=${token}`;
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    redirect(loginUrl);
  }

  // Check if user is accessing with a share token
  let sharePermission: 'read' | 'edit' | null = null;
  let shareToken: string | undefined = undefined;

  if (token && session?.user?.id) {
    const verification = await verifyAccessToken(token);
    if (verification.valid && verification.share) {
      sharePermission = verification.share.permission;
      shareToken = token;

      // FIRST-TIME ACCESS FLOW: Create PageCollaborator if it doesn't exist
      // This makes the document appear in the user's "Shared with Me" folio
      const existingCollaborator = await prisma.pageCollaborator.findUnique({
        where: {
          pageId_userId: {
            pageId: verification.share.pageId,
            userId: session.user.id,
          },
        },
      });

      if (!existingCollaborator) {
        // Create PageCollaborator on first access
        await prisma.pageCollaborator.create({
          data: {
            pageId: verification.share.pageId,
            userId: session.user.id,
            shareId: verification.share.id,
            role: verification.share.permission === 'edit' ? 'editor' : 'viewer',
          },
        });
        console.log(`✅ Created PageCollaborator for user ${session.user.email} on first access`);
      }
    }
  }

  const publishedPage = await prisma.publishedPage.findUnique({
    where: { slug },
    include: {
      note: {
        select: {
          id: true,
          title: true,
          content: true,
          folio: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  });

  // Return 404 if page not found or unpublished
  if (!publishedPage || !publishedPage.isPublished) {
    notFound();
  }

  // Check if current user is the owner
  const isOwner = session?.user?.id === publishedPage.note.folio.ownerId;

  return (
    <PublicPageLayout
      title={publishedPage.note.title}
      content={publishedPage.note.content}
      publishedAt={publishedPage.publishedAt}
      noteId={publishedPage.note.id}
      sharePermission={sharePermission}
      shareToken={shareToken}
      isOwner={isOwner}
      isAuthenticated={!!session}
    />
  );
}
