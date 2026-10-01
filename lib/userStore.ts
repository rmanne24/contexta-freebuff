import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Per-user profile + API-key vault.
 * Keys are encrypted at rest with AES-256-GCM using a key derived (scrypt)
 * from AUTH_SECRET. Plaintext keys never leave the server after save;
 * the UI only ever receives masked previews and capability booleans.
 */

import { getRedis } from './redis';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', '.data', 'users')
  : path.join(process.cwd(), '.data', 'users');

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  picture?: string;
  /** Google account subject id (`sub`), stored on first sign-in for provider linkage. */
  googleSub?: string;
  createdAt: string;
  updatedAt?: string;
  lastProjectId?: string;
  keys: Record<string, { ciphertext: string; iv: string; tag: string; preview: string; updatedAt: string }>;
}

export type ApiKeyName = 'github' | 'openai' | 'anthropic' | 'gemini' | 'serp';

export const API_KEY_NAMES: ApiKeyName[] = ['github', 'openai', 'anthropic', 'gemini', 'serp'];

export const API_KEY_LABELS: Record<ApiKeyName, string> = {
  github: 'GitHub',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google AI (Gemini)',
  serp: 'SerpAPI (search)',
};

function encKey(): Buffer {
  return scryptSync(process.env.AUTH_SECRET || 'contexta-dev-secret-change-me', 'contexta-vault', 32);
}

function encrypt(plain: string): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return { ciphertext: ct.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

function decrypt(v: { ciphertext: string; iv: string; tag: string }): string {
  const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(v.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(v.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(v.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

export function maskKey(plain: string): string {
  if (plain.length <= 8) return '••••';
  return `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
}

function userIdFromEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 24);
}

function fileFor(userId: string): string {
  const safe = userId.replace(/[^a-z0-9_-]/gi, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function getUser(userId: string): Promise<UserRecord | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const data = await redis.get<UserRecord>(`user:${userId}`);
      return data || null;
    } catch (e) {
      console.error('Redis getUser error:', e);
    }
  }

  try {
    const raw = await fs.readFile(fileFor(userId), 'utf8');
    return JSON.parse(raw) as UserRecord;
  } catch {
    return null;
  }
}

export async function upsertUserFromGoogle(p: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<UserRecord> {
  const id = userIdFromEmail(p.email);
  const existing = await getUser(id);
  const rec: UserRecord = existing ?? {
    id,
    email: p.email,
    name: p.name || p.email.split('@')[0],
    createdAt: new Date().toISOString(),
    keys: {},
  };
  rec.email = p.email;
  if (p.name) rec.name = p.name;
  if (p.picture) rec.picture = p.picture;
  if (p.sub) rec.googleSub = p.sub;
  // Preserve the original createdAt; refresh updatedAt on every sign-in.
  rec.updatedAt = new Date().toISOString();
  await saveUser(rec);
  return rec;
}

export async function saveUser(rec: UserRecord): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`user:${rec.id}`, rec);
      return;
    } catch (e) {
      console.error('Redis saveUser error:', e);
    }
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(fileFor(rec.id), JSON.stringify(rec, null, 2), 'utf8');
}

/** Store or replace an API key (encrypted at rest). Returns the masked preview. */
export async function setApiKey(userId: string, name: ApiKeyName, plain: string): Promise<string> {
  const rec = await getUser(userId);
  if (!rec) throw new Error('User not found');
  const trimmed = plain.trim();
  if (!trimmed) throw new Error('Key is empty');
  rec.keys[name] = { ...encrypt(trimmed), preview: maskKey(trimmed), updatedAt: new Date().toISOString() };
  await saveUser(rec);
  return rec.keys[name].preview;
}

export async function deleteApiKey(userId: string, name: ApiKeyName): Promise<void> {
  const rec = await getUser(userId);
  if (!rec) throw new Error('User not found');
  delete rec.keys[name];
  await saveUser(rec);
}

/** Server-only: decrypt for actual use by the pipeline/actions. */
export async function getDecryptedKey(userId: string, name: ApiKeyName): Promise<string | null> {
  const rec = await getUser(userId);
  const v = rec?.keys[name];
  if (!v) return null;
  try {
    return decrypt(v);
  } catch {
    return null;
  }
}

export async function setLastProject(userId: string, projectId: string): Promise<void> {
  const rec = await getUser(userId);
  if (!rec) return;
  rec.lastProjectId = projectId;
  await saveUser(rec);
}

/** Safe view for the settings UI — never includes plaintext. */
export function publicUserView(rec: UserRecord): {
  id: string;
  email: string;
  name: string;
  picture?: string;
  lastProjectId?: string;
  keys: Record<string, { preview: string; updatedAt: string }>;
} {
  const keys: Record<string, { preview: string; updatedAt: string }> = {};
  for (const [k, v] of Object.entries(rec.keys)) keys[k] = { preview: v.preview, updatedAt: v.updatedAt };
  return {
    id: rec.id,
    email: rec.email,
    name: rec.name,
    picture: rec.picture,
    lastProjectId: rec.lastProjectId,
    keys,
  };
}
