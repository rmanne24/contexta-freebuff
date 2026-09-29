'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  AlignmentFinding,
  EvidenceItem,
  GapFinding,
  Recommendation,
  Source,
} from '@/lib/types';
import { Eyebrow, ExternalLinkIcon } from '@/components/ui';

/* ---------------- Evidence trail (the "Why?" interaction) ---------------- */

export function EvidenceTrail({
  evidenceIds,
  evidence,
  sources,
}: {
  evidenceIds: string[];
  evidence: EvidenceItem[];
  sources: Source[];
}) {
  const [open, setOpen] = useState(false);
  const items = evidenceIds.map((id) => evidence.find((e) => e.id === id)).filter(Boolean) as EvidenceItem[];
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={evidenceIds.join('-')}
        className="btn-text text-[12.5px] uppercase tracking-[0.14em] font-medium"
      >
        Why?
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={evidenceIds.join('-')}
        className="overflow-hidden transition-[grid-template-rows,opacity] duration-300"
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="min-h-0">
          <div className="mt-5 border-l border-[rgba(25,24,23,0.18)] pl-5 space-y-5">
            {items.map((ev, i) => {
              const src = sources.find((s) => s.id === ev.sourceId);
              return (
                <div key={ev.id} className="relative">
                  <span
                    className="absolute -left-[25px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#6F5B91]"
                    aria-hidden="true"
                  />
                  <div className="flex items-baseline gap-3">
                    <span className="text-[11px] tabular-nums text-[#A6A099]">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-[12px] uppercase tracking-[0.1em] text-[#6F5B91]">{ev.claim}</p>
                  </div>
                  <blockquote className="mt-2 font-serif-display text-[16.5px] leading-[1.55] text-[#33302c]">
                    “{ev.quote}”
                  </blockquote>
                  {src && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[#77736C] hover:text-[#191817] transition-colors"
                    >
                      [{String(src.index).padStart(2, '0')}] {src.domain} <ExternalLinkIcon />
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

/* ---------------- Alignment ---------------- */

const LEVEL_META: Record<AlignmentFinding['level'], { label: string; cls: string; bg: string }> = {
  strong: { label: 'Strong alignment', cls: 'text-[#5E7D5A]', bg: '#EFF3EC' },
  partial: { label: 'Partial alignment', cls: 'text-[#B08A3E]', bg: '#F7F1E4' },
  attention: { label: 'Needs attention', cls: 'text-[#A5554C]', bg: '#F6ECEA' },
};

export function AlignmentSection({
  alignment,
  evidence,
  sources,
}: {
  alignment: AlignmentFinding[];
  evidence: EvidenceItem[];
  sources: Source[];
}) {
  if (alignment.length === 0) return null;
  return (
    <section aria-labelledby="align-heading">
      <h2 id="align-heading" className="eyebrow">Where you’re aligned</h2>
      <div className="mt-6 border-t border-[rgba(25,24,23,0.1)]">
        {alignment.map((a) => {
          const meta = LEVEL_META[a.level];
          return (
            <div key={a.id} className="py-6 border-b border-[rgba(25,24,23,0.1)]">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                <span className={`text-[11px] uppercase tracking-[0.14em] font-medium px-2.5 py-1 rounded-full ${meta.cls}`} style={{ background: meta.bg }}>
                  {meta.label}
                </span>
                <h3 className="text-[16px] font-medium">{a.area}</h3>
              </div>
              <p className="mt-2.5 text-[14px] leading-relaxed text-[#77736C] max-w-[640px]">{a.statement}</p>
              <EvidenceTrail evidenceIds={a.evidenceIds} evidence={evidence} sources={sources} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Gaps ---------------- */

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
      <h2 id="gaps-heading" className="eyebrow">What’s missing</h2>
      <div className="mt-6 border-t border-[rgba(25,24,23,0.1)]">
        {gaps.map((g) => (
          <div key={g.id} className="py-6 border-b border-[rgba(25,24,23,0.1)]">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] font-medium text-[#B08A3E]">
                {g.severity === 'critical' ? 'Needs attention' : 'Worth closing'}
              </span>
              <h3 className="text-[16px] font-medium">{g.area}</h3>
            </div>
            <p className="mt-2.5 text-[14px] leading-relaxed text-[#77736C] max-w-[640px]">{g.statement}</p>
            <EvidenceTrail evidenceIds={g.evidenceIds} evidence={evidence} sources={sources} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Recommendations ---------------- */

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
          const evCount = r.evidenceIds.length;
          return (
            <div key={r.id} className="py-7 border-b border-[rgba(25,24,23,0.1)]">
              <Eyebrow accent>Next move {String(r.index).padStart(2, '0')}</Eyebrow>
              <h3 className="font-serif-display mt-3 text-[24px] sm:text-[28px] leading-[1.15] max-w-[620px]">
                {r.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#77736C] max-w-[640px]">{r.rationale}</p>

              <EvidenceTrail evidenceIds={r.evidenceIds} evidence={evidence} sources={sources} />

              {r.action && (
                <div className="mt-6">
                  <p className="text-[12px] text-[#A6A099]">
                    {evCount > 0 ? `${evCount} piece${evCount === 1 ? '' : 's'} of evidence point toward this. ` : ''}
                    {githubReady
                      ? 'Contexta can open a GitHub issue in your repository — with your approval.'
                      : 'Approve on GitHub requires a server token — Contexta will still draft everything for review.'}
                  </p>
                  {acted[r.id] ? (
                    <p className="mt-4 text-[13px] text-[#5E7D5A]" aria-live="polite">
                      Prepared for your review below.
                    </p>
                  ) : (
                    <button
                      className="btn btn-ghost mt-4"
                      disabled={proposingId === r.id}
                      onClick={() => {
                        setActed((p) => ({ ...p, [r.id]: true }));
                        onPropose(r.id);
                      }}
                    >
                      {proposingId === r.id ? 'Preparing…' : 'Prepare GitHub issue'}
                    </button>
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
