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
  return Boolean(overrideToken || process.env.GITHUB_TOKEN);
}

/* ---------------- Repository context (project evidence) ---------------- */

export interface RepoContext {
  ok: boolean;
  repository: string;
  description?: string;
  homepage?: string;
  topics?: string[];
  language?: string;
  defaultBranch?: string;
  readmePath?: string;
  readmeText?: string;
  rootFiles?: string[];
  error?: string;
}

/**
 * Read the user's repository through the GitHub API so project claims can be
 * backed by real files (README, repo metadata, file layout) instead of the
 * project description alone. Works with the user's vault token when present;
 * falls back to unauthenticated reads (public repos only).
 */
export async function fetchRepoContext(repo: string, token?: string | null): Promise<RepoContext> {
  const headers = authHeaders(token);
  try {
    const metaRes = await fetch(repoApi(repo), { headers, signal: AbortSignal.timeout(10000) });
    if (metaRes.status === 404) {
      return { ok: false, repository: repo, error: 'Repository not found or not public.' };
    }
    if (metaRes.status === 403) {
      return { ok: false, repository: repo, error: 'GitHub API rate limit reached — add a GitHub key in Settings to raise it.' };
    }
    if (!metaRes.ok) {
      return { ok: false, repository: repo, error: `Repository lookup failed (HTTP ${metaRes.status})` };
    }
    const meta = (await metaRes.json()) as {
      full_name?: string;
      description?: string;
      homepage?: string;
      topics?: string[];
      language?: string;
      default_branch?: string;
    };

    let readmePath: string | undefined;
    let readmeText: string | undefined;
    try {
      const readmeRes = await fetch(`${repoApi(repo)}/readme`, { headers, signal: AbortSignal.timeout(10000) });
      if (readmeRes.ok) {
        const data = (await readmeRes.json()) as { path?: string; content?: string; encoding?: string };
        readmePath = data.path;
        if (data.content) {
          readmeText = Buffer.from(data.content, data.encoding === 'base64' ? 'base64' : 'utf8')
            .toString('utf8')
            .slice(0, 24000);
        }
      }
    } catch {
      /* README is optional */
    }

    let rootFiles: string[] | undefined;
    try {
      const contentsRes = await fetch(`${repoApi(repo)}/contents`, { headers, signal: AbortSignal.timeout(10000) });
      if (contentsRes.ok) {
        const data = (await contentsRes.json()) as Array<{ name?: string; type?: string }>;
        if (Array.isArray(data)) {
          rootFiles = data
            .map((f) => (f.type === 'dir' ? `${f.name}/` : f.name || ''))
            .filter(Boolean)
            .slice(0, 60);
        }
      }
    } catch {
      /* file list is optional */
    }

    return {
      ok: true,
      repository: meta.full_name || repo,
      description: meta.description,
      homepage: meta.homepage || undefined,
      topics: Array.isArray(meta.topics) ? meta.topics.slice(0, 12) : undefined,
      language: meta.language || undefined,
      defaultBranch: meta.default_branch || undefined,
      readmePath,
      readmeText,
      rootFiles,
    };
  } catch (e) {
    return { ok: false, repository: repo, error: e instanceof Error ? e.message : 'Repository lookup failed' };
  }
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

function authHeaders(explicitToken?: string | null): Record<string, string> {
  const token = explicitToken || overrideToken || process.env.GITHUB_TOKEN || '';
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ContextaAgent/1.0',
  };
}
