import { NextRequest, NextResponse } from 'next/server';
import { expireShares } from '@/lib/background-jobs/share-expiry';

/**
 * GET /api/cron/expire-shares
 * Cron job endpoint to expire shares
 * Should be called daily via Vercel Cron or Railway Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow without secret
    if (process.env.NODE_ENV !== 'development') {
      if (!cronSecret) {
        console.error('CRON_SECRET not configured');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.error('Invalid cron secret');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Run expiry check
    const result = await expireShares();

    return NextResponse.json({
      success: true,
      expired: result.expired,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to expire shares',
      },
      { status: 500 }
    );
  }
}
