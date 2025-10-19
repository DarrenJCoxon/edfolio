import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const { handlers } = NextAuth(authOptions);
const { GET, POST } = handlers;

export { GET, POST };

export const runtime = 'nodejs';
