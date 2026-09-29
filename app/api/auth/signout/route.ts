import { NextResponse } from 'next/server';
import { SESSION_COOKIE, appUrlFromRequest } from '@/lib/auth';

export async function GET(req: Request) {
  const res = NextResponse.redirect(`${appUrlFromRequest(req)}/`);
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}

export async function POST(req: Request) {
  return GET(req);
}
