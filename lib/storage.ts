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

// Validate required environment variables
const requiredEnvVars = [
  'SCALEWAY_ACCESS_KEY',
  'SCALEWAY_SECRET_KEY',
  'SCALEWAY_BUCKET_NAME',
  'SCALEWAY_REGION',
] as const;

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`Missing environment variable: ${envVar}`);
  }
});

// Initialize S3 client for Scaleway Object Storage
const s3Client = new S3Client({
  region: process.env.SCALEWAY_REGION || 'fr-par',
  endpoint: `https://s3.${process.env.SCALEWAY_REGION || 'fr-par'}.scw.cloud`,
  credentials: {
    accessKeyId: process.env.SCALEWAY_ACCESS_KEY || '',
    secretAccessKey: process.env.SCALEWAY_SECRET_KEY || '',
  },
});

const BUCKET_NAME = process.env.SCALEWAY_BUCKET_NAME || '';

/**
 * Upload a file to Scaleway Object Storage
 *
 * @param file - The file to upload (as Buffer)
 * @param options - Upload options
 * @returns The public URL of the uploaded file
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
  const region = process.env.SCALEWAY_REGION || 'fr-par';
  const publicUrl = `https://${BUCKET_NAME}.s3.${region}.scw.cloud/${key}`;

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
