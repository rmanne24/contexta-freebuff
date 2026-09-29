import { NextResponse } from 'next/server';
import { actionCapability } from '@/lib/pipeline';
import { sessionFromRequest, googleConfigured } from '@/lib/auth';
import { getUser } from '@/lib/userStore';

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  let userGithub = false;
  if (session) {
    const rec = await getUser(session.id);
    userGithub = Boolean(rec?.keys?.github);
  }
  const cap = actionCapability();
  return NextResponse.json({
    github: cap.github || userGithub,
    githubViaUserKey: userGithub,
    google: googleConfigured(),
  });
}
