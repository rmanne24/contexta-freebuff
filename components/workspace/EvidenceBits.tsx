'use client';

import type { EvidenceItem, EvidenceType, Source, VerificationStatus } from '@/lib/types';

/* ---------------- Verification status labels ---------------- */

const STATUS_META: Record<VerificationStatus, { label: string; cls: string; bg: string; title: string }> = {
  verified: {
    label: 'Verified',
    cls: 'text-[#5E7D5A]',
    bg: '#EFF3EC',
    title: 'Explicitly stated by an official source',
  },
  inferred: {
    label: 'Inferred',
    cls: 'text-[#6F5B91]',
    bg: '#F3EFFA',
    title: 'A reasonable interpretation derived from evidence — not stated outright',
  },
  unverified: {
    label: 'Unverified',
    cls: 'text-[#B08A3E]',
    bg: '#F7F1E4',
    title: 'Contexta could not verify this from the available sources',
  },
};

export function StatusBadge({ status, className = '' }: { status?: VerificationStatus; className?: string }) {
  if (!status) return null;
  const meta = STATUS_META[status];
  return (
    <span
      className={`text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-[3px] rounded-full whitespace-nowrap ${meta.cls} ${className}`}
      style={{ background: meta.bg }}
      title={meta.title}
    >
      {meta.label}
    </span>
  );
}

/* ---------------- Source quality tags ---------------- */

export function qualityLabel(source: Source): { label: string; cls: string; bg: string } {
  if (!source.retrieved) {
    return { label: 'Unverified', cls: 'text-[#A5554C]', bg: '#F6ECEA' };
  }
  if (source.quality === 'official' || (source.kind === 'official' && source.quality !== 'third_party')) {
    return { label: 'Official', cls: 'text-[#5E7D5A]', bg: '#EFF3EC' };
  }
  if (source.quality === 'project' || source.kind === 'project') {
    return { label: 'Project', cls: 'text-[#6F5B91]', bg: '#F3EFFA' };
  }
  return { label: 'Third-party', cls: 'text-[#B08A3E]', bg: '#F7F1E4' };
}

export function QualityTag({ source }: { source: Source }) {
  const q = qualityLabel(source);
  return (
    <span
      className={`text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-[3px] rounded-full whitespace-nowrap ${q.cls}`}
      style={{ background: q.bg }}
    >
      {q.label}
    </span>
  );
}

/* ---------------- Evidence type labels ---------------- */

const TYPE_LABEL: Record<EvidenceType, string> = {
  explicit_requirement: 'Requirement',
  explicit_benefit: 'Benefit',
  eligibility: 'Eligibility',
  application_material: 'Application material',
  deadline: 'Deadline',
  selection_criterion: 'Selection criterion',
  organizer_priority: 'Organizer priority',
  organizer_content: 'Organizer content',
  project_evidence: 'Project evidence',
  inference: 'Inference',
  unknown: 'Context',
};

export function EvidenceTypeLabel({ type }: { type?: EvidenceType }) {
  if (!type) return null;
  return (
    <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#6F5B91] font-medium">
      {TYPE_LABEL[type]}
    </span>
  );
}

export function typeLabel(type?: EvidenceType): string {
  return type ? TYPE_LABEL[type] : 'Context';
}

/* ---------------- Evidence card ---------------- */

/**
 * The evidence card: finding → exact quote → source → why it matters.
 * Used for both opportunity evidence and project (repository) evidence.
 */
export function EvidenceCard({
  evidence,
  source,
  relationship,
}: {
  evidence: EvidenceItem;
  source?: Source;
  relationship?: string;
}) {
  return (
    <div className="border border-[rgba(25,24,23,0.1)] rounded-[10px] bg-[#FBF9F2] px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <EvidenceTypeLabel type={evidence.type} />
        <StatusBadge status={evidence.status} />
        <span className="ml-auto text-[11px] text-[#A6A099]">Confidence: {evidence.confidence}</span>
      </div>

      <p className="mt-3 text-[14px] font-medium leading-snug text-[#191817]">{evidence.claim}</p>

      <blockquote className="mt-3 border-l-2 border-[#B7A7D9] pl-4 font-serif-display text-[15.5px] leading-[1.55] text-[#33302c]">
        “{evidence.quote}”
      </blockquote>

      {source && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#77736C] hover:text-[#191817] transition-colors"
        >
          <span className="tabular-nums">[{String(source.index).padStart(2, '0')}]</span> {source.domain} — {source.title}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}

      {relationship && (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#77736C]">
          <span className="text-[#191817] font-medium">Why this supports the finding. </span>
          {relationship}
        </p>
      )}
    </div>
  );
}

/** Project (repository) evidence card: claim → file → excerpt → why. */
export function ProjectEvidenceCard({ item }: { item: import('@/lib/types').ProjectEvidence }) {
  return (
    <div className="border border-[rgba(25,24,23,0.1)] rounded-[10px] bg-[#FBF9F2] px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#6F5B91] font-medium">
          Project evidence
        </span>
        <span className="text-[11px] font-mono text-[#77736C] bg-[rgba(25,24,23,0.05)] px-1.5 py-0.5 rounded">
          {item.repository} · {item.file}
        </span>
      </div>
      <p className="mt-3 text-[14px] font-medium leading-snug text-[#191817]">{item.claim}</p>
      <blockquote className="mt-3 border-l-2 border-[#B7A7D9] pl-4 font-serif-display text-[15.5px] leading-[1.55] text-[#33302c]">
        “{item.excerpt}”
      </blockquote>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#77736C]">
        <span className="text-[#191817] font-medium">Why it matters. </span>
        {item.whyItMatters}
      </p>
    </div>
  );
}

/** Compact single-evidence row for trails (numbered steps). */
export function evidenceRows(evidenceIds: string[], evidence: EvidenceItem[]): EvidenceItem[] {
  return evidenceIds.map((id) => evidence.find((e) => e.id === id)).filter(Boolean) as EvidenceItem[];
}
