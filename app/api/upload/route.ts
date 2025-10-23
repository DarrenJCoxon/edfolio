import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFile, isValidImageType, isValidFileSize } from '@/lib/storage';
import { config } from '@/lib/config';

/**
 * POST /api/upload
 * Upload an image file to Scaleway Object Storage (EU-based for GDPR compliance)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if storage features are enabled
    if (!config.features.storage.enabled) {
      return NextResponse.json(
        {
          error: 'File upload is not available',
          message: 'File upload requires Scaleway S3 credentials. Please add SCALEWAY_ACCESS_KEY, SCALEWAY_SECRET_KEY, and SCALEWAY_BUCKET_NAME to enable this feature.',
        },
        { status: 503 }
      );
    }

    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const noteId = formData.get('noteId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidImageType(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed (jpg, png, gif, webp)' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (!isValidFileSize(file.size, 5)) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Scaleway Object Storage
    const imageUrl = await uploadFile(buffer, {
      userId: session.user.id,
      noteId,
      filename: file.name,
      contentType: file.type,
    });

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
