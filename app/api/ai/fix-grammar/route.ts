import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { scalewayClient, DEFAULT_MODEL } from '@/lib/ai/scaleway-client';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { prisma } from '@/lib/prisma';
import { getUserSpellingPreference, getSpellingPromptInstruction } from '@/lib/ai/spelling-utils';
import { withCsrfProtection } from '@/lib/api/csrf-validation';

/**
 * POST /api/ai/fix-grammar
 *
 * Fix grammar and spelling errors in selected text using Scaleway AI.
 * Uses user's spelling preference (UK or US English) for corrections.
 *
 * Request body:
 * - text: string (1-5000 characters)
 * - vaultId: string (for ownership verification)
 * - noteId: string (for ownership verification)
 *
 * Response:
 * - 200: { data: { originalText: string, correctedText: string, hasChanges: boolean } }
 * - 401: Unauthorized
 * - 400: Invalid input
 * - 403: Access denied
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // 1. Validate authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check rate limit
    const rateLimitResult = checkRateLimit(session.user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // 3. Parse and validate input
    const body = await request.json();
    const { text, vaultId, noteId } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid text' },
        { status: 400 }
      );
    }

    if (text.length < 1 || text.length > 5000) {
      return NextResponse.json(
        { error: 'Text must be between 1 and 5000 characters' },
        { status: 400 }
      );
    }

    // 4. Verify user owns the folio (security)
    if (vaultId && noteId) {
      const folio = await prisma.folio.findFirst({
        where: {
          id: vaultId,
          ownerId: session.user.id
        }
      });

      if (!folio) {
        return NextResponse.json(
          { error: 'Folio not found or access denied' },
          { status: 403 }
        );
      }
    }

    // 5. Fetch user's spelling preference
    const spellingPref = await getUserSpellingPreference(session.user.id);
    const spellingInstruction = getSpellingPromptInstruction(spellingPref);

    // 6. Call Scaleway AI for grammar correction
    const result = await scalewayClient.chat({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert copy editor. Fix all spelling and grammar errors in the following text. ' +
            spellingInstruction +
            ' Preserve the original meaning and tone. Return only the corrected text without explanations or additional commentary.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3, // Low temperature for consistent, accurate corrections
      max_tokens: Math.max(1000, Math.ceil(text.length * 1.2)) // Allow slightly longer for corrections
    });

    const correctedText = result.choices[0].message.content.trim();

    // 7. Determine if changes were made
    const hasChanges = text.trim() !== correctedText;

    // 8. Return response
    return NextResponse.json(
      {
        data: {
          originalText: text,
          correctedText: correctedText,
          hasChanges: hasChanges
        }
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        },
      }
    );

  } catch (error) {
    console.error('Fix grammar endpoint error:', error);

    // Handle specific error types from Scaleway client
    if (error instanceof Error && 'status' in error) {
      const statusCode = (error as { status: number }).status;
      return NextResponse.json(
        { error: error.message },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
