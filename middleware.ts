import { NextRequest, NextResponse } from 'next/server';

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/login', '/register', '/join', '/forgot-password'];

// Static asset patterns to skip
const SKIP_PATTERNS = [
  '/_next',
  '/api',
  '/favicon.ico',
  '/manifest.json',
  '/icons',
  '/images',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and internal Next.js routes
  if (SKIP_PATTERNS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip files with extensions (images, fonts, etc.)
  if (/\.\w{1,6}$/.test(pathname)) {
    return NextResponse.next();
  }

  // Always allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Check for session cookie
  // NOTE: the /login page must call the /api/auth/session endpoint after
  // Firebase signInWithEmailAndPassword to set this cookie.
  const session = request.cookies.get('session')?.value;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fine-grained role validation is delegated to AuthGuard (client-side),
  // which uses useCurrentUser() with a real-time Firestore listener.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
