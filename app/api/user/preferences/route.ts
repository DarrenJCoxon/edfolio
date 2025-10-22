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
    const { themePreference, fontPreference } = body;

    // Validate theme preference if provided
    if (themePreference !== undefined) {
      if (!['light', 'dark', 'system'].includes(themePreference)) {
        return NextResponse.json(
          { error: 'Invalid theme preference. Must be "light", "dark", or "system"' },
          { status: 400 }
        );
      }
    }

    // Validate font preference if provided
    if (fontPreference !== undefined) {
      if (!['sans', 'serif', 'dyslexic'].includes(fontPreference)) {
        return NextResponse.json(
          { error: 'Invalid font preference. Must be "sans", "serif", or "dyslexic"' },
          { status: 400 }
        );
      }
    }

    // 3. Build update object (only update provided fields)
    const updateData: { themePreference?: string; fontPreference?: string } = {};
    if (themePreference !== undefined) {
      updateData.themePreference = themePreference;
    }
    if (fontPreference !== undefined) {
      updateData.fontPreference = fontPreference;
    }

    // 4. Update database
    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    // 5. Return success
    return NextResponse.json({
      success: true,
      ...updateData,
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
