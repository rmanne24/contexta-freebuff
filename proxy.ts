import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken, googleConfigured } from '@/lib/auth';

/**
 * Auth gate at the edge of the app (Next.js 16 proxy convention — the
 * successor to middleware.ts).
 *
 * Unauthenticated visitors are redirected away from private UI routes before
 * they render, and rejected with 401 on private API routes before handlers
 * run. Route handlers still enforce session + ownership themselves — this
 * gate is defense in depth, never the only boundary.
 */
export function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    // Keep the /api/me unauthenticated shape ({ user: null, googleConfigured })
    // so client code that reads it (sign-in page, account menu) keeps working.
    return NextResponse.json(
      { error: 'Sign in to continue.', user: null, googleConfigured: googleConfigured() },
      { status: 401 }
    );
  }
  return NextResponse.redirect(new URL('/signin', req.url));
}

export const config = {
  matcher: [
    '/start/:path*',
    '/workspace/:path*',
    '/settings/:path*',
    '/api/workflows/:path*',
    '/api/me/:path*',
  ],
};
