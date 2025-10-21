import { auth } from '@/lib/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow requests to auth routes, public pages, and public assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/public')
  ) {
    return;
  }

  // Redirect to login if no auth session
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - login, signup (auth pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|login|signup|_next/static|_next/image|favicon.ico).*)',
  ],
};
