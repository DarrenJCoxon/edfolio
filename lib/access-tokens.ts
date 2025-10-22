import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { PageShare, ShareStatus } from '@prisma/client';

/**
 * Generate a cryptographically secure access token
 * @returns 256-bit base64url-encoded token (43 characters)
 */
export async function generateAccessToken(): Promise<string> {
  let token: string;
  let isUnique = false;

  // Keep generating until we get a unique token
  while (!isUnique) {
    // Generate 32 random bytes (256 bits)
    const buffer = randomBytes(32);

    // Encode as base64url (URL-safe, no padding)
    token = buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Check if token already exists
    const existing = await prisma.pageShare.findUnique({
      where: { accessToken: token },
      select: { id: true },
    });

    if (!existing) {
      isUnique = true;
      return token;
    }
  }

  throw new Error('Failed to generate unique access token');
}

/**
 * Result of access token verification
 */
export interface AccessTokenVerificationResult {
  valid: boolean;
  share: PageShare | null;
  error?: string;
}

/**
 * Verify an access token and update access tracking
 * @param token The access token to verify
 * @returns Verification result with share data if valid
 */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenVerificationResult> {
  try {
    // Query database for the token
    const share = await prisma.pageShare.findUnique({
      where: { accessToken: token },
      include: {
        page: {
          select: {
            id: true,
            isPublished: true,
            noteId: true,
          },
        },
      },
    });

    // Token not found
    if (!share) {
      return {
        valid: false,
        share: null,
        error: 'Invalid access token',
      };
    }

    // Check if share is revoked
    if (share.status !== 'active') {
      return {
        valid: false,
        share: null,
        error: 'Access has been revoked',
      };
    }

    // Check if token has expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      return {
        valid: false,
        share: null,
        error: 'Access token has expired',
      };
    }

    // Check if page is still published
    if (!share.page.isPublished) {
      return {
        valid: false,
        share: null,
        error: 'Page is no longer published',
      };
    }

    // Token is valid - update access tracking
    await prisma.pageShare.update({
      where: { id: share.id },
      data: {
        lastAccessedAt: new Date(),
        accessCount: {
          increment: 1,
        },
      },
    });

    return {
      valid: true,
      share: share,
    };
  } catch (error) {
    console.error('Error verifying access token:', error);
    return {
      valid: false,
      share: null,
      error: 'Failed to verify access token',
    };
  }
}

/**
 * Revoke an access token (page owner only)
 * @param shareId The share ID to revoke
 * @param userId The user ID attempting the revocation (must be page owner)
 * @returns Success boolean
 */
export async function revokeAccessToken(
  shareId: string,
  userId: string
): Promise<boolean> {
  try {
    // Find the share and verify ownership
    const share = await prisma.pageShare.findUnique({
      where: { id: shareId },
      include: {
        page: {
          include: {
            note: {
              include: {
                folio: {
                  select: { ownerId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!share) {
      throw new Error('Share not found');
    }

    // Verify user is the page owner
    if (share.page.note.folio.ownerId !== userId) {
      throw new Error('Unauthorized: Only page owner can revoke access');
    }

    // Update status to revoked
    await prisma.pageShare.update({
      where: { id: shareId },
      data: { status: 'revoked' as ShareStatus },
    });

    return true;
  } catch (error) {
    console.error('Error revoking access token:', error);
    return false;
  }
}
