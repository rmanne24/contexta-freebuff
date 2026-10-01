import type { WorkflowAction, WorkflowState, Source, ProjectEvidence } from './types';
import { loadWorkflow, newId, saveWorkflow } from './store';
import { analyze, extractProjectEvidence, seedUrls, mkSource, type AnalyzeResult } from './analyzer';
import { fetchPage, discoverLinks, metaDescription, sourceQuality } from './fetcher';
import { classifyKind, domainOf, sentences, trimToWordBoundary } from './utils';
import {
  createIssue,
  verifyIssue,
  verifyRepo,
  integrityHash,
  hasGitHubCredentials,
  fetchRepoContext,
} from './github';

/**
 * Server-side workflow pipeline. Owns the full state machine:
 * RESEARCHING → ANALYZING → ANALYSIS_COMPLETE → AWAITING_APPROVAL → EXECUTING → VERIFYING → VERIFIED.
 * All research is real (live fetch); all actions are real (GitHub API).
 */

export async function startWorkflow(
  input: {
    project: { name: string; description: string; repoUrl?: string; audience?: string; stage?: string; problem?: string };
    opportunity: { kind?: string; title?: string; url?: string; description?: string; organization?: string; goal?: string };
  },
  userId?: string
): Promise<WorkflowState> {
  const state: WorkflowState = {
    id: newId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId,
    state: 'RESEARCHING',
    project: {
      name: input.project.name?.trim() || 'Untitled project',
      description: input.project.description?.trim() || '',
      repoUrl: input.project.repoUrl?.trim() || undefined,
      audience: input.project.audience?.trim() || undefined,
      stage: input.project.stage?.trim() || undefined,
      problem: input.project.problem?.trim() || undefined,
    },
    opportunity: {
      kind: (input.opportunity.kind as WorkflowState['opportunity']['kind']) ||
        (classifyKind(
          `${input.opportunity.title || ''} ${input.opportunity.description || ''} ${input.opportunity.url || ''}`
        ) as WorkflowState['opportunity']['kind']),
      title: input.opportunity.title?.trim() || 'Untitled opportunity',
      url: input.opportunity.url?.trim() || undefined,
      description: input.opportunity.description?.trim() || '',
      organization: input.opportunity.organization?.trim() || undefined,
      goal: input.opportunity.goal?.trim() || undefined,
    },
    sources: [],
    evidence: [],
    alignment: [],
    gaps: [],
    recommendations: [],
    action: null,
    approval: null,
    execution: null,
  };
  await saveWorkflow(state);
  return state;
}

export async function getWorkflow(id: string): Promise<WorkflowState | null> {
  return loadWorkflow(id);
}

export async function runResearch(id: string): Promise<WorkflowState> {
  const w = await loadWorkflow(id);
  if (!w) throw new Error('Workflow not found');

  try {
    w.state = 'RESEARCHING';
    await saveWorkflow(w);

    // ---- Gather candidate URLs: the user's URL plus its site pages ----
    const seeds = seedUrls(w.opportunity);
    if (seeds.length === 0 && !w.project.repoUrl) {
      throw new Error('No opportunity URL provided and no project repository to anchor research.');
    }
    const candidates: string[] = [...seeds];

    if (seeds.length) {
      const discovered = await discoverLinks(seeds, 6, {
        keywords:
          /eligib|apply|application|faq|criteri|judg|rubric|rule|prize|track|deadline|timeline|submission|submit|guideline|requirement|format|detail|instruction/i,
      });
      candidates.push(...discovered);
    }

    const repoUrl = w.project.repoUrl ? normalizeRepoUrl(w.project.repoUrl) : null;
    if (repoUrl) candidates.push(repoUrl);

    const seedHosts = seeds
      .map((s) => {
        try {
          return domainOf(s);
        } catch {
          return '';
        }
      })
      .filter(Boolean);

    const seenTitles = new Set<string>();
    const unique: string[] = [];
    for (const c of candidates.map(normalizeUrl).filter(Boolean)) {
      if (unique.includes(c)) continue;
      unique.push(c);
    }

    // ---- Fetch each source for real (dedupe near-identical pages by title) ----
    const sources: Source[] = [];
    const pageTexts = new Map<string, string>();
    let idx = 1;
    for (const url of unique.slice(0, 8)) {
      try {
        const page = await fetchPage(url, 12000);
        const tKey = page.title.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 60);
        if (tKey && seenTitles.has(tKey)) continue; // near-duplicate page
        if (tKey) seenTitles.add(tKey);
        pageTexts.set(`src_${idx}`, page.text);
        const excerpt =
          metaDescription(page.rawHtml) ||
          sentences(page.text).slice(0, 2).join(' ').slice(0, 320) ||
          page.title;
        const src = mkSource(
          idx,
          page.finalUrl || url,
          page.title,
          whyFor(url, w.opportunity.title),
          excerpt,
          page.wordCount,
          true
        );
        src.quality = sourceQuality(page.finalUrl || url, domainOf(page.finalUrl || url), seedHosts);
        sources.push(src);
        // When no real title was provided (URL or fallback placeholder), adopt the page's own title.
        const titleLooksLikeUrl =
          !w.opportunity.title ||
          /^https?:\/\//.test(w.opportunity.title) ||
          /^untitled opportunity$/i.test(w.opportunity.title);
        if (titleLooksLikeUrl && page.finalUrl === (w.opportunity.url || url) && page.title) {
          w.opportunity.title = trimToWordBoundary(page.title, 80);
        }
      } catch (e) {
        const src = mkSource(idx, url, domainOf(url), whyFor(url, w.opportunity.title), '', 0, false,
          e instanceof Error ? e.message : 'Could not be retrieved');
        src.quality = sourceQuality(url, domainOf(url), seedHosts);
        sources.push(src);
      }
      idx++;
    }

    w.sources = sources;
    await saveWorkflow(w);

    // ---- Read the user's repository for real project evidence ----
    let projectEvidence: ProjectEvidence[] = [];
    if (repoUrl) {
      try {
        let userGhToken: string | null = null;
        if (w.userId) {
          const { getDecryptedKey } = await import('./userStore');
          userGhToken = await getDecryptedKey(w.userId, 'github');
        }
        const repoCtx = await fetchRepoContext(parseRepoSlug(repoUrl), userGhToken);
        if (repoCtx.ok) {
          projectEvidence = extractProjectEvidence(repoCtx, w.project, w.opportunity);
        }
      } catch {
        /* repository evidence is additive — research continues without it */
      }
    }
    w.projectEvidence = projectEvidence;

    // ---- Analyze over the real retrieved text ----
    w.state = 'ANALYZING';
    await saveWorkflow(w);
    const result: AnalyzeResult = analyze(w.project, w.opportunity, sources, pageTexts, projectEvidence);
    w.evidence = result.evidence;
    w.intel = result.intel;
    w.alignment = result.alignment;
    w.gaps = result.gaps;
    w.recommendations = result.recommendations;
    w.state = 'ANALYSIS_COMPLETE';
    await saveWorkflow(w);
    return w;
  } catch (e) {
    w.state = 'FAILED';
    w.error = { phase: 'research', message: e instanceof Error ? e.message : 'Research failed' };
    await saveWorkflow(w);
    return w;
  }
}

function whyFor(url: string, oppTitle: string): string {
  const u = url.toLowerCase();
  if (/criteri|judg|rubric/.test(u)) return 'Likely states how entries are judged.';
  if (/prize|track/.test(u)) return 'Describes tracks, prizes, or categories.';
  if (/rule|faq|guideline/.test(u)) return 'Contains participation rules and requirements.';
  if (/github\.com/.test(u)) return 'Your project repository — evidence for project claims.';
  if (/about|manifesto|mission/.test(u)) return 'Background on the organizer and their priorities.';
  return `Primary context for ${oppTitle}.`;
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function normalizeRepoUrl(repoInput: string): string {
  const m = repoInput.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
  if (m) return `https://github.com/${m[1]}/${m[2].replace(/\.git$/, '')}`;
  const bare = repoInput.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  return bare ? `https://github.com/${bare[1]}/${bare[2]}` : repoInput;
}

/** "owner/repo" for the GitHub API. */
function parseRepoSlug(repoUrl: string): string {
  const m = repoUrl.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
  if (m) return `${m[1]}/${m[2].replace(/\.git$/, '')}`;
  return repoUrl;
}

// ---- Actions ----

export async function proposeAction(id: string, recommendationId: string): Promise<WorkflowState> {
  const w = await loadWorkflow(id);
  if (!w) throw new Error('Workflow not found');
  const rec = w.recommendations.find((r) => r.id === recommendationId);
  if (!rec) throw new Error('Recommendation not found');
  if (!rec.action) throw new Error('This recommendation has no external action.');

  const repo = rec.action.repository || (w.project.repoUrl ? normalizeRepoUrl(w.project.repoUrl) : null);
  if (!repo) throw new Error('No repository configured for this action. Add your GitHub repository URL in step 2.');

  const action: WorkflowAction = {
    id: `act_${Date.now().toString(36)}`,
    recommendationId: rec.id,
    kind: 'create_github_issue',
    repository: repo.replace(/^https:\/\/github\.com\//, ''),
    title: rec.action.title,
    body: rec.action.body,
  };
  w.action = action;
  w.approval = 'pending';
  w.state = 'AWAITING_APPROVAL';
  await saveWorkflow(w);
  return w;
}

export async function rejectAction(id: string): Promise<WorkflowState> {
  const w = await loadWorkflow(id);
  if (!w) throw new Error('Workflow not found');
  w.approval = 'rejected';
  w.state = 'REJECTED';
  await saveWorkflow(w);
  return w;
}

export async function approveAction(id: string): Promise<WorkflowState> {
  const w = await loadWorkflow(id);
  if (!w) throw new Error('Workflow not found');
  if (!w.action) throw new Error('No proposed action.');
  w.approval = 'approved';
  w.state = 'EXECUTING';
  w.execution = {
    verified: false,
    integrityHash: '',
    timestamp: new Date().toISOString(),
    steps: [
      { index: 1, label: 'Preparing action', status: 'active', detail: 'Reviewing the approved payload.' },
      { index: 2, label: 'Sending request to GitHub', status: 'pending' },
      { index: 3, label: 'GitHub accepted', status: 'pending' },
      { index: 4, label: 'Verifying result', status: 'pending' },
      { index: 5, label: 'Confirmed', status: 'pending' },
    ],
  };
  await saveWorkflow(w);
  return w;
}

export async function executeAction(id: string): Promise<WorkflowState> {
  const w = await loadWorkflow(id);
  if (!w) throw new Error('Workflow not found');
  if (!w.action) throw new Error('No proposed action to execute.');
  if (w.approval !== 'approved') throw new Error('Action has not been approved.');

  // Prefer the signed-in user's own GitHub key, then the server token.
  let githubToken: string | null = null;
  if (w.userId) {
    const { getDecryptedKey } = await import('./userStore');
    githubToken = (await getDecryptedKey(w.userId, 'github')) || process.env.GITHUB_TOKEN || null;
  } else {
    githubToken = process.env.GITHUB_TOKEN || null;
  }
  const { setGitHubToken } = await import('./github');
  setGitHubToken(githubToken);

  const steps =
    w.execution?.steps && w.execution.steps.length
      ? w.execution.steps
      : [
          { index: 1, label: 'Preparing action', status: 'done' as const },
          { index: 2, label: 'Sending request to GitHub', status: 'pending' as const },
          { index: 3, label: 'GitHub accepted', status: 'pending' as const },
          { index: 4, label: 'Verifying result', status: 'pending' as const },
          { index: 5, label: 'Confirmed', status: 'pending' as const },
        ];
  if (!w.execution) w.execution = { verified: false, integrityHash: '', timestamp: new Date().toISOString(), steps };

  // Reset any previous attempt (supports retry after failure).
  for (const s of steps) s.status = 'pending';
  steps[0].status = 'active';
  w.error = undefined;
  w.state = 'EXECUTING';

  try {
    const { repository, title, body } = w.action;

    // 01 — preparing: verify the target repository exists and is public.
    const repoCheck = await verifyRepo(repository);
    if (!repoCheck.ok) throw new Error(repoCheck.error || 'Repository could not be verified.');
    steps[0].status = 'done';
    steps[0].detail = `Target ${repository} verified.`;
    steps[1].status = 'active';
    await saveWorkflow(w);

    // 02 — sending: create the issue via the GitHub API.
    const created = await createIssue(repository, title, body);
    if (!created.ok || !created.issueNumber) {
      throw new Error(created.error || 'GitHub did not accept the issue.');
    }
    steps[1].status = 'done';
    steps[1].detail = 'Payload accepted by GitHub.';
    steps[2].status = 'done';
    steps[2].detail = `Issue #${created.issueNumber} opened.`;
    steps[3].status = 'active';
    await saveWorkflow(w);

    // 03/04 — verify: re-fetch the issue from the API to confirm it exists.
    w.state = 'VERIFYING';
    await saveWorkflow(w);
    const ver = await verifyIssue(repository, created.issueNumber);
    if (!ver.ok) throw new Error(ver.error || 'Result could not be verified.');
    steps[3].status = 'done';
    steps[3].detail = 'Issue re-fetched from the GitHub API.';
    steps[4].status = 'done';

    const ts = new Date().toISOString();
    w.execution = {
      verified: true,
      reference: `#${created.issueNumber}`,
      url: created.issueUrl || ver.url,
      integrityHash: integrityHash([w.id, w.action.kind, w.action.repository, w.action.title, created.issueNumber, ts]),
      timestamp: ts,
      detail: `Issue #${created.issueNumber} in ${repository} was created and then re-fetched from the GitHub API to confirm it exists.`,
      steps,
    };
    w.state = 'VERIFIED';
    await saveWorkflow(w);
    return w;
  } catch (e) {
    for (const s of steps) if (s.status === 'active') s.status = 'failed';
    w.state = 'FAILED';
    w.error = { phase: 'execution', message: e instanceof Error ? e.message : 'Execution failed' };
    await saveWorkflow(w);
    return w;
  }
}

export function actionCapability(): { github: boolean } {
  return { github: hasGitHubCredentials() };
}
