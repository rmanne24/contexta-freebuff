import type {
  AlignmentFinding,
  EvidenceItem,
  EvidenceType,
  GapFinding,
  Opportunity,
  OpportunityIntel,
  ProjectEvidence,
  ProjectProfile,
  Recommendation,
  RequirementCategory,
  RequirementItem,
  Source,
  VerificationStatus,
} from './types';
import { classifyKind, domainOf, hash, parseRepo, sentences } from './utils';
import type { RepoContext } from './github';

/**
 * Deterministic, evidence-first analysis over real retrieved content.
 *
 * Order of operations (never reversed):
 *   SOURCE → extract evidence → classify evidence → formulate finding →
 *   connect finding to project → generate recommendation.
 *
 * A finding is only produced from a quote that actually states it. When the
 * sources do not answer a question, the output says so explicitly instead of
 * inventing an answer.
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
  intel: OpportunityIntel;
  alignment: AlignmentFinding[];
  gaps: GapFinding[];
  recommendations: Recommendation[];
  evidence: EvidenceItem[];
  projectEvidence: ProjectEvidence[];
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
    excerpt: scrubSecrets(excerpt).slice(0, 400),
    wordCount,
    retrieved,
    error,
    fetchedAt: new Date().toISOString(),
  };
}

/* ---------------- Secret hygiene ---------------- */

const SECRET_ASSIGN_RE =
  /((?:api[_-]?key|access[_-]?token|auth[_-]?token|token|secret|password|passwd|private[_-]?key)\s*[:=]\s*)([^\s"'`]{4,})/gi;
const KEY_PREFIX_RE =
  /\b(sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{12,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g;

/** Never surface tokens, keys or credentials inside evidence text. */
export function scrubSecrets(s: string): string {
  return s.replace(SECRET_ASSIGN_RE, '$1[redacted]').replace(KEY_PREFIX_RE, '[redacted]');
}

/* ---------------- Evidence classification ---------------- */

const MONTH =
  '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';

const DEADLINE_RE = new RegExp(
  `\\b(deadline|due (by|on)|closes? (on|at)?|closing date|last date|submissions? close|applications? close|apply by|submit (by|before)|entries close|final deadline|timeline)\\b|${MONTH}\\.?\\s+\\d{1,2}(st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}\\s+${MONTH}`,
  'i'
);

const ELIGIBILITY_RE =
  /\b(eligib\w*|who can (apply|participate|enter|join)|open to\b|must be (a|an|at least|aged|18|21)|age of \d|teams? (of|must|may|can)|individuals? (and|or) teams?|students? (enrolled|at|currently)|residents? of|citizens? of|located in|based in|students? and|working professionals)\b/i;

const SELECTION_RE =
  /\b(judg\w*|evaluat\w*|criteri\w*|rubric|scor(ed|ing)|selected (based|on)|winners? (will be|are|were) (chosen|selected|announced)|assess\w*|review process|selection process|applications? (are|will be) (reviewed|assessed))\b/i;

const APPLICATION_RE =
  /\b(submit|submission|apply (with|using|by)|application (form|requires|should|must)|include (a|an|the|your|link|video|demo|repo|deck|pitch|document|screenshot)|provide (a|an|the|your|link|video)|attach|upload|deliverable|materials?|portfolio|resume|cv|proposal|pitch deck)\b/i;

const BENEFIT_RE =
  /\b(prize|prizes|reward|cash|grant|funding|credits?|perks?|access to|incubat\w*|mentor\w*|award\w*|scholarship|stipend|equity|investment|opportunit(y|ies) to)\b/i;

const PRIORITY_RE =
  /\b(we (care|value|look for|believe|want|are looking for|prioritize)|our (mission|focus|priority|priorities|goal|values)|mission is|focus(ed)? on|passionate about|dedicated to|we('re| are) (excited|looking) (about|for))\b/i;

const REQUIREMENT_RE =
  /\b(must|required?|requirement|need(s)? to|should (be|include|have)|mandatory|ensure|only (projects|teams)|minimum|maximum|no (more|less) than|limit(ed)? to)\b/i;

const FACTUAL_TYPES: EvidenceType[] = [
  'explicit_requirement',
  'explicit_benefit',
  'eligibility',
  'application_material',
  'deadline',
  'selection_criterion',
  'organizer_priority',
];

/**
 * Classify a quote: what kind of fact does it establish, and how strongly?
 * Order matters — a deadline sentence may also contain “must”.
 */
export function classifyEvidence(
  quote: string,
  sourceQuality: Source['quality']
): { type: EvidenceType; status: VerificationStatus } {
  let type: EvidenceType = 'unknown';
  if (DEADLINE_RE.test(quote)) type = 'deadline';
  else if (ELIGIBILITY_RE.test(quote)) type = 'eligibility';
  else if (SELECTION_RE.test(quote)) type = 'selection_criterion';
  else if (APPLICATION_RE.test(quote)) type = 'application_material';
  else if (BENEFIT_RE.test(quote)) type = 'explicit_benefit';
  else if (PRIORITY_RE.test(quote)) type = 'organizer_priority';
  else if (REQUIREMENT_RE.test(quote)) type = 'explicit_requirement';

  if (type === 'unknown') return { type, status: 'unverified' };
  if (sourceQuality === 'official') return { type, status: 'verified' };
  if (sourceQuality === 'project') return { type: 'project_evidence', status: 'verified' };
  // Third-party pages can inform but never establish an official fact.
  return { type, status: 'inferred' };
}

/* ---------------- Finding formulation ---------------- */

const FILLER_LEAD =
  /^(please note( that)?|note( that)?|important(ly)?[:,]?|we are (excited|thrilled|pleased) to (announce|share)( that)?|as (part of|a reminder)[^,]*,\s*|remember( that)?|also[,]?|finally[,]?|additionally[,]?|moreover[,]?|however[,]?|in addition[,]?)\s*/i;

/**
 * Compress a quote into a concise finding without changing its meaning:
 * strips bullets and filler lead-ins, then keeps whole clauses only.
 */
export function condense(raw: string, max = 190): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^[•·▪◦\-–—*]\s*/, '');
  s = s.replace(FILLER_LEAD, '');
  let truncated = false;
  if (s.length > max) {
    const clauses = s.split(/(?<=[,;:])\s+/);
    let out = '';
    for (const c of clauses) {
      if ((out + ' ' + c).trim().length > max) break;
      out = (out + ' ' + c).trim();
    }
    if (out) {
      s = out;
      truncated = true;
    } else {
      s = s.slice(0, max).replace(/\s+\S*$/, '');
      truncated = true;
    }
  }
  s = s.trim().replace(/[,;:]+$/, '');
  if (truncated && !/[.!?…]$/.test(s)) s += '…';
  return scrubSecrets(s);
}

/* ---------------- Evidence extraction ---------------- */

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
  'submit',
  'deliverable',
  'rubric',
  'apply',
  'application',
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
  'team',
  'student',
  'must',
];

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
        const classification = classifyEvidence(s, src.quality);
        return { s, ls, overlap, critHit, classification };
      })
      .filter((x) => {
        if (x.s.length < 40 || x.s.length > 320) return false;
        if (NAV_JUNK_RE.test(x.s)) return false;
        // Keep classified facts, or sentences clearly about the opportunity.
        if (x.classification.type !== 'unknown') return true;
        return x.overlap >= 2;
      })
      .sort(
        (a, b) =>
          Number(b.classification.type !== 'unknown') - Number(a.classification.type !== 'unknown') ||
          Number(b.critHit) - Number(a.critHit) ||
          b.overlap - a.overlap
      );

    let perSource = 0;
    for (const x of scored) {
      if (evidence.length >= 20 || perSource >= 5) break;
      if (used.has(x.s)) continue;
      used.add(x.s);
      const { type, status } = x.classification;
      evidence.push({
        id: `ev_${evidence.length + 1}`,
        index: evidence.length + 1,
        sourceId: src.id,
        sourceIndex: src.index,
        quote: scrubSecrets(x.s),
        claim: condense(x.s),
        confidence: status === 'verified' ? 'high' : status === 'inferred' ? 'medium' : 'low',
        type,
        status,
      });
      perSource++;
    }
  }
  return evidence;
}

/* ---------------- Opportunity intelligence ---------------- */

const CATEGORY_ORDER: RequirementCategory[] = [
  'requirement',
  'eligibility',
  'application_material',
  'selection_criterion',
  'deadline',
  'benefit',
  'organizer_priority',
];

const CATEGORY_LABEL: Record<RequirementCategory, string> = {
  requirement: 'Requirements',
  eligibility: 'Eligibility',
  application_material: 'Application materials',
  selection_criterion: 'Selection criteria',
  deadline: 'Deadlines',
  benefit: 'Benefits',
  organizer_priority: 'Organizer priorities',
};

const TYPE_TO_CATEGORY: Partial<Record<EvidenceType, RequirementCategory>> = {
  explicit_requirement: 'requirement',
  eligibility: 'eligibility',
  application_material: 'application_material',
  selection_criterion: 'selection_criterion',
  deadline: 'deadline',
  explicit_benefit: 'benefit',
  organizer_priority: 'organizer_priority',
};

export { CATEGORY_LABEL };

/**
 * Build the structured Opportunity Intelligence section strictly from
 * classified evidence. Categories with no evidence are listed as unknowns —
 * never filled with a guess.
 */
export function buildIntel(
  opp: Opportunity,
  sources: Source[],
  evidence: EvidenceItem[]
): OpportunityIntel {
  const items: RequirementItem[] = [];
  const seen = new Set<string>();

  for (const category of CATEGORY_ORDER) {
    let count = 0;
    for (const ev of evidence) {
      if (count >= 5) break;
      const cat = ev.type ? TYPE_TO_CATEGORY[ev.type] : undefined;
      if (cat !== category) continue;
      if (ev.status === 'unverified') continue;
      const key = ev.claim.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: `req_${category}_${count + 1}`,
        category,
        statement: ev.claim,
        evidenceIds: [ev.id],
        status: ev.status ?? 'inferred',
      });
      count++;
    }
  }

  const covered = new Set(items.map((i) => i.category));
  const unknowns = CATEGORY_ORDER.filter((c) => !covered.has(c)).map((c) =>
    `Could not determine ${CATEGORY_LABEL[c].toLowerCase()} from the available sources.`
  );

  const retrieved = sources.filter((s) => s.retrieved);
  const official = retrieved.filter((s) => s.quality === 'official').length;
  const verifiedCount = items.filter((i) => i.status === 'verified').length;

  const researchConfidence: OpportunityIntel['researchConfidence'] =
    official >= 2 && verifiedCount >= 6 ? 'high' : official >= 1 && verifiedCount >= 3 ? 'medium' : 'low';

  const org = opp.organization || opp.title;
  const parts: string[] = [];
  parts.push(
    `Contexta read ${retrieved.length} live source${retrieved.length === 1 ? '' : 's'} for ${org} (${official} official) and extracted ${verifiedCount} verified detail${verifiedCount === 1 ? '' : 's'}.`
  );
  if (verifiedCount === 0) {
    parts.push(
      'The retrieved pages did not state explicit requirements or criteria — treat everything below as context, not confirmed facts.'
    );
  } else {
    const deadline = items.find((i) => i.category === 'deadline');
    if (deadline) parts.push(`Key timing: ${deadline.statement}`);
    const criterion = items.find((i) => i.category === 'selection_criterion');
    if (criterion) parts.push(`Selection: ${criterion.statement}`);
  }
  const summary = parts.join(' ');

  return { summary, researchConfidence, items, unknowns };
}

/* ---------------- Project evidence (GitHub) ---------------- */

const PROJECT_THEMES: Array<{ label: string; terms: string[]; why: string }> = [
  {
    label: 'autonomous / agent execution',
    terms: ['agent', 'autonomous', 'orchestrat', 'workflow', 'pipeline', 'tool'],
    why: 'Direct evidence that the project operates as an autonomous system, not a static demo.',
  },
  {
    label: 'human approval gate',
    terms: ['approval', 'approve', 'human-in-the-loop', 'consent', 'confirm'],
    why: 'Direct evidence of the human-approval step the opportunity values.',
  },
  {
    label: 'research & evidence grounding',
    terms: ['research', 'evidence', 'source', 'citation', 'retriev'],
    why: 'Shows the product grounds its output in real sources.',
  },
  {
    label: 'verification of executed actions',
    terms: ['verif', 'receipt', 'integrity', 'audit'],
    why: 'Shows executed actions are verified, not just claimed.',
  },
  {
    label: 'evaluation & measurement',
    terms: ['eval', 'benchmark', 'test', 'accuracy', 'metric'],
    why: 'Shows measured results reviewers can check.',
  },
  {
    label: 'public demo / deployment',
    terms: ['demo', 'deploy', 'live', 'try it', 'screenshot'],
    why: 'Shows the project is demonstrable, which most opportunities reward.',
  },
];

/**
 * Read project evidence from the user's repository: README statements and
 * file layout — real files, with paths, never invented. Secrets are scrubbed.
 */
export function extractProjectEvidence(
  repo: RepoContext,
  project: ProjectProfile,
  opp: Opportunity
): ProjectEvidence[] {
  const out: ProjectEvidence[] = [];
  const push = (claim: string, file: string, excerpt: string, whyItMatters: string) => {
    out.push({
      id: `pe_${out.length + 1}`,
      index: out.length + 1,
      claim: scrubSecrets(claim),
      repository: repo.repository,
      file,
      excerpt: scrubSecrets(excerpt).slice(0, 300),
      whyItMatters,
    });
  };

  const readmePath = repo.readmePath || 'README.md';
  const readme = repo.readmeText || '';
  const readmeSentences = sentences(readme.replace(/```[\s\S]*?```/g, ' ').replace(/[#*`>|-]/g, ' '));

  if (repo.description) {
    push(
      `Repository description: ${condense(repo.description, 160)}`,
      'repository metadata',
      repo.description.slice(0, 280),
      'The project states its own purpose — the baseline for every alignment claim.'
    );
  }

  for (const theme of PROJECT_THEMES) {
    if (out.length >= 7) break;
    const hit = readmeSentences.find(
      (s) =>
        s.length >= 40 &&
        theme.terms.some((t) => s.toLowerCase().includes(t)) &&
        !NAV_JUNK_RE.test(s)
    );
    if (!hit) continue;
    push(
      `README documents ${theme.label}: ${condense(hit, 160)}`,
      readmePath,
      hit,
      theme.why
    );
  }

  // File-layout signals (names only — file contents other than the README are never read).
  const files = repo.rootFiles || [];
  const evalFiles = files.filter((f) => /test|eval|benchmark|spec/i.test(f));
  if (evalFiles.length && out.length < 8) {
    push(
      `Repository includes evaluation-related paths: ${evalFiles.slice(0, 5).join(', ')}`,
      'repository root',
      evalFiles.slice(0, 8).join('\n'),
      'Testing or evaluation scaffolding exists — it can be turned into measured results.'
    );
  }
  if (repo.homepage && out.length < 8) {
    push(
      `Repository links a live deployment: ${repo.homepage}`,
      'repository metadata',
      repo.homepage,
      'A public, reachable deployment is the strongest form of proof-of-work.'
    );
  }
  if (repo.language && out.length < 8) {
    push(
      `Primary language: ${repo.language}${repo.topics?.length ? ` · topics: ${repo.topics.join(', ')}` : ''}`,
      'repository metadata',
      `${repo.language}${repo.topics?.length ? ` · ${repo.topics.join(', ')}` : ''}`,
      'Establishes the implementation footprint reviewers will see.'
    );
  }

  return out.slice(0, 8);
}

/* ---------------- Alignment ---------------- */

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

function computeAlignment(
  project: ProjectProfile,
  opp: Opportunity,
  evidence: EvidenceItem[],
  projectEvidence: ProjectEvidence[]
): AlignmentFinding[] {
  const projText =
    `${project.name} ${project.description} ${project.problem || ''} ${project.audience || ''} ${project.stage || ''}`.toLowerCase();
  const oppText = `${opp.title} ${opp.description} ${opp.organization || ''}`.toLowerCase();
  const findings: AlignmentFinding[] = [];

  for (const th of THEMES) {
    const oppEv = evidence
      .filter(
        (e) =>
          e.status === 'verified' &&
          th.terms.some((t) => (e.claim + ' ' + e.quote).toLowerCase().includes(t))
      )
      .slice(0, 2);
    const oppMentions = th.terms.some((t) => oppText.includes(t));
    if (!oppMentions && oppEv.length === 0) continue;

    const peHits = projectEvidence
      .filter((pe) => th.terms.some((t) => (pe.claim + ' ' + pe.excerpt).toLowerCase().includes(t)))
      .slice(0, 2);
    const projTextHit = th.terms.some((t) => mentionsPositively(projText, t));

    const relationship: AlignmentFinding['relationship'] = peHits.length
      ? 'aligned'
      : projTextHit
        ? 'partially_aligned'
        : 'gap';
    const level: AlignmentFinding['level'] =
      relationship === 'aligned' ? 'strong' : relationship === 'partially_aligned' ? 'partial' : 'attention';

    const expects = oppEv.length
      ? oppEv[0].claim
      : `The opportunity materials reference ${th.area.toLowerCase()}.`;

    const projectShows = peHits.length
      ? `${peHits[0].claim} (${peHits[0].file})`
      : projTextHit
        ? 'Stated in your project description — not yet verified in the repository.'
        : 'Not demonstrated in your project description or repository.';

    findings.push({
      id: `al_${th.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      level,
      area: th.area,
      statement:
        relationship === 'aligned'
          ? `Your repository proves ${th.area.toLowerCase()} — and the opportunity explicitly values it.`
          : relationship === 'partially_aligned'
            ? `The opportunity cares about ${th.area.toLowerCase()}; your description claims it, but your repository does not yet prove it.`
            : `The opportunity emphasizes ${th.area.toLowerCase()}; neither your description nor your repository demonstrates it yet.`,
      evidenceIds: oppEv.map((e) => e.id),
      why: th.why,
      expects,
      projectShows,
      relationship,
      projectEvidenceIds: peHits.map((p) => p.id),
    });
  }
  return findings.slice(0, 6);
}

/* ---------------- Gaps ---------------- */

const GAP_CHECKS: Array<{
  area: string;
  terms: string[];
  requirementTerms: string[];
  severity: 'critical' | 'moderate';
  whatIsMissing: string;
  recommendedAction: string;
  priority: 'high' | 'medium' | 'low';
}> = [
  {
    area: 'Public demo',
    terms: ['demo', 'live', 'deployed', 'try'],
    requirementTerms: ['demo', 'demonstrat', 'working system', 'deploy', 'live'],
    severity: 'critical',
    whatIsMissing: 'No public demo or deployed link is documented for your project.',
    recommendedAction:
      'Deploy a minimal public demo and add the URL to your README and submission materials.',
    priority: 'high',
  },
  {
    area: 'Evaluation & benchmarks',
    terms: ['evaluat', 'benchmark', 'metric', 'accuracy', 'test'],
    requirementTerms: ['evaluat', 'benchmark', 'metric', 'accuracy', 'measur'],
    severity: 'moderate',
    whatIsMissing: 'No evaluation methodology or measured results are documented.',
    recommendedAction:
      'Define 3–5 representative tasks with success criteria, run them, and record the measured results.',
    priority: 'medium',
  },
  {
    area: 'Human approval flow',
    terms: ['approval', 'approve', 'human-in-the-loop', 'consent'],
    requirementTerms: ['approval', 'approve', 'human', 'oversight'],
    severity: 'moderate',
    whatIsMissing: 'An explicit human-approval step is not demonstrated in your materials.',
    recommendedAction:
      'Show the approval gate end-to-end: proposed action → human decision → execution → verification.',
    priority: 'medium',
  },
  {
    area: 'Traction & usage evidence',
    terms: ['traction', 'users', 'usage', 'growth', 'adoption'],
    requirementTerms: ['traction', 'users', 'usage', 'adoption', 'customers'],
    severity: 'moderate',
    whatIsMissing: 'No verified evidence of real usage or traction is documented.',
    recommendedAction:
      'Record verifiable usage: testers, sessions, deployments, or feedback with dates and sources.',
    priority: 'low',
  },
];

function computeGaps(
  project: ProjectProfile,
  opp: Opportunity,
  evidence: EvidenceItem[],
  projectEvidence: ProjectEvidence[]
): GapFinding[] {
  const gaps: GapFinding[] = [];
  // What the project already demonstrates = description + repository evidence.
  const projText =
    `${project.name} ${project.description} ${project.problem || ''} ${project.audience || ''} ${project.stage || ''} ${projectEvidence.map((p) => `${p.claim} ${p.excerpt}`).join(' ')}`.toLowerCase();
  const oppText = `${opp.title} ${opp.description} ${opp.organization || ''}`.toLowerCase();

  for (const c of GAP_CHECKS) {
    const inOpp = c.requirementTerms.some((t) => oppText.includes(t));
    const relevant =
      inOpp || opp.kind === 'hackathon' || opp.kind === 'competition' || opp.kind === 'investor' || opp.kind === 'grant';
    if (!relevant) continue;
    if (c.area === 'Open-source visibility') continue; // handled below
    const inProj = c.terms.some((t) => mentionsPositively(projText, t));
    if (inProj) continue;

    // Was this required by the opportunity, or is it a strategic strengthening step?
    const oppEv = evidence
      .filter(
        (e) =>
          e.status === 'verified' &&
          c.requirementTerms.some((t) => (e.claim + ' ' + e.quote).toLowerCase().includes(t))
      )
      .slice(0, 2);
    const requiredByOpportunity = oppEv.length > 0;

    gaps.push({
      id: `gap_${c.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      severity: c.severity,
      area: c.area,
      statement: c.whatIsMissing,
      evidenceIds: oppEv.map((e) => e.id),
      why: requiredByOpportunity
        ? `The opportunity's own sources reference ${c.area.toLowerCase()}, and your materials do not address it.`
        : `Not explicitly required by the opportunity's sources — closing this is a strategic strengthening step.`,
      whatIsMissing: c.whatIsMissing,
      whyItMatters: requiredByOpportunity
        ? `The opportunity explicitly references ${c.area.toLowerCase()}: “${oppEv[0].claim}”`
        : `The opportunity's sources do not explicitly require ${c.area.toLowerCase()}. Contexta recommends it as positioning strength, not a stated requirement.`,
      requiredByOpportunity,
      recommendedAction: c.recommendedAction,
      priority: c.priority,
    });
  }

  // Open-source visibility: only a gap when no repository is linked at all.
  if (!project.repoUrl && (opp.kind === 'hackathon' || opp.kind === 'competition' || opp.kind === 'investor')) {
    gaps.push({
      id: 'gap_open-source-visibility',
      severity: 'moderate',
      area: 'Open-source visibility',
      statement: 'No repository is linked, so none of your project claims can be verified by reviewers.',
      evidenceIds: [],
      why: 'Reviewers cannot check claims they cannot open.',
      whatIsMissing: 'A public repository link for the project.',
      whyItMatters:
        'The opportunity sources do not explicitly require a public repository. Contexta recommends it so every other claim becomes verifiable.',
      requiredByOpportunity: false,
      recommendedAction: 'Publish the repository (or a public snapshot) and link it in your submission.',
      priority: 'medium',
    });
  }

  return gaps.slice(0, 5);
}

/* ---------------- Next moves ---------------- */

function mkRec(
  index: number,
  phase: string,
  title: string,
  rationale: string,
  evidenceIds: string[],
  action: Recommendation['action']
): Recommendation {
  return { id: `rec_${index}`, index, phase, title, rationale, evidenceIds, action };
}

function recommendNextMove(
  gaps: GapFinding[],
  project: ProjectProfile,
  opp: Opportunity,
  alignment: AlignmentFinding[],
  intel: OpportunityIntel
): Recommendation[] {
  const recs: Recommendation[] = [];
  let idx = 1;
  const repo = project.repoUrl ? parseRepo(project.repoUrl) : null;

  // 01 — Verify eligibility (only when the opportunity stated eligibility facts).
  const eligibility = intel.items.filter((i) => i.category === 'eligibility');
  if (eligibility.length) {
    recs.push(
      mkRec(
        idx++,
        'Verify eligibility',
        'Confirm you meet the stated eligibility requirements',
        `Your sources state eligibility conditions — check them before investing more time: “${eligibility[0].statement}”`,
        eligibility.flatMap((i) => i.evidenceIds),
        null
      )
    );
  }

  // 02 — Prepare application materials (from what the sources actually ask for).
  const materials = intel.items.filter((i) => i.category === 'application_material');
  if (materials.length) {
    recs.push(
      mkRec(
        idx++,
        'Prepare application materials',
        'Assemble everything the application asks for',
        `The opportunity's sources list required materials: “${materials[0].statement}”`,
        materials.flatMap((i) => i.evidenceIds),
        null
      )
    );
  }

  // 03 — Close the highest-priority gap (with a real GitHub action when possible).
  const topGap = gaps[0];
  if (topGap) {
    recs.push(
      mkRec(
        idx++,
        'Close the highest-priority gap',
        topGap.recommendedAction || `Close the ${topGap.area.toLowerCase()} gap`,
        `${topGap.whatIsMissing || topGap.statement} ${topGap.requiredByOpportunity ? 'The opportunity explicitly references this.' : 'This is a strategic strengthening step, not a stated requirement.'}`,
        topGap.evidenceIds,
        repo
          ? {
              kind: 'create_github_issue' as const,
              repository: repo,
              title: `Close gap: ${topGap.area}${topGap.priority === 'high' ? ' (high priority)' : ''}`,
              body: `## What is missing\n${topGap.whatIsMissing || topGap.statement}\n\n## Why it matters\n${topGap.whyItMatters || topGap.why}\n\n## Recommended action\n${topGap.recommendedAction || 'Address the gap described above.'}\n\n---\n_Generated by Contexta from live opportunity research._`,
            }
          : null
      )
    );
  }

  // 04 — Strengthen positioning (lead with what is proven).
  const topAligned = alignment.find((a) => a.relationship === 'aligned') || alignment.find((a) => a.level === 'strong');
  if (topAligned) {
    recs.push(
      mkRec(
        idx++,
        'Strengthen positioning',
        `Lead with ${topAligned.area.toLowerCase()} — it is your proven overlap`,
        `Your repository proves this and the opportunity values it. ${topAligned.projectShows || ''}`.trim(),
        [...topAligned.evidenceIds, ...(topAligned.projectEvidenceIds || [])],
        null
      )
    );
  }

  // 05 — Submit before the deadline (only when a deadline was actually found).
  const deadline = intel.items.find((i) => i.category === 'deadline');
  if (deadline) {
    recs.push(
      mkRec(
        idx++,
        'Submit before the deadline',
        'Work backwards from the stated deadline',
        `A verified deadline exists: “${deadline.statement}” Plan submission at least 48 hours before it.`,
        deadline.evidenceIds,
        null
      )
    );
  }

  if (recs.length === 0) {
    recs.push(
      mkRec(
        idx++,
        'Prepare a submission-ready summary',
        'Write a tight summary aligned to the opportunity',
        'Research is complete; the highest-value next step is a concise written summary grounded in the findings above.',
        [],
        null
      )
    );
  }
  return recs.slice(0, 5);
}

/* ---------------- Entry point ---------------- */

export function analyze(
  project: ProjectProfile,
  opp: Opportunity,
  sources: Source[],
  pageTexts: Map<string, string>,
  projectEvidence: ProjectEvidence[] = []
): AnalyzeResult {
  const evidence = extractEvidence(sources, pageTexts, opp);
  const intel = buildIntel(opp, sources, evidence);
  const alignment = computeAlignment(project, opp, evidence, projectEvidence);
  const gaps = computeGaps(project, opp, evidence, projectEvidence);
  const recommendations = recommendNextMove(gaps, project, opp, alignment, intel);
  return {
    summary: intel.summary,
    intel,
    alignment,
    gaps,
    recommendations,
    evidence,
    projectEvidence,
    sources,
  };
}

export { classifyKind, hash };
