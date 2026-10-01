'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { WorkflowState, Source, RequirementCategory, RequirementItem } from '@/lib/types';
import { Wordmark, Eyebrow, Spinner, Sheet, StatusDot } from '@/components/ui';
import { ResearchProgress } from '@/components/workspace/ResearchProgress';
import { SourceList, SourceSheetBody } from '@/components/workspace/SourceList';
import { AlignmentSection, GapSection, RecommendationSection } from '@/components/workspace/Analysis';
import { ApprovalPanel, ExecutionTimeline, VerificationReceipt } from '@/components/workspace/ActionFlow';
import { DeckReviewSection } from '@/components/workspace/DeckReviewSection';
import { IntelSection } from '@/components/workspace/IntelSection';
import { StatusBadge } from '@/components/workspace/EvidenceBits';

const STATE_LABEL: Record<string, string> = {
  IDLE: 'Idle',
  RESEARCHING: 'Researching',
  RESEARCH_COMPLETE: 'Research complete',
  ANALYZING: 'Analyzing',
  ANALYSIS_COMPLETE: 'Research complete',
  ACTION_PROPOSED: 'Action proposed',
  AWAITING_APPROVAL: 'Awaiting your approval',
  EXECUTING: 'Executing approved action',
  VERIFYING: 'Verifying result',
  VERIFIED: 'Action verified',
  FAILED: 'Interrupted',
  REJECTED: 'Rejected',
};

const CONFIDENCE_META: Record<
  NonNullable<WorkflowState['intel']>['researchConfidence'],
  { label: string; cls: string; bg: string }
> = {
  high: { label: 'High', cls: 'text-[#5E7D5A]', bg: '#EFF3EC' },
  medium: { label: 'Medium', cls: 'text-[#B08A3E]', bg: '#F7F1E4' },
  low: { label: 'Low', cls: 'text-[#A5554C]', bg: '#F6ECEA' },
};

const FINDING_LABEL: Record<RequirementCategory, string> = {
  requirement: 'Requirement',
  eligibility: 'Eligibility',
  application_material: 'Application material',
  selection_criterion: 'Selection criterion',
  deadline: 'Deadline',
  benefit: 'Benefit',
  organizer_priority: 'Organizer priority',
  organizer_content: 'Organizer content',
};

/** What matters: qualification, obligations, submission, judging, timing, awards — in that order. */
const FINDING_WEIGHT: Record<RequirementCategory, number> = {
  eligibility: 6,
  requirement: 5,
  application_material: 4,
  selection_criterion: 3,
  deadline: 4,
  benefit: 2,
  organizer_priority: 1,
  organizer_content: 0,
};

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [w, setW] = useState<WorkflowState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [actingBusy, setActingBusy] = useState(false);
  const [githubReady, setGithubReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial load + polling while in transient states.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${id}`, { cache: 'no-store' });
      if (res.status === 404) {
        setLoadError('This workspace could not be found.');
        return;
      }
      if (!res.ok) throw new Error('Could not load the workspace.');
      const data = (await res.json()) as WorkflowState;
      setW(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load the workspace.');
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // Schedule as a microtask so state updates happen outside the effect body.
    Promise.resolve().then(refresh);
    fetch('/api/capabilities')
      .then((r) => r.json())
      .then((d: { github: boolean }) => setGithubReady(d.github))
      .catch(() => setGithubReady(false));
  }, [id, refresh]);

  useEffect(() => {
    const transient =
      w && ['RESEARCHING', 'ANALYZING', 'EXECUTING', 'VERIFYING', 'AWAITING_APPROVAL'].includes(w.state);
    if (transient && !pollRef.current) {
      pollRef.current = setInterval(refresh, 1500);
    }
    if (!transient && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [w, refresh]);

  async function act(op: 'propose' | 'approve' | 'reject', recommendationId?: string) {
    setActingBusy(true);
    try {
      const res = await fetch(`/api/workflows/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, recommendationId }),
      });
      const data = (await res.json()) as WorkflowState & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Action failed.');
      setW(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActingBusy(false);
      setProposingId(null);
    }
  }

  if (loadError) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-[420px]">
          <Eyebrow accent>Research interrupted</Eyebrow>
          <h1 className="font-serif-display mt-5 text-[32px] leading-tight">We couldn’t open this workspace.</h1>
          <p className="mt-4 text-[14px] text-[#77736C] leading-relaxed">{loadError}</p>
          <Link href="/start" className="btn btn-primary mt-8">Start a new opportunity</Link>
        </div>
      </main>
    );
  }

  if (!w) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-[13.5px] text-[#77736C]">
          <Spinner /> Opening the workspace…
        </div>
      </main>
    );
  }

  const researching = w.state === 'RESEARCHING' || w.state === 'ANALYZING';
  const complete = ['ANALYSIS_COMPLETE', 'ACTION_PROPOSED', 'AWAITING_APPROVAL', 'EXECUTING', 'VERIFYING', 'VERIFIED', 'FAILED', 'REJECTED'].includes(w.state);
  const failedResearch = w.state === 'FAILED' && w.sources.length === 0;
  const showActionStates = w.state === 'AWAITING_APPROVAL' || w.state === 'EXECUTING' || w.state === 'VERIFYING' || w.state === 'FAILED' || w.state === 'VERIFIED';

  /* ---------- Derived header + finding data ---------- */
  const retrieved = w.sources.filter((s) => s.retrieved);
  const officialCount = retrieved.filter((s) => s.quality === 'official').length;
  const projectCount = retrieved.filter((s) => s.quality === 'project').length;
  const otherCount = retrieved.length - officialCount - projectCount;
  const confidence = w.intel?.researchConfidence;

  // Only high-value findings belong here — never workshops, marketing copy,
  // navigation text, or prize announcements.
  const keyFindings: RequirementItem[] = (w.intel?.items || [])
    .filter((i) => i.category !== 'organizer_content')
    .slice()
    .sort(
      (a, b) =>
        (a.status === 'verified' ? 0 : 1) - (b.status === 'verified' ? 0 : 1) ||
        (FINDING_WEIGHT[b.category] || 0) - (FINDING_WEIGHT[a.category] || 0)
    )
    .slice(0, 5);

  const sourceOfItem = (item: RequirementItem): Source | undefined => {
    const ev = w.evidence.find((e) => item.evidenceIds.includes(e.id));
    return w.sources.find((s) => s.id === ev?.sourceId);
  };

  const heroLine = w.intel?.summary?.trim()
    ? w.intel.summary
    : `Contexta read ${retrieved.length} live source${retrieved.length === 1 ? '' : 's'} behind this opportunity and weighed them against ${w.project.name}.`;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-10 pb-32">
        {/* ---------- Header ---------- */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-5">
            <Link href="/" aria-label="Contexta home"><Wordmark className="!text-[16px]" /></Link>
            <span className="hidden sm:block h-4 w-px bg-[rgba(25,24,23,0.15)]" aria-hidden="true" />
            <span className="hidden sm:block text-[13px] text-[#77736C] max-w-[300px] truncate">{w.project.name}</span>
          </div>
          <div className="flex items-center gap-3 text-[12px]" aria-live="polite">
            <StatusDot tone={w.state === 'FAILED' ? 'error' : complete ? 'done' : 'active'} pulse={researching || w.state === 'EXECUTING' || w.state === 'VERIFYING'} />
            <span className="uppercase tracking-[0.14em] text-[#77736C]">{STATE_LABEL[w.state] || w.state}</span>
          </div>
        </header>

        {/* ---------- Researching state ---------- */}
        {researching && <ResearchProgress state={w.state} />}

        {/* ---------- Research failed entirely ---------- */}
        {failedResearch && (
          <section className="pt-16 text-center max-w-[440px] mx-auto">
            <Eyebrow accent>Research interrupted</Eyebrow>
            <h1 className="font-serif-display mt-5 text-[34px] leading-[1.1]">We couldn’t reach the opportunity.</h1>
            <p className="mt-4 text-[14px] leading-relaxed text-[#77736C]">
              {w.error?.message || 'None of the sources could be retrieved.'} Check the link — or try again, sometimes the network settles.
            </p>
            <button className="btn btn-primary mt-8" onClick={refresh}>Retry research</button>
          </section>
        )}

        {/* ---------- Complete workspace ---------- */}
        {complete && !failedResearch && (
          <div className="grid gap-16 lg:grid-cols-[1.5fr_1fr] lg:gap-20 pt-10">
            {/* ----- Left: intelligence stream ----- */}
            <div className="min-w-0">
              {/* Hero */}
              <Eyebrow accent>Research complete</Eyebrow>
              <h1 className="font-serif-display mt-5 text-[36px] sm:text-[52px] leading-[1.06] max-w-[720px]">
                {w.opportunity.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[#77736C]">
                {confidence && (
                  <span className="flex items-center gap-2">
                    <span className="uppercase tracking-[0.12em] text-[10.5px] text-[#A6A099]">Research confidence</span>
                    <span
                      className={`text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-[3px] rounded-full ${CONFIDENCE_META[confidence].cls}`}
                      style={{ background: CONFIDENCE_META[confidence].bg }}
                    >
                      {CONFIDENCE_META[confidence].label}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1.5 tabular-nums">
                  <span className="uppercase tracking-[0.12em] text-[10.5px] text-[#A6A099]">Sources</span>
                  <span className="text-[#5E7D5A] font-medium">{officialCount} official</span>
                  <span className="text-[#A6A099]">·</span>
                  <span className="text-[#6F5B91] font-medium">{projectCount} project</span>
                  <span className="text-[#A6A099]">·</span>
                  <span>{otherCount} other</span>
                </span>
              </div>

              <p className="mt-6 text-[15.5px] leading-[1.75] text-[#33302c] max-w-[640px]">{heroLine}</p>

              <div className="mt-12 space-y-14">
                {/* What matters — top findings, each traced to a source */}
                {keyFindings.length > 0 && (
                  <section aria-labelledby="key-findings-heading">
                    <h2 id="key-findings-heading" className="eyebrow">What matters</h2>
                    <ul className="mt-5 space-y-0 border-t border-[rgba(25,24,23,0.1)]">
                      {keyFindings.map((item, i) => {
                        const src = sourceOfItem(item);
                        return (
                          <li key={item.id} className="py-5 border-b border-[rgba(25,24,23,0.1)] flex gap-4">
                            <span className="text-[12px] tabular-nums text-[#A6A099] pt-[3px] shrink-0">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10.5px] uppercase tracking-[0.16em] text-[#A6A099] font-medium">
                                {FINDING_LABEL[item.category]}
                              </p>
                              <p className="mt-1 text-[15px] leading-snug text-[#191817]">{item.statement}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[12px] text-[#77736C]">
                                <StatusBadge status={item.status} className="!py-[1px]" />
                                {src && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSource(src)}
                                    className="hover:text-[#191817] underline decoration-[rgba(25,24,23,0.2)] underline-offset-2 text-left"
                                  >
                                    Source [{String(src.index).padStart(2, '0')}] {src.domain}
                                  </button>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {/* Full structured intelligence */}
                <IntelSection intel={w.intel} evidence={w.evidence} sources={w.sources} hideConfidence />

                <SourceList sources={w.sources} onSelect={setSelectedSource} />

                {w.alignment.length > 0 && (
                  <AlignmentSection
                    alignment={w.alignment}
                    evidence={w.evidence}
                    sources={w.sources}
                    projectEvidence={w.projectEvidence}
                  />
                )}

                {w.gaps.length > 0 && <GapSection gaps={w.gaps} evidence={w.evidence} sources={w.sources} />}

                {w.recommendations.length > 0 && (
                  <RecommendationSection
                    recommendations={w.recommendations}
                    evidence={w.evidence}
                    sources={w.sources}
                    onPropose={(recId) => {
                      setProposingId(recId);
                      act('propose', recId);
                    }}
                    proposingId={proposingId}
                    githubReady={githubReady}
                  />
                )}

                <DeckReviewSection workflow={w} onUpdate={setW} />
              </div>
            </div>

            {/* ----- Right: context / action panel ----- */}
            <aside className="min-w-0">
              <div className="lg:sticky lg:top-10 space-y-8">
                {/* Project snapshot — concise, not a repeated description */}
                <section aria-labelledby="ctx-heading" className="paper px-6 py-6">
                  <h2 id="ctx-heading" className="eyebrow">Project context</h2>
                  <p className="mt-3 text-[14px] font-medium leading-snug">{w.project.name}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#77736C] line-clamp-3">{w.project.description}</p>
                  {w.project.repoUrl && (
                    <a href={w.project.repoUrl} target="_blank" rel="noreferrer" className="btn-text mt-4 text-[12.5px]">
                      {w.project.repoUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} <ArrowUpRight size={13} strokeWidth={1.8} />
                    </a>
                  )}
                  {(w.projectEvidence?.length || 0) > 0 && (
                    <p className="mt-3 text-[11.5px] text-[#A6A099]">
                      {w.projectEvidence!.length} evidence item{w.projectEvidence!.length === 1 ? '' : 's'} read from the repository below.
                    </p>
                  )}
                </section>

                {/* Evidence index */}
                {w.evidence.length > 0 && (
                  <section aria-labelledby="ev-index" className="paper px-6 py-6">
                    <h2 id="ev-index" className="eyebrow">Evidence used</h2>
                    <ul className="mt-3 space-y-2.5">
                      {w.evidence.slice(0, 8).map((ev) => (
                        <li key={ev.id} className="text-[12.5px] leading-snug text-[#77736C] flex gap-2.5">
                          <span className="text-[#6F5B91] tabular-nums shrink-0">{String(ev.sourceIndex).padStart(2, '0')}</span>
                          <span className="line-clamp-2">{ev.claim}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-[11.5px] text-[#A6A099]">Click “Why?” anywhere to see the reasoning trail.</p>
                  </section>
                )}

                {/* Action states live here on desktop */}
                {showActionStates && w.action && (
                  <div className="space-y-8">
                    {w.state === 'AWAITING_APPROVAL' && (
                      <ApprovalPanel w={w} onApprove={() => act('approve')} onReject={() => act('reject')} busy={actingBusy} />
                    )}
                    {(w.state === 'EXECUTING' || w.state === 'VERIFYING' || (w.state === 'FAILED' && w.error?.phase === 'execution')) && (
                      <ExecutionTimeline w={w} onRetry={() => act('approve')} />
                    )}
                    {w.state === 'VERIFIED' && <VerificationReceipt w={w} />}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* REJECTED state */}
        {w.state === 'REJECTED' && w.action && (
          <section className="pt-14 max-w-[520px]">
            <Eyebrow accent>Decision recorded</Eyebrow>
            <h1 className="font-serif-display mt-5 text-[34px] leading-[1.1]">Action rejected.</h1>
            <p className="mt-4 text-[14px] leading-relaxed text-[#77736C]">
              Contexta will not open the issue. The research and recommendations remain available above.
            </p>
          </section>
        )}
      </div>

      {/* Mobile: approval panel renders full-width below the stream */}
      {showActionStates && w.action && w.state === 'AWAITING_APPROVAL' && (
        <div className="lg:hidden px-6 pb-16">
          <ApprovalPanel w={w} onApprove={() => act('approve')} onReject={() => act('reject')} busy={actingBusy} />
        </div>
      )}

      {/* ---------- Source sheet ---------- */}
      <Sheet open={!!selectedSource} onClose={() => setSelectedSource(null)} title={selectedSource?.title || 'Source'} eyebrow="Source">
        {selectedSource && <SourceSheetBody source={selectedSource} />}
      </Sheet>
    </main>
  );
}
