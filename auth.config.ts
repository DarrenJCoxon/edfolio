import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Edge-compatible configuration (no database adapter, no Prisma)
// This config is used by middleware which runs in Edge Runtime
// Credentials provider is added only in lib/auth.ts (Node.js runtime)
export default {
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
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
} satisfies NextAuthConfig;
