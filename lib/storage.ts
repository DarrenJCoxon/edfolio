/**
 * Scaleway Object Storage Utility
 *
 * Provides S3-compatible object storage functionality using Scaleway's EU-based infrastructure.
 * This ensures GDPR compliance by keeping all data within EU regions.
 *
 * @see https://www.scaleway.com/en/object-storage/
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';
import { config } from '@/lib/config';

// Initialize S3 client for Scaleway Object Storage (only if configured)
let s3Client: S3Client | undefined;
let BUCKET_NAME = '';

if (config.features.storage.enabled) {
  s3Client = new S3Client({
    region: config.scalewayStorage.region,
    endpoint: config.scalewayStorage.getEndpoint(),
    credentials: {
      accessKeyId: config.scalewayStorage.accessKey,
      secretAccessKey: config.scalewayStorage.secretKey,
    },
  });
  BUCKET_NAME = config.scalewayStorage.bucketName;
} else if (typeof window === 'undefined') {
  // Only log on server side
  console.warn('⚠️  File storage is disabled - missing Scaleway S3 credentials');
}

/**
 * Upload a file to Scaleway Object Storage
 *
 * @param file - The file to upload (as Buffer)
 * @param options - Upload options
 * @returns The public URL of the uploaded file
 * @throws Error if storage is not configured
 */
export async function uploadFile(
  file: Buffer,
  options: {
    userId: string;
    noteId?: string;
    filename: string;
    contentType: string;
  }
): Promise<string> {
  // Check if storage is configured
  if (!config.features.storage.enabled || !s3Client) {
    throw new Error('File storage is not configured. Please add Scaleway S3 credentials.');
  }

  const { userId, noteId, filename, contentType } = options;

  // Generate unique key with user/note organization
  const ext = filename.split('.').pop() || 'jpg';
  const uniqueFilename = `${nanoid()}.${ext}`;
  const key = noteId
    ? `images/${userId}/${noteId}/${uniqueFilename}`
    : `images/${userId}/temp/${uniqueFilename}`;

  // Upload to Scaleway Object Storage
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    // Make the object publicly readable
    ACL: 'public-read',
  });

  await s3Client.send(command);

  // Return public URL
  const publicUrl = `https://${BUCKET_NAME}.s3.${config.scalewayStorage.region}.scw.cloud/${key}`;

  return publicUrl;
}

/**
 * Delete a file from Scaleway Object Storage
 *
 * @param fileUrl - The public URL of the file to delete
 * @returns True if deletion was successful
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    // Extract the key from the URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file from Object Storage:', error);
    return false;
  }
}

/**
 * Validate file type
 *
 * @param contentType - The MIME type to validate
 * @returns True if the file type is allowed
 */
export function isValidImageType(contentType: string): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  return allowedTypes.includes(contentType);
}

/**
 * Validate file size
 *
 * @param size - The file size in bytes
 * @param maxSizeMB - Maximum file size in megabytes (default: 5MB)
 * @returns True if the file size is within limits
 */
export function isValidFileSize(size: number, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}
