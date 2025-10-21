import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envVars: {
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      AUTH_URL: !!process.env.AUTH_URL,
      DATABASE_URL: !!process.env.DATABASE_URL,
    },
    database: {
      connected: false,
      error: null as string | null,
    },
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1 as health_check`;
    checks.database.connected = true;
  } catch (error) {
    checks.database.connected = false;
    checks.database.error = error instanceof Error ? error.message : 'Unknown database error';
  }

  // Determine overall health status
  const isHealthy =
    checks.envVars.AUTH_SECRET &&
    checks.envVars.AUTH_URL &&
    checks.envVars.DATABASE_URL &&
    checks.database.connected;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}

export const dynamic = 'force-dynamic';
