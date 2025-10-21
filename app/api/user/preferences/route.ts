import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    // 1. Validate authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate input
    const body = await request.json();
    const { themePreference } = body;

    if (!themePreference || !['light', 'dark', 'system'].includes(themePreference)) {
      return NextResponse.json(
        { error: 'Invalid theme preference. Must be "light", "dark", or "system"' },
        { status: 400 }
      );
    }

    // 3. Update database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { themePreference },
    });

    // 4. Return success
    return NextResponse.json({
      success: true,
      themePreference,
    });

  } catch (error) {
    console.error('Error updating theme preference:', error);
    return NextResponse.json(
      { error: 'Failed to update theme preference' },
      { status: 500 }
    );
  }
}
