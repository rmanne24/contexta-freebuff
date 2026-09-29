import { NextResponse } from 'next/server';
import { sessionFromRequest, googleConfigured } from '@/lib/auth';
import {
  getUser,
  publicUserView,
  setApiKey,
  deleteApiKey,
  API_KEY_NAMES,
  type ApiKeyName,
} from '@/lib/userStore';

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return NextResponse.json({ user: null, googleConfigured: googleConfigured() });
  const rec = await getUser(session.id);
  return NextResponse.json({
    user: rec ? publicUserView(rec) : null,
    googleConfigured: googleConfigured(),
  });
}

export async function POST(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const rec = await getUser(session.id);
  if (!rec) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const body = (await req.json()) as { op?: string; name?: string; key?: string };
  const name = body.name as ApiKeyName | undefined;

  if (body.op === 'set_key') {
    if (!name || !API_KEY_NAMES.includes(name)) {
      return NextResponse.json({ error: 'Unknown key name.' }, { status: 400 });
    }
    if (!body.key || !body.key.trim()) {
      return NextResponse.json({ error: 'Key is empty.' }, { status: 400 });
    }
    const preview = await setApiKey(rec.id, name, body.key);
    const fresh = await getUser(rec.id);
    return NextResponse.json({ ok: true, preview, keys: fresh ? publicUserView(fresh).keys : {} });
  }

  if (body.op === 'delete_key') {
    if (!name || !API_KEY_NAMES.includes(name)) {
      return NextResponse.json({ error: 'Unknown key name.' }, { status: 400 });
    }
    await deleteApiKey(rec.id, name);
    const fresh = await getUser(rec.id);
    return NextResponse.json({ ok: true, keys: fresh ? publicUserView(fresh).keys : {} });
  }

  return NextResponse.json({ error: 'Unknown op.' }, { status: 400 });
}
