import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  generateSlugFromTitle,
  generateUniqueSlug,
} from '@/lib/slug-generator';

/**
 * POST /api/notes/[id]/publish
 * Publish a note as a public page
 *
 * Authentication: Required
 * Authorization: Note owner only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: noteId } = await params;

    // Fetch note with folio ownership information
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        title: true,
        folio: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    // Verify note exists
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Verify user owns the note
    if (note.folio.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to publish this note" },
        { status: 403 }
      );
    }

    // Check if note is already published
    const existingPublication = await prisma.publishedPage.findUnique({
      where: { noteId },
      select: {
        isPublished: true,
        slug: true,
      },
    });

    if (existingPublication && existingPublication.isPublished) {
      return NextResponse.json(
        {
          error: 'Page is already published',
          data: {
            slug: existingPublication.slug,
            publicUrl: `/public/${existingPublication.slug}`,
          },
        },
        { status: 409 }
      );
    }

    // Generate slug from note title (Notion-style: title-slug-shortid)
    const baseSlug = generateSlugFromTitle(note.title);
    const { slug, shortId } = await generateUniqueSlug(baseSlug, noteId);

    let publishedPage;

    // If previously published but unpublished, update existing record
    if (existingPublication) {
      publishedPage = await prisma.publishedPage.update({
        where: { noteId },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          slug,
          shortId,
        },
        select: {
          slug: true,
        },
      });
    } else {
      // Create new publication record
      publishedPage = await prisma.publishedPage.create({
        data: {
          noteId,
          slug,
          shortId,
          isPublished: true,
        },
        select: {
          slug: true,
        },
      });
    }

    return NextResponse.json({
      data: {
        slug: publishedPage.slug,
        shortId: shortId,
        publicUrl: `/public/${publishedPage.slug}`,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/notes/[id]/publish:', error);

    // Handle reserved slug errors
    if (
      error instanceof Error &&
      error.message.includes('reserved')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle uniqueness errors
    if (
      error instanceof Error &&
      error.message.includes('Unable to generate unique slug')
    ) {
      return NextResponse.json(
        {
          error:
            'Unable to generate a unique URL for this page. Please try renaming the page.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to publish page' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]/publish
 * Unpublish a note (make public page inaccessible)
 *
 * Authentication: Required
 * Authorization: Note owner only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: noteId } = await params;

    // Fetch note with folio ownership information
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        folio: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    // Verify note exists
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Verify user owns the note
    if (note.folio.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to unpublish this note" },
        { status: 403 }
      );
    }

    // Find published page
    const publishedPage = await prisma.publishedPage.findUnique({
      where: { noteId },
      select: {
        isPublished: true,
      },
    });

    if (!publishedPage) {
      return NextResponse.json(
        { error: 'Page is not published' },
        { status: 404 }
      );
    }

    if (!publishedPage.isPublished) {
      return NextResponse.json(
        { error: 'Page is already unpublished' },
        { status: 404 }
      );
    }

    // Soft delete: set isPublished to false (preserve slug for re-publishing)
    await prisma.publishedPage.update({
      where: { noteId },
      data: {
        isPublished: false,
      },
    });

    return NextResponse.json({
      message: 'Page unpublished successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]/publish:', error);
    return NextResponse.json(
      { error: 'Failed to unpublish page' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
