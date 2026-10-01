'use client';

import { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import type {
  WorkflowState,
  PresentationReview,
  PresentationMistake,
  Source,
  EvidenceItem,
  RequirementItem,
} from '@/lib/types';
import { Eyebrow, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/workspace/EvidenceBits';

interface DeckReviewSectionProps {
  workflow: WorkflowState;
  onUpdate: (updated: WorkflowState) => void;
}

type Tab = 'issues' | 'criteria' | 'slides';

export function DeckReviewSection({ workflow, onUpdate }: DeckReviewSectionProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('issues');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const review: PresentationReview | undefined = workflow.presentation?.review;

  async function handleFileUpload(file: File) {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/workflows/${workflow.id}/presentation`, {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { ok?: boolean; workflow?: WorkflowState; error?: string };
      if (!res.ok || !data.workflow) {
        throw new Error(data.error || 'Failed to review the presentation.');
      }
      onUpdate(data.workflow);
      setActiveTab('issues');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePasteSubmit() {
    if (!pasteText.trim()) return;
    setUploading(true);
    setError(null);

    try {
      const res = await fetch(`/api/workflows/${workflow.id}/presentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText, filename: 'pasted-outline.txt' }),
      });
      const data = (await res.json()) as { ok?: boolean; workflow?: WorkflowState; error?: string };
      if (!res.ok || !data.workflow) {
        throw new Error(data.error || 'Failed to analyze the presentation.');
      }
      onUpdate(data.workflow);
      setShowPasteModal(false);
      setPasteText('');
      setActiveTab('issues');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Remove this presentation review?')) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/presentation`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { workflow?: WorkflowState };
      if (data.workflow) {
        onUpdate(data.workflow);
      }
    } catch {
      alert('Could not remove the presentation.');
    } finally {
      setUploading(false);
    }
  }

  // ---------------- Empty state: upload ----------------
  if (!review) {
    return (
      <section aria-labelledby="pitch-review-heading" className="paper p-8 mt-12 text-center">
        <div className="max-w-[640px] mx-auto">
          <Eyebrow accent className="justify-center">Pitch deck review</Eyebrow>
          <h2 id="pitch-review-heading" className="font-serif-display text-[26px] mt-2 leading-snug">
            Compare your deck against the opportunity
          </h2>
          <p className="mt-2.5 text-[14px] text-[#77736C] leading-relaxed mx-auto">
            Upload your deck and Contexta will compare it against the opportunity — flagging required
            material your slides never address, unsupported claims, and text-heavy slides.
          </p>
          <p className="mt-2 text-[12.5px] text-[#A6A099] leading-relaxed mx-auto">
            Contexta does not invent a judging rubric. Only requirements verified from the
            opportunity&rsquo;s own sources are checked.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className={`mt-6 border-2 border-dashed rounded-[12px] p-8 text-center transition-all ${
            dragOver
              ? 'border-[#6F5B91] bg-[#F3EFFA]/40 scale-[1.005]'
              : 'border-[rgba(25,24,23,0.15)] hover:border-[rgba(25,24,23,0.3)] bg-[#FBF9F2]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />

          {uploading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3">
              <Spinner className="!h-6 !w-6 border-2" />
              <p className="text-[14px] font-medium text-[#191817]">Extracting slides and comparing against the opportunity…</p>
              <p className="text-[12px] text-[#77736C]">Checking structure, density, and verified requirements</p>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-[#EFECE6] grid place-items-center text-[#6F5B91] mb-3">
                <UploadCloud size={24} strokeWidth={1.8} />
              </div>
              <p className="text-[14.5px] font-medium text-[#191817]">
                Drop your <span className="text-[#6F5B91] font-semibold">.pptx</span> deck here
              </p>
              <p className="mt-1 text-[13px] text-[#77736C]">or browse from your computer</p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary !py-2 !px-4 text-[13px]"
                >
                  <FileText size={15} /> Select deck (.pptx)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="btn btn-ghost !py-2 !px-4 text-[13px]"
                >
                  Paste text outline
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-[13px] text-[#A5554C] flex items-center justify-center gap-2">
            <XCircle size={15} /> {error}
          </p>
        )}

        {showPasteModal && (
          <div className="mt-6 p-5 rounded-[10px] bg-[#FBF9F2] border border-[rgba(25,24,23,0.12)] text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#191817]">Paste a slide outline instead</span>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-[12px] text-[#77736C] hover:text-[#191817]"
              >
                Cancel
              </button>
            </div>
            <textarea
              rows={7}
              placeholder={'Slide 1: Title\nSlide 2: The problem\nSlide 3: What we built\nSlide 4: How it works\nSlide 5: Demo\nSlide 6: Results & next steps'}
              className="input text-[13px] font-mono"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim() || uploading}
                className="btn btn-primary !py-2 !px-4 text-[13px]"
              >
                {uploading ? <Spinner /> : 'Review outline'}
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ---------------- Reviewed state ----------------
  const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
    A: { bg: 'bg-[#EBF3E8]', text: 'text-[#416B38]', border: 'border-[#BDDCB5]' },
    B: { bg: 'bg-[#F3EFFA]', text: 'text-[#6F5B91]', border: 'border-[#D9CFE8]' },
    C: { bg: 'bg-[#FFF6E6]', text: 'text-[#B4741E]', border: 'border-[#F1D6A4]' },
    'Needs Work': { bg: 'bg-[#FDF0EE]', text: 'text-[#B8473D]', border: 'border-[#F1BDB7]' },
  };
  const badge = gradeColors[review.grade] || gradeColors['Needs Work'];

  const rubricAvailable = review.rubricAvailable === true;
  const totalCriteria =
    review.opportunityMatches.matchedCriteria.length + review.opportunityMatches.missingCriteria.length;
  const issueCount = review.criticalMistakes.length + review.warnings.length;

  return (
    <section aria-labelledby="pitch-review-heading" className="paper p-8 mt-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[rgba(25,24,23,0.08)]">
        <div>
          <div className="flex items-center gap-3">
            <Eyebrow accent>Pitch deck review</Eyebrow>
            <span className="text-[12px] text-[#A6A099] truncate max-w-[280px]">{workflow.presentation?.filename}</span>
          </div>
          <h2 id="pitch-review-heading" className="font-serif-display text-[28px] mt-2 leading-tight">
            Deck review
          </h2>
          <p className="mt-2 text-[14.5px] text-[#55514B] max-w-[620px] leading-relaxed">{review.summary}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className={`px-5 py-3 rounded-[12px] border ${badge.bg} ${badge.border} text-center`}>
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Deck check</div>
            <div className={`text-[28px] font-serif-display font-bold leading-none mt-1 ${badge.text}`}>
              {review.grade}
            </div>
            <div className="text-[12px] opacity-80 mt-0.5">{review.overallScore}/100</div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            title="Replace this deck"
            className="p-2.5 rounded-[8px] text-[#77736C] hover:text-[#191817] hover:bg-[rgba(25,24,23,0.05)] transition-colors border border-[rgba(25,24,23,0.1)]"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric label="Slides" value={String(review.slideCount)} unit="" />
        <Metric label="Word density" value={String(review.avgWordsPerSlide)} unit="words / slide" />
        <Metric
          label="Issues found"
          value={String(issueCount)}
          unit=""
          tone={review.criticalMistakes.length > 0 ? 'warn' : 'ok'}
        />
        <Metric
          label="Verified criteria"
          value={rubricAvailable ? String(review.opportunityMatches.matchedCriteria.length) : '—'}
          unit={rubricAvailable ? `of ${totalCriteria} addressed` : 'none verified'}
        />
      </div>

      {/* Honest rubric note */}
      {!rubricAvailable && (
        <div className="p-4 rounded-[10px] bg-[#FFF6E6]/70 border border-[#F1D6A4] flex items-start gap-3">
          <AlertTriangle size={16} className="text-[#B4741E] shrink-0 mt-0.5" />
          <p className="text-[13px] leading-relaxed text-[#7A4B0E]">
            <span className="font-semibold">No verified judging criteria. </span>
            The research did not verify explicit requirements or selection criteria from the
            opportunity&rsquo;s own sources, so no rubric match is shown. This review covers structure,
            readability, and proof of work only — Contexta does not invent criteria.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[rgba(25,24,23,0.1)] pt-2">
        <TabButton active={activeTab === 'issues'} onClick={() => setActiveTab('issues')}>
          Issues ({issueCount})
        </TabButton>
        {rubricAvailable && (
          <TabButton active={activeTab === 'criteria'} onClick={() => setActiveTab('criteria')}>
            Verified criteria ({totalCriteria})
          </TabButton>
        )}
        <TabButton active={activeTab === 'slides'} onClick={() => setActiveTab('slides')}>
          Slide by slide ({review.slideBreakdown.length})
        </TabButton>
      </div>

      {/* Issues */}
      {activeTab === 'issues' && (
        <div className="space-y-6 pt-1">
          {issueCount === 0 && (
            <div className="p-6 rounded-[10px] bg-[#EBF3E8] border border-[#BDDCB5] flex items-center gap-3 text-[#416B38]">
              <CheckCircle2 size={20} className="shrink-0" />
              <p className="text-[13.5px] font-medium">No issues detected in this pass. The deck is clean on structure, density, and proof of work.</p>
            </div>
          )}

          {review.criticalMistakes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#A5554C]">
                <XCircle size={16} />
                <span className="text-[13px] font-semibold uppercase tracking-wider">
                  Critical issues ({review.criticalMistakes.length})
                </span>
              </div>
              {review.criticalMistakes.map((m) => (
                <IssueCard key={m.id} mistake={m} workflow={workflow} />
              ))}
            </div>
          )}

          {review.warnings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#B4741E]">
                <AlertTriangle size={16} />
                <span className="text-[13px] font-semibold uppercase tracking-wider">
                  Warnings ({review.warnings.length})
                </span>
              </div>
              {review.warnings.map((m) => (
                <IssueCard key={m.id} mistake={m} workflow={workflow} />
              ))}
            </div>
          )}

          {review.strengths.length > 0 && (
            <div className="pt-4 border-t border-[rgba(25,24,23,0.06)]">
              <span className="text-[12px] font-medium text-[#77736C] uppercase tracking-wider block mb-2.5">
                What works
              </span>
              <ul className="space-y-2">
                {review.strengths.map((st, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[#416B38]">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Verified criteria */}
      {activeTab === 'criteria' && rubricAvailable && (
        <div className="space-y-4 pt-1">
          <p className="text-[13px] text-[#55514B] leading-relaxed max-w-[680px]">
            These statements come from the opportunity&rsquo;s own sources and were verified during
            research. Each one is checked against your slide text.
          </p>
          <ul className="space-y-3">
            {rubricCriteria(workflow.intel?.items).map((item) => {
              const covered = isCriterionCovered(item, review);
              const source = criterionSource(item, workflow);
              return (
                <li
                  key={item.id}
                  className={`p-4 rounded-[10px] border ${
                    covered ? 'bg-[#EBF3E8]/50 border-[#BDDCB5]/70' : 'bg-[#FFF6E6]/60 border-[#F1D6A4]/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {covered ? (
                      <CheckCircle2 size={15} className="text-[#416B38] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={15} className="text-[#B4741E] shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[13.5px] leading-snug text-[#191817]">{item.statement}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-[#77736C]">
                        <StatusBadge status="verified" className="!py-[1px]" />
                        <span>{covered ? 'Addressed in the deck' : 'Not addressed in the deck'}</span>
                        {source && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-[#191817] underline decoration-[rgba(25,24,23,0.2)] underline-offset-2"
                          >
                            Source [{String(source.index).padStart(2, '0')}] {source.domain}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Slide-by-slide */}
      {activeTab === 'slides' && (
        <div className="space-y-3 pt-1">
          {review.slideBreakdown.map((slide) => {
            const isExpanded = expandedSlide === slide.slideNumber;
            return (
              <div
                key={slide.slideNumber}
                className="border border-[rgba(25,24,23,0.1)] rounded-[10px] bg-[#FBF9F2] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSlide(isExpanded ? null : slide.slideNumber)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[rgba(25,24,23,0.02)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[12px] font-mono text-[#6F5B91] bg-[#F3EFFA] px-2 py-0.5 rounded font-medium shrink-0">
                      Slide {slide.slideNumber}
                    </span>
                    <span className="text-[14px] font-medium text-[#191817] truncate">
                      {slide.title || `Slide ${slide.slideNumber}`}
                    </span>
                    <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider text-[#77736C] bg-[rgba(25,24,23,0.05)] px-2 py-0.5 rounded shrink-0">
                      {slide.detectedType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[12px] ${slide.wordCount > 85 ? 'text-[#B4741E] font-medium' : 'text-[#77736C]'}`}>
                      {slide.wordCount} words
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-[rgba(25,24,23,0.06)] bg-white/50 space-y-1.5">
                    {slide.feedback.map((f, fi) => (
                      <p key={fi} className="text-[12.5px] text-[#55514B] flex items-start gap-2">
                        <span className="text-[#6F5B91] mt-[1px] shrink-0">–</span>
                        <span>{f}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ---------------- helpers ---------------- */

function Metric({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: 'ok' | 'warn';
}) {
  const toneCls = tone === 'warn' ? 'text-[#A5554C]' : tone === 'ok' ? 'text-[#416B38]' : 'text-[#191817]';
  return (
    <div className="p-3.5 rounded-[8px] bg-[#FBF9F2] border border-[rgba(25,24,23,0.06)]">
      <span className="text-[11px] text-[#77736C] uppercase tracking-wider block">{label}</span>
      <span className={`text-[20px] font-serif-display font-semibold ${toneCls}`}>
        {value}
        {unit && <span className="text-[12px] font-sans font-normal text-[#77736C]"> {unit}</span>}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-3 px-3 text-[13.5px] font-medium transition-all relative ${
        active ? 'text-[#191817]' : 'text-[#77736C] hover:text-[#191817]'
      }`}
    >
      {children}
      {active && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#6F5B91]" />}
    </button>
  );
}

/** Intel items the rubric was built from (mirrors deckReviewer's filter). */
function rubricCriteria(items?: RequirementItem[]): RequirementItem[] {
  return (items || []).filter(
    (i) =>
      i.status === 'verified' &&
      ['selection_criterion', 'requirement', 'organizer_priority'].includes(i.category)
  );
}

/** Match a criterion back to the matched/missing lists by statement prefix. */
function isCriterionCovered(item: RequirementItem, review: PresentationReview): boolean {
  const prefix = item.statement.slice(0, 60);
  return review.opportunityMatches.matchedCriteria.some((c) => c.startsWith(prefix.slice(0, 40)));
}

/** Resolve the source behind a criterion via its first evidence item. */
function criterionSource(item: RequirementItem, workflow: WorkflowState): Source | undefined {
  const evId = item.evidenceIds[0];
  if (!evId) return undefined;
  const ev = (workflow.evidence as EvidenceItem[]).find((e) => e.id === evId);
  return workflow.sources.find((s) => s.id === ev?.sourceId);
}

/**
 * Issue card with the full spec structure:
 * ISSUE / WHY IT MATTERS / SLIDE / EVIDENCE / SUGGESTED CHANGE
 */
function IssueCard({ mistake, workflow }: { mistake: PresentationMistake; workflow: WorkflowState }) {
  const isCritical = mistake.severity === 'critical';

  // For rubric mistakes, the offending criterion's statement is embedded in the
  // explanation inside curly quotes — resolve it back to its source.
  let evidenceSource: Source | undefined;
  if (mistake.category === 'rubric') {
    const quoted = mistake.explanation.match(/“(.+?)”/);
    if (quoted) {
      const item = (workflow.intel?.items || []).find(
        (i) => quoted[1].includes(i.statement.slice(0, 40)) || i.statement.startsWith(quoted[1].slice(0, 40))
      );
      if (item) evidenceSource = criterionSource(item, workflow);
    }
  }

  return (
    <div
      className={`rounded-[10px] border ${
        isCritical ? 'bg-[#FDF0EE] border-[#F1BDB7]' : 'bg-[#FFF6E6] border-[#F1D6A4]'
      }`}
    >
      {/* ISSUE */}
      <div className="flex items-start justify-between gap-3 p-4 pb-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className={`text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded shrink-0 mt-[3px] ${
              isCritical ? 'bg-[#F6DCD8] text-[#A5554C]' : 'bg-[#F1D6A4] text-[#7A4B0E]'
            }`}
          >
            Issue
          </span>
          <span className="text-[14px] font-medium text-[#191817] leading-snug">{mistake.title}</span>
        </div>
        {mistake.slideNumber != null && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/70 text-[#55514B] shrink-0">
            Slide {mistake.slideNumber}
          </span>
        )}
      </div>

      {/* WHY IT MATTERS */}
      <div className="px-4 pt-3 pl-[68px]">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#77736C] font-medium block">
          Why it matters
        </span>
        <p className="mt-1 text-[13px] text-[#55514B] leading-relaxed">{mistake.explanation}</p>

        {/* EVIDENCE (rubric issues link to the verified source) */}
        {evidenceSource && (
          <p className="mt-2 text-[12px] text-[#77736C]">
            <span className="uppercase tracking-[0.14em] text-[10.5px] font-medium">Evidence. </span>
            <a
              href={evidenceSource.url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[rgba(25,24,23,0.2)] underline-offset-2 hover:text-[#191817]"
            >
              Source [{String(evidenceSource.index).padStart(2, '0')}] {evidenceSource.domain}
            </a>
          </p>
        )}

        {/* SUGGESTED CHANGE */}
        <div className="mt-3 pb-4 pt-2.5 border-t border-[rgba(25,24,23,0.08)]">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#6F5B91] font-medium block">
            Suggested change
          </span>
          <p className="mt-1 text-[13px] text-[#191817] leading-relaxed">{mistake.fix}</p>
        </div>
      </div>
    </div>
  );
}
