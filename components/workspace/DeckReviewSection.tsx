'use client';

import { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { WorkflowState, PresentationReview, PresentationMistake } from '@/lib/types';
import { Eyebrow, Spinner } from '@/components/ui';

interface DeckReviewSectionProps {
  workflow: WorkflowState;
  onUpdate: (updated: WorkflowState) => void;
}

export function DeckReviewSection({ workflow, onUpdate }: DeckReviewSectionProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'mistakes' | 'slides' | 'rubric'>('mistakes');
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
        throw new Error(data.error || 'Failed to review presentation.');
      }
      onUpdate(data.workflow);
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
        throw new Error(data.error || 'Failed to analyze presentation.');
      }
      onUpdate(data.workflow);
      setShowPasteModal(false);
      setPasteText('');
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
    } catch (e) {
      alert('Could not remove presentation.');
    } finally {
      setUploading(false);
    }
  }

  // --- Render: Empty state / Dropzone ---
  if (!review) {
    return (
      <section aria-labelledby="pitch-review-heading" className="paper p-8 mt-12 text-center">
        <div className="max-w-[640px] mx-auto">
          <Eyebrow accent className="justify-center">Pitch Deck Review</Eyebrow>
          <h2 id="pitch-review-heading" className="font-serif-display text-[26px] mt-2 leading-snug">
            Review your presentation against the opportunity
          </h2>
          <p className="mt-2.5 text-[14px] text-[#77736C] leading-relaxed mx-auto">
            Upload your PowerPoint (<code className="text-[12px] bg-[rgba(25,24,23,0.05)] px-1.5 py-0.5 rounded">.pptx</code>) or presentation outline. Contexta will inspect every slide, flag text-heavy walls of words, spot structural omissions, and check if your deck aligns with the opportunity’s judging rubric.
          </p>
        </div>

        {/* Dropzone */}
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
            accept=".pptx,.ppt,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />

          {uploading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3">
              <Spinner className="!h-6 !w-6 border-2" />
              <p className="text-[14px] font-medium text-[#191817]">Extracting slides & analyzing against rubric…</p>
              <p className="text-[12px] text-[#77736C]">Checking structure, density, evidence claims, and opportunity criteria</p>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-[#EFECE6] grid place-items-center text-[#6F5B91] mb-3">
                <UploadCloud size={24} strokeWidth={1.8} />
              </div>
              <p className="text-[14.5px] font-medium text-[#191817]">
                Drop your <span className="text-[#6F5B91] font-semibold">.pptx</span> presentation here
              </p>
              <p className="mt-1 text-[13px] text-[#77736C]">
                or browse from your computer
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary !py-2 !px-4 text-[13px]"
                >
                  <FileText size={15} /> Select PowerPoint (.pptx)
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
          <p role="alert" className="mt-4 text-[13px] text-[#A5554C] flex items-center gap-2">
            <XCircle size={15} /> {error}
          </p>
        )}

        {/* Text paste modal */}
        {showPasteModal && (
          <div className="mt-6 p-5 rounded-[10px] bg-[#FBF9F2] border border-[rgba(25,24,23,0.12)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#191817]">Paste Presentation Outline or Slide Text</span>
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
              placeholder="Slide 1: Title & Hook&#10;Slide 2: Problem - Students lose hours searching for grants&#10;Slide 3: Solution - Contexta autonomous research&#10;Slide 4: Architecture - Next.js, Node agents, GitHub API&#10;Slide 5: Live Demo & Video walkthrough&#10;Slide 6: Conclusion & Roadmap"
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

  // --- Render: Reviewed presentation state ---
  const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
    A: { bg: 'bg-[#EBF3E8]', text: 'text-[#416B38]', border: 'border-[#BDDCB5]' },
    B: { bg: 'bg-[#F3EFFA]', text: 'text-[#6F5B91]', border: 'border-[#D9CFE8]' },
    C: { bg: 'bg-[#FFF6E6]', text: 'text-[#B4741E]', border: 'border-[#F1D6A4]' },
    'Needs Work': { bg: 'bg-[#FDF0EE]', text: 'text-[#B8473D]', border: 'border-[#F1BDB7]' },
  };

  const badge = gradeColors[review.grade] || gradeColors['Needs Work'];

  return (
    <section aria-labelledby="pitch-review-heading" className="paper p-8 mt-12 space-y-8">
      {/* Header with score and metadata */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[rgba(25,24,23,0.08)]">
        <div>
          <div className="flex items-center gap-3">
            <Eyebrow accent>Pitch Deck Review</Eyebrow>
            <span className="text-[12px] text-[#A6A099]">• {workflow.presentation?.filename}</span>
          </div>
          <h2 id="pitch-review-heading" className="font-serif-display text-[28px] mt-2 leading-tight">
            Presentation Diagnosis
          </h2>
          <p className="mt-2 text-[14.5px] text-[#55514B] max-w-[620px] leading-relaxed">
            {review.summary}
          </p>
        </div>

        {/* Score & Grade pill */}
        <div className="flex items-center gap-4 shrink-0">
          <div className={`px-5 py-3 rounded-[12px] border ${badge.bg} ${badge.border} text-center`}>
            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">
              Deck Grade
            </div>
            <div className={`text-[28px] font-serif-display font-bold leading-none mt-1 ${badge.text}`}>
              {review.grade}
            </div>
            <div className="text-[12px] opacity-80 mt-0.5">{review.overallScore}/100 pts</div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            title="Replace presentation"
            className="p-2.5 rounded-[8px] text-[#77736C] hover:text-[#191817] hover:bg-[rgba(25,24,23,0.05)] transition-colors border border-[rgba(25,24,23,0.1)]"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Overview metrics bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-[8px] bg-[#FBF9F2] border border-[rgba(25,24,23,0.06)]">
          <span className="text-[11px] text-[#77736C] uppercase tracking-wider block">Slide Count</span>
          <span className="text-[20px] font-serif-display font-semibold text-[#191817]">
            {review.slideCount} <span className="text-[12px] font-sans font-normal text-[#77736C]">slides</span>
          </span>
        </div>
        <div className="p-3.5 rounded-[8px] bg-[#FBF9F2] border border-[rgba(25,24,23,0.06)]">
          <span className="text-[11px] text-[#77736C] uppercase tracking-wider block">Word Density</span>
          <span className="text-[20px] font-serif-display font-semibold text-[#191817]">
            {review.avgWordsPerSlide} <span className="text-[12px] font-sans font-normal text-[#77736C]">words/slide</span>
          </span>
        </div>
        <div className="p-3.5 rounded-[8px] bg-[#FBF9F2] border border-[rgba(25,24,23,0.06)]">
          <span className="text-[11px] text-[#77736C] uppercase tracking-wider block">Critical Mistakes</span>
          <span className={`text-[20px] font-serif-display font-semibold ${review.criticalMistakes.length > 0 ? 'text-[#A5554C]' : 'text-[#416B38]'}`}>
            {review.criticalMistakes.length}
          </span>
        </div>
        <div className="p-3.5 rounded-[8px] bg-[#FBF9F2] border border-[rgba(25,24,23,0.06)]">
          <span className="text-[11px] text-[#77736C] uppercase tracking-wider block">Rubric Match</span>
          <span className="text-[20px] font-serif-display font-semibold text-[#6F5B91]">
            {review.opportunityMatches.matchedCriteria.length} <span className="text-[12px] font-sans font-normal text-[#77736C]">aligned</span>
          </span>
        </div>
      </div>

      {/* Category breakdown bars */}
      <div className="space-y-3 pt-2">
        <span className="text-[12px] font-medium text-[#77736C] uppercase tracking-wider block">
          Evaluation Dimensions (25 pts each)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CategoryBar label="Narrative & Structure" score={review.categoryScores.structure} max={25} />
          <CategoryBar label="Slide Readability & Brevity" score={review.categoryScores.readability} max={25} />
          <CategoryBar label="Opportunity Rubric Alignment" score={review.categoryScores.rubricAlignment} max={25} />
          <CategoryBar label="Proof-of-Work & Evidence" score={review.categoryScores.evidenceAndDemo} max={25} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[rgba(25,24,23,0.1)] pt-4">
        <button
          type="button"
          onClick={() => setActiveTab('mistakes')}
          className={`pb-3 px-3 text-[13.5px] font-medium transition-all relative ${
            activeTab === 'mistakes' ? 'text-[#191817]' : 'text-[#77736C] hover:text-[#191817]'
          }`}
        >
          Mistakes & Warnings ({review.criticalMistakes.length + review.warnings.length})
          {activeTab === 'mistakes' && (
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#6F5B91]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rubric')}
          className={`pb-3 px-3 text-[13.5px] font-medium transition-all relative ${
            activeTab === 'rubric' ? 'text-[#191817]' : 'text-[#77736C] hover:text-[#191817]'
          }`}
        >
          Opportunity Rubric Match
          {activeTab === 'rubric' && (
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#6F5B91]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('slides')}
          className={`pb-3 px-3 text-[13.5px] font-medium transition-all relative ${
            activeTab === 'slides' ? 'text-[#191817]' : 'text-[#77736C] hover:text-[#191817]'
          }`}
        >
          Slide-by-Slide Breakdown ({review.slideBreakdown.length})
          {activeTab === 'slides' && (
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#6F5B91]" />
          )}
        </button>
      </div>

      {/* Tab Content: Mistakes & Warnings */}
      {activeTab === 'mistakes' && (
        <div className="space-y-6 pt-2">
          {review.criticalMistakes.length === 0 && review.warnings.length === 0 ? (
            <div className="p-6 rounded-[10px] bg-[#EBF3E8] border border-[#BDDCB5] flex items-center gap-3 text-[#416B38]">
              <CheckCircle2 size={20} className="shrink-0" />
              <p className="text-[13.5px] font-medium">No critical mistakes detected! Your presentation meets clean pitch standards.</p>
            </div>
          ) : null}

          {/* Critical Mistakes */}
          {review.criticalMistakes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#A5554C]">
                <XCircle size={16} />
                <span className="text-[13px] font-semibold uppercase tracking-wider">
                  Critical Mistakes ({review.criticalMistakes.length}) — High risk of scoring penalty
                </span>
              </div>
              <div className="space-y-3">
                {review.criticalMistakes.map((m) => (
                  <MistakeCard key={m.id} mistake={m} />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {review.warnings.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2 text-[#B4741E]">
                <AlertTriangle size={16} />
                <span className="text-[13px] font-semibold uppercase tracking-wider">
                  Presentation Warnings ({review.warnings.length}) — Recommended polish
                </span>
              </div>
              <div className="space-y-3">
                {review.warnings.map((w) => (
                  <MistakeCard key={w.id} mistake={w} />
                ))}
              </div>
            </div>
          )}

          {/* Deck Strengths */}
          {review.strengths.length > 0 && (
            <div className="pt-4 border-t border-[rgba(25,24,23,0.06)]">
              <span className="text-[12px] font-medium text-[#77736C] uppercase tracking-wider block mb-2.5">
                Deck Strengths
              </span>
              <ul className="space-y-2">
                {review.strengths.map((st, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-[#416B38]">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Rubric Matching */}
      {activeTab === 'rubric' && (
        <div className="space-y-6 pt-2">
          <p className="text-[13.5px] text-[#55514B] leading-relaxed">
            Contexta compares the claims in your slides directly against the requirements and evaluation criteria discovered during research for <strong>{workflow.opportunity.title}</strong>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched */}
            <div className="p-5 rounded-[10px] bg-[#EBF3E8]/60 border border-[#BDDCB5]/80">
              <div className="flex items-center gap-2 text-[#416B38] mb-3">
                <CheckCircle2 size={16} />
                <span className="text-[13px] font-semibold uppercase tracking-wider">
                  Addressed in Presentation ({review.opportunityMatches.matchedCriteria.length})
                </span>
              </div>
              {review.opportunityMatches.matchedCriteria.length === 0 ? (
                <p className="text-[12.5px] text-[#77736C] italic">None of the primary criteria were detected in your slide text.</p>
              ) : (
                <ul className="space-y-2">
                  {review.opportunityMatches.matchedCriteria.map((c, i) => (
                    <li key={i} className="text-[13px] text-[#2C4825] flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#416B38]" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Missing */}
            <div className="p-5 rounded-[10px] bg-[#FFF6E6]/60 border border-[#F1D6A4]/80">
              <div className="flex items-center gap-2 text-[#B4741E] mb-3">
                <AlertTriangle size={16} />
                <span className="text-[13px] font-semibold uppercase tracking-wider">
                  Missing from Slides ({review.opportunityMatches.missingCriteria.length})
                </span>
              </div>
              {review.opportunityMatches.missingCriteria.length === 0 ? (
                <p className="text-[12.5px] text-[#416B38] font-medium">All target opportunity criteria are represented in your deck!</p>
              ) : (
                <ul className="space-y-2">
                  {review.opportunityMatches.missingCriteria.map((c, i) => (
                    <li key={i} className="text-[13px] text-[#7A4B0E] flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#B4741E]" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Slide-by-slide */}
      {activeTab === 'slides' && (
        <div className="space-y-3 pt-2">
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
                  <div className="px-5 pb-5 pt-1 border-t border-[rgba(25,24,23,0.06)] bg-white/50 space-y-3">
                    <div className="text-[12.5px] text-[#55514B] space-y-1">
                      {slide.feedback.map((f, fi) => (
                        <p key={fi} className="flex items-start gap-2">
                          <ArrowRight size={13} className="text-[#6F5B91] mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </p>
                      ))}
                    </div>
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

function CategoryBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const tone = pct >= 80 ? 'bg-[#5E7D5A]' : pct >= 60 ? 'bg-[#6F5B91]' : 'bg-[#B4741E]';

  return (
    <div className="p-3.5 rounded-[8px] bg-[#FBF9F2] border border-[rgba(25,24,23,0.06)]">
      <div className="flex items-center justify-between text-[12.5px] mb-2">
        <span className="font-medium text-[#191817]">{label}</span>
        <span className="font-mono text-[#77736C]">{score} / {max}</span>
      </div>
      <div className="h-2 w-full bg-[rgba(25,24,23,0.08)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MistakeCard({ mistake }: { mistake: PresentationMistake }) {
  const isCritical = mistake.severity === 'critical';

  return (
    <div
      className={`p-4 rounded-[10px] border ${
        isCritical
          ? 'bg-[#FDF0EE] border-[#F1BDB7]'
          : 'bg-[#FFF6E6] border-[#F1D6A4]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <XCircle size={15} className="text-[#A5554C] shrink-0" />
          ) : (
            <AlertTriangle size={15} className="text-[#B4741E] shrink-0" />
          )}
          <span className="text-[13.5px] font-medium text-[#191817]">{mistake.title}</span>
        </div>
        {mistake.slideNumber && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/70 text-[#55514B] shrink-0">
            Slide {mistake.slideNumber}
          </span>
        )}
      </div>

      <p className="mt-2 text-[13px] text-[#55514B] leading-relaxed pl-6">
        {mistake.explanation}
      </p>

      <div className="mt-3 pl-6 pt-2 border-t border-[rgba(25,24,23,0.08)] text-[12.5px] text-[#191817]">
        <span className="font-semibold text-[#6F5B91]">Recommended Fix: </span>
        <span>{mistake.fix}</span>
      </div>
    </div>
  );
}
