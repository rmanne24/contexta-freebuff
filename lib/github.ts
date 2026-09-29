import { createHash } from 'crypto';

/**
 * Real GitHub action execution + verification.
 * Requires GITHUB_TOKEN in the environment. Every action is verified
 * against the API after execution before it is marked VERIFIED.
 */

export interface GitHubIssueResult {
  ok: boolean;
  issueNumber?: number;
  issueUrl?: string;
  repository: string;
  title: string;
  error?: string;
}

export function hasGitHubCredentials(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

function repoApi(repo: string): string {
  return `https://api.github.com/repos/${repo}`;
}

export async function verifyRepo(repo: string): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const res = await fetch(repoApi(repo), {
      headers: authHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401) {
      return { ok: false, error: 'GitHub rejected the server token (401). Set a valid GITHUB_TOKEN on the server to enable execution.' };
    }
    if (!res.ok) return { ok: false, error: `Repository check failed (HTTP ${res.status})` };
    const data = (await res.json()) as { full_name?: string; private?: boolean };
    if (data.private) return { ok: false, error: 'Repository is private — the issue would not be publicly visible.' };
    return { ok: true, name: data.full_name || repo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Repository check failed' };
  }
}

export async function createIssue(
  repo: string,
  title: string,
  body: string,
  labels: string[] = ['contexta']
): Promise<GitHubIssueResult> {
  if (!hasGitHubCredentials()) {
    return { ok: false, repository: repo, title, error: 'GITHUB_TOKEN is not configured on the server.' };
  }
  try {
    const res = await fetch(`${repoApi(repo)}/issues`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, labels }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as { number?: number; html_url?: string; message?: string };
    if (!res.ok) {
      return { ok: false, repository: repo, title, error: data.message || `GitHub returned HTTP ${res.status}` };
    }
    return { ok: true, repository: repo, title, issueNumber: data.number, issueUrl: data.html_url };
  } catch (e) {
    return { ok: false, repository: repo, title, error: e instanceof Error ? e.message : 'GitHub request failed' };
  }
}

/** Verify an issue actually exists on GitHub after creation. */
export async function verifyIssue(repo: string, number: number): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch(`${repoApi(repo)}/issues/${number}`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, error: `Verification fetch failed (HTTP ${res.status})` };
    const data = (await res.json()) as { html_url?: string; state?: string };
    return { ok: data.state === 'open' || Boolean(data.html_url), url: data.html_url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Verification failed' };
  }
}

/** Deterministic integrity hash over the exact action payload + result. */
export function integrityHash(parts: Array<string | number | undefined>): string {
  const h = createHash('sha256');
  h.update(parts.map((p) => String(p ?? '')).join('|'));
  return h.digest('hex');
}

/**
 * Token resolution order: per-request override (the signed-in user's vault key),
 * then GITHUB_TOKEN env. Lets each user execute with their own account.
 */
let overrideToken: string | null = null;

export function setGitHubToken(token: string | null): void {
  overrideToken = token;
}

function authHeaders(): Record<string, string> {
  const token = overrideToken || process.env.GITHUB_TOKEN || '';
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ContextaAgent/1.0',
  };
}
