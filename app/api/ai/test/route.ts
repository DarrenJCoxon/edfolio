/**
 * AI Test Endpoint
 *
 * Provides a test endpoint to verify Scaleway AI integration is working correctly.
 * This endpoint:
 * - Validates user authentication
 * - Checks rate limits
 * - Sends a test message to Scaleway AI
 * - Returns the AI response
 *
 * All data processing occurs in EU (France, Paris datacenter) for GDPR compliance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { scalewayClient, ScalewayAPIError, DEFAULT_MODEL } from '@/lib/ai/scaleway-client';
import { checkRateLimit } from '@/lib/ai/rate-limiter';

/**
 * POST /api/ai/test
 *
 * Test the AI service connection with a simple message
 */
export async function POST(request: NextRequest) {
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
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message. Expected a non-empty string.' },
        { status: 400 }
      );
    }

    if (message.length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 10000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 10,000 characters.' },
        { status: 400 }
      );
    }

    // 4. Call Scaleway AI
    const result = await scalewayClient.chat({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // 5. Return response with rate limit headers
    return NextResponse.json(
      {
        data: {
          text: result.choices[0].message.content,
          usage: result.usage,
        },
        message: 'AI test successful',
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('AI test endpoint error:', error);

    // Handle Scaleway API errors
    if (error instanceof ScalewayAPIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
