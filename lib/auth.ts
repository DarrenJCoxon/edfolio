import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import authConfig from '@/auth.config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schema for credentials
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Full Auth.js instance with database adapter
// Uses edge-compatible base config + Prisma adapter for OAuth user creation
// Adds Credentials provider here (requires Prisma, not edge-compatible)
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
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
    strategy: 'jwt', // Required for Edge Runtime compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow all sign-ins - adapter handles user/account creation
      return true;
    },
    async jwt({ token, user }) {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID from token to session
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
});

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
