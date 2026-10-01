import type { Source } from './types';
import { domainOf } from './utils';

/**
 * Real retrieval: fetch live pages from the web, extract readable text,
 * and support same-site link discovery. A source is only included if it
 * was actually retrieved — no fake data.
 */

const UA =
  'Mozilla/5.0 (compatible; ContextaResearchBot/1.0; +https://contexta.app)';

export interface FetchResult {
  url: string;
  finalUrl: string;
  title: string;
  text: string;
  rawHtml: string;
  wordCount: number;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&#x2F;/g, '/')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|td|th|header|footer|main|nav)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export function metaDescription(html: string): string | null {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  return m ? decodeEntities(m[1]).trim().slice(0, 400) : null;
}

export async function fetchPage(url: string, timeoutMs = 12000): Promise<FetchResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });
    const finalUrl = res.url || url;
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/text\/html|text\/plain|application\/(xhtml|xml|json)/.test(ct)) {
      throw new Error(`Unsupported content type: ${ct || 'unknown'}`);
    }
    const raw = await res.text();
    const isHtml = /<html|<body|<meta|<div/i.test(raw);
    const titleMatch = isHtml ? raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] : null;
    const text = isHtml ? htmlToText(raw) : raw.slice(0, 40000);
    return {
      url,
      finalUrl,
      title: decodeEntities(titleMatch ?? '').trim().slice(0, 140) || domainOf(url),
      text,
      rawHtml: raw,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Extract link candidates from raw HTML (hrefs), scored by relevance. */
export function extractLinks(rawHtml: string, baseUrl: string): Array<{ url: string; score: number }> {
  const out = new Map<string, number>();
  const base = (() => {
    try {
      return new URL(baseUrl);
    } catch {
      return null;
    }
  })();
  if (!base) return [];
  const hrefRe = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(rawHtml)) !== null) {
    const href = m[1].trim();
    if (!href || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    let abs: string;
    try {
      abs = new URL(href, base).toString();
    } catch {
      continue;
    }
    const norm = normalize(abs);
    if (!norm) continue;
    const score = scoreUrl(norm);
    const prev = out.get(norm);
    if (prev === undefined || score > prev) out.set(norm, score);
  }
  return [...out.entries()].map(([url, score]) => ({ url, score }));
}

export function scoreUrl(url: string): number {
  let s = 0;
  const u = url.toLowerCase();
  // Priority order: exact application page → eligibility → FAQ/instructions →
  // judging criteria → program docs → organizer pages.
  if (/\bapply\b|application|apply-now|enter\b/.test(u)) s += 5;
  if (/eligib|who-can|qualification|participant/.test(u)) s += 5;
  if (/\bfaq\b|questions|guideline|instruction|how-to-apply/.test(u)) s += 4;
  if (/criteri|judg|rubric|evaluat|selection/.test(u)) s += 4;
  if (/rule|prize|track|deadline|timeline|submission|submit|deliverable|brief/.test(u)) s += 3;
  if (/requirement|format|spec|details/.test(u)) s += 2;
  if (/about|program|announcement|overview|docs?\//.test(u)) s += 1;
  if (/\.(jpg|jpeg|png|gif|webp|svg|mp4|zip|pdf|ico|css|js)(\?|$)/i.test(u)) s -= 8;
  if (/twitter\.com|x\.com|instagram\.com|facebook\.com|tiktok\.com|youtube\.com/.test(u)) s -= 3;
  if (/login|signin|signup|cart|checkout|wp-content|wp-json|privacy|terms|cookie/.test(u)) s -= 5;
  if (u.length > 180) s -= 2;
  return s;
}

/**
 * Source quality tier: project (the user's own repo) → official (the
 * opportunity's own site) → third-party. Failed retrievals are shown as
 * unverified in the UI and never used as evidence.
 */
export function sourceQuality(url: string, host: string, seedHosts: string[]): 'official' | 'project' | 'third_party' {
  if (/github\.com$/i.test(host)) return 'project';
  if (seedHosts.some((h) => host === h || host.endsWith(`.${h}`))) return 'official';
  return 'third_party';
}

function normalize(u: string): string {
  try {
    const url = new URL(u);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

/**
 * Discover related pages on the opportunity's site, one level deep,
 * without any hardcoded URLs: crawl the seed page itself and score hrefs.
 * Same-site only — application/eligibility/criteria pages rank highest.
 */
export async function discoverLinks(
  seeds: string[],
  limit: number,
  opts?: { maxHops?: number; keywords?: RegExp }
): Promise<string[]> {
  const seen = new Set<string>();
  const candidates = new Map<string, number>();
  const add = (u: string, score: number) => {
    const n = normalize(u);
    if (!n || seen.has(n) || candidates.has(n)) return;
    candidates.set(n, score);
  };

  // Round 1: fetch seeds, collect links.
  const level1: Array<{ url: string; score: number }> = [];
  for (const seed of seeds.slice(0, 3)) {
    try {
      const page = await fetchPage(seed, 12000);
      seen.add(normalize(page.finalUrl || seed));
      if (opts?.keywords) {
        for (const l of extractLinks(page.rawHtml, page.finalUrl || seed)) {
          if (new URL(l.url).hostname !== new URL(seed).hostname) continue;
          const kw = opts.keywords.test(l.url) ? 2 : 0;
          add(l.url, l.score + kw);
          level1.push({ url: l.url, score: l.score + kw });
        }
      } else {
        for (const l of extractLinks(page.rawHtml, page.finalUrl || seed)) {
          if (new URL(l.url).hostname !== new URL(seed).hostname) continue;
          add(l.url, l.score);
          level1.push({ url: l.url, score: l.score });
        }
      }
    } catch {
      continue;
    }
  }

  // Round 2: fetch the most promising discovered pages, collect their links.
  const hop2 = opts?.maxHops === 0 ? [] : level1.filter((l) => l.score >= 3).sort((a, b) => b.score - a.score).slice(0, 4);
  for (const c of hop2) {
    try {
      const page = await fetchPage(c.url, 10000);
      seen.add(normalize(page.finalUrl || c.url));
      for (const l of extractLinks(page.rawHtml, page.finalUrl || c.url)) {
        if (new URL(l.url).hostname !== new URL(c.url).hostname) continue;
        add(l.url, l.score);
      }
    } catch {
      continue;
    }
  }

  return [...candidates.entries()]
    .filter(([u, s]) => s >= 1 && !seen.has(u))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([u]) => u);
}

function kindFor(url: string, host: string): Source['kind'] {
  if (/github\.com$/i.test(host)) return 'project';
  if (/linkedin\.com|twitter\.com|x\.com|news\.ycombinator\.com/i.test(host)) return 'community';
  if (/techcrunch|news|medium|dev\.to|substack/i.test(host)) return 'news';
  if (/arxiv|doi\.org|acm\.org|ieee/i.test(host)) return 'reference';
  return 'official';
}

export { kindFor };
