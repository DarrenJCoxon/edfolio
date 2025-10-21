import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PublicPageLayout } from '@/components/public-page/PublicPageLayout';

interface PageProps {
  params: Promise<{
    slug: string;
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
export default async function PublicPage({ params }: PageProps) {
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

  // Return 404 if page not found or unpublished
  if (!publishedPage || !publishedPage.isPublished) {
    notFound();
  }

  return (
    <PublicPageLayout
      title={publishedPage.note.title}
      content={publishedPage.note.content}
      publishedAt={publishedPage.publishedAt}
    />
  );
}
