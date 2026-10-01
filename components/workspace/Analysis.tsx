'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  AlignmentFinding,
  EvidenceItem,
  GapFinding,
  ProjectEvidence,
  Recommendation,
  Source,
} from '@/lib/types';
import { Eyebrow } from '@/components/ui';
import { StatusBadge } from './EvidenceBits';

/* ---------------- Evidence refs (compact trail) ---------------- */

export function EvidenceTrail({
  evidenceIds,
  evidence,
  sources,
  startOpen = false,
}: {
  evidenceIds: string[];
  evidence: EvidenceItem[];
  sources: Source[];
  startOpen?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const items = evidenceIds
    .map((id) => evidence.find((e) => e.id === id))
    .filter(Boolean) as EvidenceItem[];
  if (items.length === 0) return null;

  return (
    <div>
      {!startOpen && (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="btn-text text-[12px] uppercase tracking-[0.14em] font-medium text-[#6F5B91]"
        >
          Evidence
          <ChevronDown
            size={13}
            strokeWidth={2}
            className={`transition-transform duration-200 inline-block ml-1 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      )}

      <div
        className="overflow-hidden transition-[grid-template-rows,opacity] duration-300"
        style={{
          display: 'grid',
          gridTemplateRows: open || startOpen ? '1fr' : '0fr',
          opacity: open || startOpen ? 1 : 0,
        }}
      >
        <div className="min-h-0">
          <div className="mt-4 border-l border-[rgba(25,24,23,0.18)] pl-5 space-y-4">
            {items.map((ev, i) => {
              const src = sources.find((s) => s.id === ev.sourceId);
              return (
                <div key={ev.id} className="relative">
                  <span
                    className="absolute -left-[25px] top-[8px] h-1.5 w-1.5 rounded-full bg-[#6F5B91]"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-[11px] tabular-nums text-[#A6A099]">{String(i + 1).padStart(2, '0')}</span>
                    <StatusBadge status={ev.status} />
                  </div>
                  <blockquote className="mt-1.5 font-serif-display text-[15.5px] leading-[1.55] text-[#33302c]">
                    “{ev.quote}”
                  </blockquote>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-[#77736C]">{ev.claim}</p>
                  {src && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-[#77736C] hover:text-[#191817] transition-colors"
                    >
                      [{String(src.index).padStart(2, '0')}] {src.domain}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- The full "Why?" trail ---------------- */
/* Source → Evidence extracted → Interpretation → Project evidence → Conclusion → Recommended action */

export interface WhyTrailSteps {
  source?: Source;
  evidence: EvidenceItem[];
  interpretation: string;
  projectEvidence?: ProjectEvidence[];
  conclusion?: string;
  action?: string;
  sources: Source[];
}

export function WhyTrail({ steps }: { steps: WhyTrailSteps }) {
  const [open, setOpen] = useState(false);
  const { source, evidence, interpretation, projectEvidence, conclusion, action, sources } = steps;

  const rows: Array<{ n: string; label: string; body: React.ReactNode }> = [];

  const primarySource = source || sources.find((s) => s.id === evidence[0]?.sourceId);
  if (primarySource) {
    rows.push({
      n: '01',
      label: 'Source',
      body: (
        <a
          href={primarySource.url}
          target="_blank"
          rel="noreferrer"
          className="text-[13.5px] text-[#191817] font-medium hover:text-[#6F5B91] transition-colors inline-flex items-center gap-1.5"
        >
          {primarySource.title}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      ),
    });
  }

  if (evidence.length) {
    rows.push({
      n: '02',
      label: 'Evidence extracted',
      body: (
        <div className="space-y-2.5">
          {evidence.map((ev) => (
            <div key={ev.id}>
              <blockquote className="font-serif-display text-[15.5px] leading-[1.55] text-[#33302c]">
                “{ev.quote}”
              </blockquote>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={ev.status} />
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (interpretation) {
    rows.push({
      n: '03',
      label: 'Interpretation',
      body: <p className="text-[13.5px] leading-relaxed text-[#33302c]">{interpretation}</p>,
    });
  }

  if (projectEvidence && projectEvidence.length) {
    rows.push({
      n: '04',
      label: 'Project evidence',
      body: (
        <div className="space-y-2.5">
          {projectEvidence.map((pe) => (
            <div key={pe.id}>
              <p className="text-[13.5px] leading-snug text-[#191817]">{pe.claim}</p>
              <p className="mt-0.5 text-[11.5px] font-mono text-[#77736C]">
                {pe.repository} · {pe.file}
              </p>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (conclusion) {
    rows.push({
      n: '05',
      label: 'Conclusion',
      body: <p className="text-[13.5px] leading-relaxed text-[#33302c]">{conclusion}</p>,
    });
  }

  if (action) {
    rows.push({
      n: '06',
      label: 'Recommended action',
      body: <p className="text-[13.5px] leading-relaxed text-[#191817] font-medium">{action}</p>,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn-text text-[12.5px] uppercase tracking-[0.14em] font-medium"
      >
        Why?
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`transition-transform duration-200 inline-block ml-1 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        className="overflow-hidden transition-[grid-template-rows,opacity] duration-300"
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="min-h-0">
          <ol className="mt-5 border-l border-[rgba(25,24,23,0.18)] pl-5 space-y-5">
            {rows.map((row) => (
              <li key={row.n} className="relative">
                <span
                  className="absolute -left-[25px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#6F5B91]"
                  aria-hidden="true"
                />
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] tabular-nums text-[#A6A099]">{row.n}</span>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#6F5B91] font-medium">{row.label}</p>
                </div>
                <div className="mt-1.5">{row.body}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Alignment: opportunity expects vs project shows ---------------- */

const RELATIONSHIP_META: Record<
  NonNullable<AlignmentFinding['relationship']>,
  { label: string; cls: string; bg: string }
> = {
  aligned: { label: 'Aligned', cls: 'text-[#5E7D5A]', bg: '#EFF3EC' },
  partially_aligned: { label: 'Partially aligned', cls: 'text-[#B08A3E]', bg: '#F7F1E4' },
  gap: { label: 'Gap', cls: 'text-[#A5554C]', bg: '#F6ECEA' },
  unknown: { label: 'Unclear', cls: 'text-[#77736C]', bg: '#F0EEE8' },
};

const LEVEL_FALLBACK: Record<AlignmentFinding['level'], { label: string; cls: string; bg: string }> = {
  strong: RELATIONSHIP_META.aligned,
  partial: RELATIONSHIP_META.partially_aligned,
  attention: RELATIONSHIP_META.gap,
};

export function AlignmentSection({
  alignment,
  evidence,
  sources,
  projectEvidence = [],
}: {
  alignment: AlignmentFinding[];
  evidence: EvidenceItem[];
  sources: Source[];
  projectEvidence?: ProjectEvidence[];
}) {
  if (alignment.length === 0) return null;
  return (
    <section aria-labelledby="align-heading">
      <h2 id="align-heading" className="eyebrow">Where you align</h2>
      <div className="mt-6 border-t border-[rgba(25,24,23,0.1)]">
        {alignment.map((a) => {
          const meta = a.relationship ? RELATIONSHIP_META[a.relationship] : LEVEL_FALLBACK[a.level];
          const oppEv = (a.evidenceIds || [])
            .map((id) => evidence.find((e) => e.id === id))
            .filter(Boolean) as EvidenceItem[];
          const pe = (a.projectEvidenceIds || [])
            .map((id) => projectEvidence.find((p) => p.id === id))
            .filter(Boolean) as ProjectEvidence[];
          return (
            <div key={a.id} className="py-7 border-b border-[rgba(25,24,23,0.1)]">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                <span
                  className={`text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-[3px] rounded-full ${meta.cls}`}
                  style={{ background: meta.bg }}
                >
                  {meta.label}
                </span>
                <h3 className="text-[16px] font-medium">{a.area}</h3>
              </div>

              <div className="mt-4 grid gap-5 sm:grid-cols-2 sm:gap-8">
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-[#A6A099]">
                    Opportunity expects
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#191817]">{a.expects || a.statement}</p>
                  {oppEv.length > 0 && (
                    <p className="mt-1.5 text-[12px] text-[#77736C]">
                      From [{String(oppEv[0].sourceIndex).padStart(2, '0')}]
                      {sources.find((s) => s.id === oppEv[0].sourceId)?.domain
                        ? ` ${sources.find((s) => s.id === oppEv[0].sourceId)!.domain}`
                        : ''}{' '}
                      — <StatusBadge status={oppEv[0].status} className="!py-[1px]" />
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-[#A6A099]">
                    Your project shows
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#191817]">{a.projectShows || '—'}</p>
                </div>
              </div>

              <WhyTrail
                steps={{
                  evidence: oppEv,
                  interpretation: a.statement,
                  projectEvidence: pe,
                  conclusion: a.why,
                  sources,
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Gaps ---------------- */

const PRIORITY_META: Record<NonNullable<GapFinding['priority']>, { label: string; cls: string; bg: string }> = {
  high: { label: 'High priority', cls: 'text-[#A5554C]', bg: '#F6ECEA' },
  medium: { label: 'Medium priority', cls: 'text-[#B08A3E]', bg: '#F7F1E4' },
  low: { label: 'Low priority', cls: 'text-[#77736C]', bg: '#F0EEE8' },
};

export function GapSection({
  gaps,
  evidence,
  sources,
}: {
  gaps: GapFinding[];
  evidence: EvidenceItem[];
  sources: Source[];
}) {
  if (gaps.length === 0) return null;
  return (
    <section aria-labelledby="gaps-heading">
      <h2 id="gaps-heading" className="eyebrow">Where you have gaps</h2>
      <div className="mt-6 border-t border-[rgba(25,24,23,0.1)]">
        {gaps.map((g) => {
          const priority = PRIORITY_META[g.priority || (g.severity === 'critical' ? 'high' : 'medium')];
          const gapEv = (g.evidenceIds || [])
            .map((id) => evidence.find((e) => e.id === id))
            .filter(Boolean) as EvidenceItem[];
          return (
            <div key={g.id} className="py-7 border-b border-[rgba(25,24,23,0.1)]">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                <span
                  className={`text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-[3px] rounded-full ${priority.cls}`}
                  style={{ background: priority.bg }}
                >
                  {priority.label}
                </span>
                <h3 className="text-[16px] font-medium">{g.area}</h3>
                {!g.requiredByOpportunity && (
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[#A6A099]">strategic</span>
                )}
              </div>

              <dl className="mt-4 space-y-3 max-w-[680px]">
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-[#A6A099]">What is missing</dt>
                  <dd className="mt-1 text-[14px] leading-relaxed text-[#191817]">{g.whatIsMissing || g.statement}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-[#A6A099]">Why it matters</dt>
                  <dd className="mt-1 text-[14px] leading-relaxed text-[#33302c]">{g.whyItMatters || g.why}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-[#A6A099]">Recommended action</dt>
                  <dd className="mt-1 text-[14px] leading-relaxed text-[#191817] font-medium">
                    {g.recommendedAction || 'Address the missing item described above.'}
                  </dd>
                </div>
              </dl>

              <WhyTrail
                steps={{
                  evidence: gapEv,
                  interpretation: g.whyItMatters || g.why,
                  conclusion: g.requiredByOpportunity
                    ? 'The opportunity explicitly references this — closing it directly strengthens your application.'
                    : 'Not explicitly required by the opportunity — closing this is strategic positioning.',
                  action: g.recommendedAction,
                  sources,
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Next moves ---------------- */

export function RecommendationSection({
  recommendations,
  evidence,
  sources,
  onPropose,
  proposingId,
  githubReady,
}: {
  recommendations: Recommendation[];
  evidence: EvidenceItem[];
  sources: Source[];
  onPropose: (recId: string) => void;
  proposingId: string | null;
  githubReady: boolean;
}) {
  const [acted, setActed] = useState<Record<string, true>>({});

  return (
    <section aria-labelledby="recs-heading">
      <h2 id="recs-heading" className="eyebrow">What to do next</h2>
      <div className="mt-6 border-t border-[rgba(25,24,23,0.1)]">
        {recommendations.map((r) => {
          const recEv = (r.evidenceIds || [])
            .map((id) => evidence.find((e) => e.id === id))
            .filter(Boolean) as EvidenceItem[];
          return (
            <div key={r.id} className="py-7 border-b border-[rgba(25,24,23,0.1)]">
              <div className="flex items-baseline gap-4">
                <span className="text-[12px] tabular-nums text-[#A6A099]">
                  {String(r.index).padStart(2, '0')}
                </span>
                <Eyebrow accent className="!mt-0">{r.phase || 'Next move'}</Eyebrow>
              </div>
              <h3 className="font-serif-display mt-3 text-[24px] sm:text-[28px] leading-[1.15] max-w-[620px]">
                {r.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#77736C] max-w-[640px]">{r.rationale}</p>

              <WhyTrail
                steps={{
                  evidence: recEv,
                  interpretation: r.rationale,
                  conclusion: recEv.length
                    ? `${recEv.length} piece${recEv.length === 1 ? '' : 's'} of verified evidence point toward this.`
                    : undefined,
                  sources,
                }}
              />

              {r.action && (
                <div className="mt-5">
                  {acted[r.id] ? (
                    <p className="text-[13px] text-[#5E7D5A]" aria-live="polite">
                      Prepared for your review below.
                    </p>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      disabled={proposingId === r.id}
                      onClick={() => {
                        setActed((p) => ({ ...p, [r.id]: true }));
                        onPropose(r.id);
                      }}
                    >
                      {proposingId === r.id ? 'Preparing…' : 'Prepare GitHub issue'}
                    </button>
                  )}
                  {!githubReady && (
                    <p className="mt-2 text-[12px] text-[#A6A099]">
                      Executing on GitHub requires a token — Contexta will still draft everything for your review.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
