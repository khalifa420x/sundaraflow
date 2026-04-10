import { NextRequest, NextResponse } from 'next/server'

// Routes publiques — jamais redirigées
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/join',
  '/forgot-password',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('[middleware] Request:', pathname)

  // Assets Next.js — toujours laisser passer
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Routes publiques — toujours laisser passer, jamais rediriger
  const isPublicRoute = PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(route + '/')
  )

  if (isPublicRoute) {
    console.log('[middleware] Public route — pass through:', pathname)
    return NextResponse.next()
  }

  // Routes privées — vérifier session cookie
  const sessionCookie = request.cookies.get('session')?.value

  if (!sessionCookie) {
    console.log('[middleware] No session — redirect to /login from:', pathname)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  console.log('[middleware] Session found — pass through:', pathname)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
