import { NextResponse } from 'next/server';
import {
  googleConfigured,
  googleAuthUrl,
  newOAuthState,
  OAUTH_STATE_COOKIE,
  oauthStateCookieOptions,
  appUrlFromRequest,
} from '@/lib/auth';

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(`${appUrlFromRequest(req)}/signin?error=google_not_configured`);
  }
  const state = newOAuthState();
  const redirectUri = `${appUrlFromRequest(req)}/api/auth/google/callback`;
  const res = NextResponse.redirect(googleAuthUrl(redirectUri, state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
  return res;
}
