import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { createSystemFoliosForUser } from '@/lib/system-folios';
import { z, ZodError } from 'zod';
import { withCsrfProtection } from '@/lib/api/csrf-validation';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
});

export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { email, password } = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and default folio in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: email.split('@')[0], // Use email prefix as default name
        },
      });

      // Create default folio for user
      await tx.folio.create({
        data: {
          name: 'My Folio',
          ownerId: newUser.id,
        },
      });

      return newUser;
    });

    // Create system folios for user (including "Shared with Me")
    // This is done outside the transaction to avoid blocking if it fails
    try {
      await createSystemFoliosForUser(user.id);
    } catch (error) {
      console.error('Failed to create system folios, but user was created:', error);
      // Don't fail the signup if system folio creation fails
      // It can be created later when the user first accesses the app
    }

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        message: 'User created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';
