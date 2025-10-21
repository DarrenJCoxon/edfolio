import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { scalewayClient, DEFAULT_MODEL } from '@/lib/ai/scaleway-client';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { prisma } from '@/lib/prisma';
import { getUserSpellingPreference, getSpellingPromptInstruction } from '@/lib/ai/spelling-utils';

export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check rate limit (same 10 req/min as rephrase)
    const rateLimitResult = checkRateLimit(session.user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'Retry-After': (rateLimitResult.retryAfter || 60).toString()
          }
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

    // Validate length: minimum 50 words (approx 250 chars), max 10000 words (approx 50000 chars)
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (wordCount < 50) {
      return NextResponse.json(
        { error: 'Text must be at least 50 words to summarize' },
        { status: 400 }
      );
    }

    if (wordCount > 10000) {
      return NextResponse.json(
        { error: 'Text must be under 10,000 words' },
        { status: 400 }
      );
    }

    // 4. Verify user owns the folio/note (security)
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

    // 6. Call Scaleway AI for summarization
    const result = await scalewayClient.chat({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert writing assistant. Summarize the following text concisely, capturing the key points and main ideas. The summary should be significantly shorter than the original (aim for 20-30% of original length) while preserving the essential information. ' +
            spellingInstruction +
            ' Return only the summary without explanations or additional commentary.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.5, // Lower temperature for more focused, consistent summaries
      max_tokens: Math.min(Math.ceil(wordCount * 0.4 * 4), 2000) // Aim for 30-40% of original length
    });

    const summary = result.choices[0].message.content.trim();

    // 7. Return response
    return NextResponse.json(
      {
        data: {
          originalText: text,
          summary: summary
        }
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        }
      }
    );

  } catch (error) {
    console.error('Summarize endpoint error:', error);

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
}
