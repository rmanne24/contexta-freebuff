import { NextResponse } from 'next/server';
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleConfigured,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
  appUrlFromRequest,
  createSessionToken,
} from '@/lib/auth';
import { upsertUserFromGoogle } from '@/lib/userStore';
import { adoptAnonymousWorkflows } from '@/lib/store';

export async function GET(req: Request) {
  const base = appUrlFromRequest(req);
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const stateCookie = req.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === OAUTH_STATE_COOKIE)?.[1];

  const fail = (reason: string) => NextResponse.redirect(`${base}/signin?error=${encodeURIComponent(reason)}`);

  if (!googleConfigured()) return fail('google_not_configured');
  if (!code) return fail('missing_code');
  if (!state || !stateCookie || state !== decodeURIComponent(stateCookie)) {
    return fail('state_mismatch');
  }

  try {
    const tokens = await exchangeGoogleCode(code, `${base}/api/auth/google/callback`);
    const profile = await fetchGoogleProfile(tokens.access_token);
    if (!profile.email) return fail('no_email');

    const user = await upsertUserFromGoogle(profile);
    await adoptAnonymousWorkflows(user.id);

    const res = NextResponse.redirect(`${base}/start`);
    const opts = sessionCookieOptions();
    res.cookies.set(SESSION_COOKIE, createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    }), opts);
    res.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    return fail(e instanceof Error ? e.message.slice(0, 120) : 'oauth_failed');
  }
}
