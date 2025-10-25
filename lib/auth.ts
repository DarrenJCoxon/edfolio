import type { NextAuthConfig } from 'next-auth';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const authOptions: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate input
          const { email, password } = loginSchema.parse(credentials);

          // Find user
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            return null;
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only run for OAuth providers (Google)
      if (account?.provider !== 'google') {
        return true;
      }

      try {
        // Check if user exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { folios: true },
        });

        if (!existingUser) {
          // New user - will be created by NextAuth
          // Default folio creation handled in events.createUser
          return true;
        }

        // Existing user - link Google account if not already linked
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (!existingAccount) {
          // Link Google account to existing user
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | null | undefined,
            },
          });
        }

        // Update user profile with Google data if not set
        if (!existingUser.name || !existingUser.image) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: existingUser.name || user.name,
              image: existingUser.image || user.image,
              emailVerified: existingUser.emailVerified || new Date(),
            },
          });
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Create default folio for new users (Google or credentials)
      try {
        await prisma.folio.create({
          data: {
            name: 'My Folio',
            ownerId: user.id,
            isSystem: false,
          },
        });
      } catch (error) {
        console.error('Error creating default folio:', error);
      }
    },
  },
  secret: process.env.AUTH_SECRET,
};

// Export auth helpers
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// Helper functions
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
