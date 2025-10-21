import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { SpellingPreference } from '@/types';

/**
 * GET /api/settings/spelling
 *
 * Fetch the current user's spelling preference.
 *
 * Response:
 * - 200: { data: { spellingPreference: 'UK' | 'US' } }
 * - 401: Unauthorized
 * - 404: User not found
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Fetch user's spelling preference
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { spellingPreference: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 3. Return preference
    return NextResponse.json({
      data: {
        spellingPreference: user.spellingPreference as SpellingPreference
      }
    });

  } catch (error) {
    console.error('Get spelling preference error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/spelling
 *
 * Update the current user's spelling preference.
 *
 * Request body:
 * - spellingPreference: 'UK' | 'US'
 *
 * Response:
 * - 200: { data: { spellingPreference: 'UK' | 'US' }, message: string }
 * - 401: Unauthorized
 * - 400: Invalid input
 * - 500: Internal server error
 */
export async function PUT(request: NextRequest) {
  try {
    // 1. Validate authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { spellingPreference } = body;

    if (!spellingPreference || !['UK', 'US'].includes(spellingPreference)) {
      return NextResponse.json(
        { error: 'Invalid spelling preference. Must be "UK" or "US"' },
        { status: 400 }
      );
    }

    // 3. Update user's spelling preference
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { spellingPreference },
      select: { spellingPreference: true }
    });

    // 4. Return updated preference
    return NextResponse.json({
      data: {
        spellingPreference: user.spellingPreference as SpellingPreference
      },
      message: 'Spelling preference updated successfully'
    });

  } catch (error) {
    console.error('Update spelling preference error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
