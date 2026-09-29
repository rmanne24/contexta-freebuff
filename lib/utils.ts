/** Shared helpers for the Contexta intelligence pipeline. */

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24);
}

export function excerptAround(text: string, needle: string, radius = 240): string | null {
  const t = text.replace(/\s+/g, ' ');
  if (!needle) return null;
  const i = t.toLowerCase().indexOf(needle.toLowerCase());
  if (i === -1) return null;
  const start = Math.max(0, i - radius / 2);
  const end = Math.min(t.length, i + needle.length + radius / 2);
  return (start > 0 ? '…' : '') + t.slice(start, end).trim() + (end < t.length ? '…' : '');
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

export function shortenHash(h: string): string {
  if (!h) return '—';
  return `${h.slice(0, 4)}f…${h.slice(-4)}`;
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function classifyKind(text: string): string {
  const t = text.toLowerCase();
  if (/\b(hackathon|build ?fast|challenge|build ?challenge)\b/.test(t)) return 'hackathon';
  if (/\b(internship|intern)\b/.test(t)) return 'internship';
  if (/\b(research|phd|fellowship|lab)\b/.test(t)) return 'research';
  if (/\b(grant|funding)\b/.test(t)) return 'grant';
  if (/\b(job|role|position|hiring)\b/.test(t)) return 'job';
  if (/\b(investor|pitch|seed|vc)\b/.test(t)) return 'investor';
  if (/\b(competition|olympiad)\b/.test(t)) return 'competition';
  if (/\b(collab|partnership|co-found)\b/.test(t)) return 'collaboration';
  return 'other';
}

/** Parse "owner/repo" from a GitHub URL or bare slug. */
export function parseRepo(input: string): string | null {
  const m = input.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
  if (m) return `${m[1]}/${m[2]}`.replace(/\.git$/, '');
  const bare = input.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (bare) return `${bare[1]}/${bare[2]}`;
  return null;
}
