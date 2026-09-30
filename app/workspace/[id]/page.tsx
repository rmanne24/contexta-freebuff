'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { WorkflowState, Source } from '@/lib/types';
import { Wordmark, Eyebrow, Spinner, Sheet, StatusDot } from '@/components/ui';
import { ResearchProgress } from '@/components/workspace/ResearchProgress';
import { SourceList, SourceSheetBody } from '@/components/workspace/SourceList';
import { AlignmentSection, GapSection, RecommendationSection } from '@/components/workspace/Analysis';
import { ApprovalPanel, ExecutionTimeline, VerificationReceipt } from '@/components/workspace/ActionFlow';
import { DeckReviewSection } from '@/components/workspace/DeckReviewSection';

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
    refresh();
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
  }, [w?.state, refresh]);

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
              <Eyebrow accent>{w.opportunity.organization || w.opportunity.title}</Eyebrow>
              <h1 className="font-serif-display mt-5 text-[40px] sm:text-[56px] leading-[1.04]">
                Here’s what matters.
              </h1>
              <p className="mt-7 text-[16px] leading-[1.8] text-[#33302c] max-w-[620px]">
                {w.opportunity.description && (
                  <span className="text-[#77736C]">{w.opportunity.description.slice(0, 180)}{w.opportunity.description.length > 180 ? '… ' : ' '}</span>
                )}
                {w.evidence.length > 0 || w.alignment.length > 0 ? null : null}
                {w.opportunity.goal && <span className="text-[#77736C]">Your goal: {w.opportunity.goal}. </span>}
                Contexta read {w.sources.filter((s) => s.retrieved).length} live source{w.sources.filter((s) => s.retrieved).length === 1 ? '' : 's'} behind this opportunity and weighed them against your project.
              </p>

              <div className="mt-12 space-y-14">
                <SourceList sources={w.sources} onSelect={setSelectedSource} />

                {w.alignment.length > 0 && <AlignmentSection alignment={w.alignment} evidence={w.evidence} sources={w.sources} />}

                {w.gaps.length > 0 && <GapSection gaps={w.gaps} evidence={w.evidence} sources={w.sources} />}

                <DeckReviewSection workflow={w} onUpdate={setW} />

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
              </div>
            </div>

            {/* ----- Right: context / action panel ----- */}
            <aside className="min-w-0">
              <div className="lg:sticky lg:top-10 space-y-8">
                {/* Project context */}
                <section aria-labelledby="ctx-heading" className="paper px-6 py-6">
                  <h2 id="ctx-heading" className="eyebrow">Your project</h2>
                  <p className="mt-3 text-[14px] font-medium leading-snug">{w.project.name}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#77736C] line-clamp-6">{w.project.description}</p>
                  {w.project.repoUrl && (
                    <a href={w.project.repoUrl} target="_blank" rel="noreferrer" className="btn-text mt-4 text-[12.5px]">
                      {w.project.repoUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} <ArrowUpRight size={13} strokeWidth={1.8} />
                    </a>
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
