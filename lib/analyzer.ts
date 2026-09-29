import type {
  AlignmentFinding,
  EvidenceItem,
  GapFinding,
  Opportunity,
  ProjectProfile,
  Recommendation,
  Source,
} from './types';
import { classifyKind, domainOf, hash, parseRepo, sentences } from './utils';

/**
 * Deterministic analysis over real retrieved content.
 * Everything produced here traces back to actual source text —
 * no invented research, no arbitrary scores.
 */

export interface ResearchPlanStep {
  key: string;
  label: string;
}

export function researchPlan(): ResearchPlanStep[] {
  return [
    { key: 'understanding', label: 'Understanding your project' },
    { key: 'searching', label: 'Locating primary sources' },
    { key: 'reading', label: 'Reading the sources' },
    { key: 'cross-checking', label: 'Cross-checking evidence' },
    { key: 'synthesizing', label: 'Synthesizing what matters' },
  ];
}

/** Build the seed URL set: the user-provided URL (plus its site) — never hardcoded. */
export function seedUrls(opp: Opportunity): string[] {
  const seeds: string[] = [];
  if (opp.url) {
    try {
      const u = new URL(opp.url);
      seeds.push(`${u.protocol}//${u.hostname}`);
      seeds.push(opp.url);
    } catch {
      /* ignore invalid url */
    }
  }
  return [...new Set(seeds.filter(Boolean))];
}

/** The research plan queries shown in the UI while investigating. */
export function researchQueries(opp: Opportunity): string[] {
  const org = opp.organization || opp.title;
  return [
    `Official site — ${org}`,
    `Rules & eligibility`,
    `Judging / evaluation criteria`,
    `Prizes, tracks & deadlines`,
    `Past winners & projects`,
  ];
}

export interface AnalyzeResult {
  summary: string;
  alignment: AlignmentFinding[];
  gaps: GapFinding[];
  recommendations: Recommendation[];
  evidence: EvidenceItem[];
  sources: Source[];
}

function kindFor(url: string, host: string): Source['kind'] {
  if (/github\.com$/i.test(host)) return 'project';
  if (/linkedin|twitter|x\.com|news\.ycombinator/i.test(host)) return 'community';
  if (/techcrunch|medium|dev\.to|substack/i.test(host)) return 'news';
  if (/arxiv|doi\.org|acm\.org|ieee/i.test(host)) return 'reference';
  return 'official';
}

export function mkSource(
  idx: number,
  url: string,
  title: string,
  why: string,
  excerpt: string,
  wordCount: number,
  retrieved: boolean,
  error?: string
): Source {
  const host = domainOf(url);
  return {
    id: `src_${idx}`,
    index: idx,
    title: title.slice(0, 140),
    domain: host,
    url,
    kind: kindFor(url, host),
    why,
    excerpt: excerpt.slice(0, 400),
    wordCount,
    retrieved,
    error,
    fetchedAt: new Date().toISOString(),
  };
}

const CRITICAL_TERMS = [
  'judg',
  'evaluat',
  'criteria',
  'requirement',
  'eligible',
  'eligibility',
  'prize',
  'track',
  'deadline',
  'submission',
  'deliverable',
  'rubric',
  'approve',
  'human',
  'agent',
  'autonomous',
  'browser',
  'mcp',
  'reliab',
  'recover',
  'demo',
  'deploy',
  'open source',
];

function claimFor(term: string, quote: string): string {
  const map: Record<string, string> = {
    judg: 'The source states how submissions are judged.',
    evaluat: 'The source states how submissions are evaluated.',
    criteria: 'The source lists explicit evaluation criteria.',
    requirement: 'The source lists participation requirements.',
    eligible: 'The source defines eligibility.',
    eligibility: 'The source defines eligibility.',
    prize: 'The source describes prizes or rewards.',
    track: 'The source describes tracks or categories.',
    deadline: 'The source states a deadline.',
    submission: 'The source states submission requirements.',
    deliverable: 'The source lists required deliverables.',
    rubric: 'The source includes a scoring rubric.',
    approve: 'The source mentions approval steps.',
    human: 'The source references human involvement in agent workflows.',
    agent: 'The source references AI agents.',
    autonomous: 'The source references autonomous agent behavior.',
    browser: 'The source references browser-based operation.',
    mcp: 'The source references MCP or tool protocols.',
    reliab: 'The source emphasizes reliability expectations.',
    recover: 'The source references failure recovery.',
    demo: 'The source references demos or demonstrations.',
    deploy: 'The source references deployment expectations.',
    'open source': 'The source references open source expectations.',
  };
  for (const k of Object.keys(map)) {
    if (quote.toLowerCase().includes(k)) return map[k];
  }
  return `The source discusses "${term}".`;
}

const NAV_JUNK_RE =
  /(menu|sign in|log in|subscribe|cookie|privacy policy|terms of service|all rights reserved|copyright ©|newsletter|copyright 20)/i;

/** Extract evidence: real quotes from retrieved source text. */
export function extractEvidence(
  sources: Source[],
  pageTexts: Map<string, string>,
  opp?: Opportunity
): EvidenceItem[] {
  const oppWords = new Set(
    `${opp?.title || ''} ${opp?.description || ''} ${opp?.organization || ''}`
      .toLowerCase()
      .match(/[a-z][a-z0-9+#.-]{3,}/g) || []
  );
  const evidence: EvidenceItem[] = [];
  for (const src of sources) {
    if (!src.retrieved) continue;
    const text = pageTexts.get(src.id) || '';
    if (!text) continue;
    const used = new Set<string>();
    const sents = sentences(text);
    const scored = sents
      .map((s) => {
        const ls = s.toLowerCase();
        const words = ls.match(/[a-z][a-z0-9+#.-]{3,}/g) || [];
        const overlap = words.filter((w) => oppWords.has(w)).length;
        const critHit = CRITICAL_TERMS.some((t) => ls.includes(t));
        return { s, ls, overlap, critHit };
      })
      .filter((x) => {
        if (x.s.length < 40 || x.s.length > 300) return false;
        if (NAV_JUNK_RE.test(x.s)) return false;
        return x.critHit || x.overlap >= 2;
      })
      .sort((a, b) => Number(b.critHit) - Number(a.critHit) || b.overlap - a.overlap);

    let perSource = 0;
    for (const x of scored) {
      if (evidence.length >= 12 || perSource >= 4) break;
      if (used.has(x.s)) continue;
      used.add(x.s);
      const term = CRITICAL_TERMS.find((t) => x.ls.includes(t)) || '';
      evidence.push({
        id: `ev_${evidence.length + 1}`,
        index: evidence.length + 1,
        sourceId: src.id,
        sourceIndex: src.index,
        quote: x.s,
        claim: term ? claimFor(term, x.s) : 'The source discusses the opportunity’s subject matter.',
        confidence: /judg|evaluat|criteria|requirement|eligible|prize|deadline|submission/.test(x.ls)
          ? 'high'
          : 'medium',
      });
      perSource++;
    }
  }
  return evidence;
}

const THEMES: Array<{ area: string; terms: string[]; why: string }> = [
  {
    area: 'AI agents & autonomy',
    terms: ['agent', 'autonomous', 'orchestrat', 'workflow', 'langgraph', 'pipeline'],
    why: 'The opportunity materials emphasize autonomous or agentic systems.',
  },
  {
    area: 'Applied AI / ML',
    terms: ['machine learning', 'model', 'llm', 'nlp', 'retrieval', 'rag', 'embedding'],
    why: 'The opportunity materials emphasize applied AI capability.',
  },
  {
    area: 'Research & evidence',
    terms: ['research', 'evidence', 'source', 'citation', 'paper'],
    why: 'The opportunity rewards research depth and grounded claims.',
  },
  {
    area: 'Human-in-the-loop',
    terms: ['approval', 'human', 'consent', 'oversight', 'confirm'],
    why: 'The opportunity explicitly values human oversight of agent actions.',
  },
  {
    area: 'Engineering craft',
    terms: ['deploy', 'production', 'reliab', 'testing', 'open source', 'demo'],
    why: 'The opportunity values working, deployed, demonstrable systems.',
  },
];

function computeAlignment(
  project: ProjectProfile,
  opp: Opportunity,
  evidence: EvidenceItem[]
): AlignmentFinding[] {
  const projText = `${project.name} ${project.description} ${project.problem || ''} ${project.audience || ''} ${project.stage || ''}`.toLowerCase();
  const oppText = `${opp.title} ${opp.description} ${opp.organization || ''}`.toLowerCase();
  const evText = evidence.map((e) => `${e.claim} ${e.quote}`).join(' ').toLowerCase();
  const findings: AlignmentFinding[] = [];

  for (const th of THEMES) {
    const hitOpp = th.terms.filter((t) => oppText.includes(t));
    if (hitOpp.length === 0) continue;
    const hitProj = th.terms.filter((t) => mentionsPositively(projText, t));
    const hitEv = th.terms.filter((t) => evText.includes(t));
    const level: AlignmentFinding['level'] = hitProj.length
      ? 'strong'
      : hitEv.length
        ? 'partial'
        : 'attention';
    const relatedEv = evidence
      .filter((e) => th.terms.some((t) => (e.claim + ' ' + e.quote).toLowerCase().includes(t)))
      .slice(0, 2);
    findings.push({
      id: `al_${th.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      level,
      area: th.area,
      statement:
        level === 'strong'
          ? `Your project already demonstrates ${th.area.toLowerCase()} — this matches what the opportunity asks for.`
          : level === 'partial'
            ? `The opportunity cares about ${th.area.toLowerCase()}; your sources confirm it, but your project description touches it only lightly.`
            : `The opportunity emphasizes ${th.area.toLowerCase()}; your project description does not mention it yet.`,
      evidenceIds: relatedEv.map((e) => e.id),
      why: th.why,
    });
  }
  return findings.slice(0, 6);
}

const GAP_CHECKS: Array<{
  area: string;
  terms: string[];
  severity: 'critical' | 'moderate';
  statement: string;
}> = [
  {
    area: 'Public demo',
    terms: ['demo', 'live', 'deployed', 'try'],
    severity: 'critical',
    statement: 'No public demo or deployed link is documented for your project.',
  },
  {
    area: 'Evaluation & benchmarks',
    terms: ['evaluat', 'benchmark', 'metric', 'accuracy', 'test'],
    severity: 'moderate',
    statement: 'No evaluation methodology or measured results are documented.',
  },
  {
    area: 'Human approval flow',
    terms: ['approval', 'approve', 'human-in-the-loop', 'consent'],
    severity: 'moderate',
    statement: 'An explicit human-approval step is not yet demonstrated in your project.',
  },
  {
    area: 'Open-source visibility',
    terms: ['repository', 'repo'],
    severity: 'moderate',
    statement: 'Your repository is not publicly linked, limiting verifiability.',
  },
];

const NEGATION_RE = /\b(no|not|without|lacks?|missing|pending|yet to|doesn't|does not|haven't|have not)\s+(\w+\s+){0,2}$/i;

/** True if the term appears in the text outside a negation context. */
function mentionsPositively(text: string, term: string): boolean {
  let i = text.indexOf(term);
  let positive = 0;
  while (i !== -1) {
    const window = text.slice(Math.max(0, i - 44), i);
    if (!NEGATION_RE.test(window)) positive++;
    i = text.indexOf(term, i + term.length);
  }
  return positive > 0;
}

function computeGaps(
  project: ProjectProfile,
  opp: Opportunity,
  evidence: EvidenceItem[]
): GapFinding[] {
  const gaps: GapFinding[] = [];
  const projText = `${project.name} ${project.description} ${project.problem || ''} ${project.audience || ''} ${project.stage || ''}`.toLowerCase();
  const oppText = `${opp.title} ${opp.description} ${opp.organization || ''}`.toLowerCase();

  for (const c of GAP_CHECKS) {
    const inOpp = c.terms.some((t) => oppText.includes(t));
    const relevant =
      inOpp || opp.kind === 'hackathon' || opp.kind === 'competition' || opp.kind === 'investor';
    if (!relevant) continue;
    const inProj = c.terms.some((t) => mentionsPositively(projText, t));
    if (inProj) continue;
    const relatedEv = evidence
      .filter((e) => c.terms.some((t) => (e.claim + ' ' + e.quote).toLowerCase().includes(t)))
      .slice(0, 2);
    gaps.push({
      id: `gap_${c.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      severity: c.severity,
      area: c.area,
      statement: c.statement,
      evidenceIds: relatedEv.map((e) => e.id),
      why: `Surfaced because the opportunity references ${c.area.toLowerCase()} expectations, and your project materials do not address it.`,
    });
  }
  return gaps.slice(0, 4);
}

function recommendNextMove(
  gaps: GapFinding[],
  project: ProjectProfile,
  opp: Opportunity,
  alignment: AlignmentFinding[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  let idx = 1;
  const repo = project.repoUrl ? parseRepo(project.repoUrl) : null;

  const demoGap = gaps.find((g) => g.area === 'Public demo');
  if (demoGap) {
    recs.push(
      mkRec(
        idx++,
        'Create a public demo of your project',
        'The opportunity rewards demonstrable, working systems — and no public demo is documented yet.',
        demoGap.evidenceIds,
        repo
          ? {
              kind: 'create_github_issue' as const,
              repository: repo,
              title: 'Add a public demo (deployed link) before submission',
              body: `## Context\nContexta identified a gap during opportunity research:\n\n**${demoGap.statement}**\n\n## Why\n${demoGap.why}\n\n## Suggested first step\nDeploy a minimal public demo and add the URL to the README and the submission form.\n\n---\n_Generated by Contexta from live opportunity research._`,
            }
          : null
      )
    );
  }

  const evalGap = gaps.find((g) => g.area === 'Evaluation & benchmarks');
  if (evalGap) {
    recs.push(
      mkRec(
        idx++,
        'Document an evaluation methodology',
        'Reviewers reward measured claims over promises — no evaluation approach is documented.',
        evalGap.evidenceIds,
        repo
          ? {
              kind: 'create_github_issue' as const,
              repository: repo,
              title: 'Add evaluation methodology + measured results',
              body: `## Context\nContexta identified a gap during opportunity research:\n\n**${evalGap.statement}**\n\n## Why\n${evalGap.why}\n\n## Suggested first step\nDefine 3–5 representative tasks, record success criteria and measured results.\n\n---\n_Generated by Contexta from live opportunity research._`,
            }
          : null
      )
    );
  }

  const topAligned = alignment.find((a) => a.level === 'strong');
  if (topAligned) {
    recs.push(
      mkRec(
        idx++,
        `Lead your pitch with ${topAligned.area.toLowerCase()}`,
        'Your project is strongest here, and the opportunity explicitly values it — make it the first thing reviewers see.',
        topAligned.evidenceIds,
        null
      )
    );
  }

  if (recs.length === 0) {
    recs.push(
      mkRec(
        idx++,
        'Prepare a submission-ready summary',
        'Research is complete; the highest-value next step is a tight written summary aligned to the opportunity.',
        [],
        null
      )
    );
  }
  return recs.slice(0, 4);
}

function mkRec(
  index: number,
  title: string,
  rationale: string,
  evidenceIds: string[],
  action: Recommendation['action']
): Recommendation {
  return { id: `rec_${index}`, index, title, rationale, evidenceIds, action };
}

export function summarize(
  project: ProjectProfile,
  opp: Opportunity,
  sources: Source[],
  evidence: EvidenceItem[],
  alignment: AlignmentFinding[],
  gaps: GapFinding[]
): string {
  const strong = alignment.filter((a) => a.level === 'strong').map((a) => a.area.toLowerCase());
  const org = opp.organization || opp.title;
  const retrieved = sources.filter((s) => s.retrieved).length;
  const parts: string[] = [];
  parts.push(`Contexta read ${retrieved} live source${retrieved === 1 ? '' : 's'} for ${org}.`);
  if (strong.length) {
    parts.push(
      `The strongest overlap with your work is in ${strong.slice(0, 2).join(' and ')} — that is where your positioning is most credible.`
    );
  } else {
    parts.push('The overlap with your project is partial; the sections below show exactly where the fit is thin and why.');
  }
  if (gaps.length) {
    parts.push(`Before you act, close the highest-priority gap: ${gaps[0].area.toLowerCase()}.`);
  }
  return parts.join(' ');
}

export function analyze(
  project: ProjectProfile,
  opp: Opportunity,
  sources: Source[],
  pageTexts: Map<string, string>
): AnalyzeResult {
  const evidence = extractEvidence(sources, pageTexts, opp);
  const alignment = computeAlignment(project, opp, evidence);
  const gaps = computeGaps(project, opp, evidence);
  const recommendations = recommendNextMove(gaps, project, opp, alignment);
  const summary = summarize(project, opp, sources, evidence, alignment, gaps);
  return { summary, alignment, gaps, recommendations, evidence, sources };
}

export { classifyKind, hash };
