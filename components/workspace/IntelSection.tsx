'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { OpportunityIntel, RequirementCategory, Source } from '@/lib/types';
import { StatusBadge } from './EvidenceBits';
import { EvidenceTrail } from './Analysis';

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
  requirement: 'Verified requirements',
  eligibility: 'Eligibility',
  application_material: 'Application materials',
  selection_criterion: 'Selection / judging criteria',
  deadline: 'Deadlines',
  benefit: 'Benefits',
  organizer_priority: 'Organizer priorities',
};

const CONFIDENCE_META: Record<
  OpportunityIntel['researchConfidence'],
  { label: string; cls: string; bg: string; note: string }
> = {
  high: {
    label: 'High',
    cls: 'text-[#5E7D5A]',
    bg: '#EFF3EC',
    note: 'Multiple official sources confirmed the key facts.',
  },
  medium: {
    label: 'Medium',
    cls: 'text-[#6F5B91]',
    bg: '#F3EFFA',
    note: 'Key facts confirmed, but some questions remain unanswered.',
  },
  low: {
    label: 'Low',
    cls: 'text-[#B08A3E]',
    bg: '#F7F1E4',
    note: 'Few explicit statements were found — treat the findings as context, not confirmed facts.',
  },
};

export function IntelSection({ intel, evidence, sources, hideConfidence = false }: {
  intel?: OpportunityIntel;
  evidence: import('@/lib/types').EvidenceItem[];
  sources: Source[];
  /** Hide the inline confidence pill when the page header already shows it. */
  hideConfidence?: boolean;
}) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  if (!intel) return null;

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: intel.items.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);

  const toggle = (key: string) =>
    setOpenCategories((p) => ({ ...p, [key]: !p[key] }));

  const confidence = CONFIDENCE_META[intel.researchConfidence];

  return (
    <section aria-labelledby="intel-heading">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <h2 id="intel-heading" className="eyebrow">Opportunity intelligence</h2>
        {!hideConfidence && (
          <span className="flex items-center gap-2 text-[11.5px] text-[#77736C]">
            <span className="uppercase tracking-[0.12em] text-[#A6A099]">Research confidence</span>
            <span className={`text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-[3px] rounded-full ${confidence.cls}`} style={{ background: confidence.bg }}>
              {confidence.label}
            </span>
          </span>
        )}
      </div>
      <p className="mt-2 text-[12.5px] text-[#A6A099] max-w-[640px]">{confidence.note}</p>

      {grouped.length > 0 ? (
        <div className="mt-6 border-t border-[rgba(25,24,23,0.1)]">
          {grouped.map(({ category, items }) => (
            <div key={category} className="py-5 border-b border-[rgba(25,24,23,0.1)]">
              <h3 className="text-[11px] uppercase tracking-[0.16em] font-medium text-[#77736C]">
                {CATEGORY_LABEL[category]}
                <span className="ml-2 text-[#A6A099] normal-case tracking-normal">
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </h3>
              <ul className="mt-3 space-y-4">
                {items.map((item) => {
                  const itemKey = `${category}:${item.id}`;
                  const open = openCategories[itemKey] ?? false;
                  return (
                    <li key={item.id}>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                        <StatusBadge status={item.status} />
                        <p className="text-[14.5px] leading-snug text-[#191817] max-w-[640px] flex-1 min-w-[240px]">
                          {item.statement}
                        </p>
                        {item.evidenceIds.length > 0 && (
                          <button
                            onClick={() => toggle(itemKey)}
                            aria-expanded={open}
                            className="btn-text text-[11.5px] uppercase tracking-[0.12em] text-[#6F5B91]"
                          >
                            {open ? 'Hide source' : 'Source'}
                            <ChevronDown
                              size={12}
                              strokeWidth={2}
                              className={`transition-transform duration-200 inline-block ml-1 ${open ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>
                      {open && item.evidenceIds.length > 0 && (
                        <div className="mt-3">
                          <EvidenceTrail
                            evidenceIds={item.evidenceIds}
                            evidence={evidence}
                            sources={sources}
                            startOpen
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {intel.unknowns.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[11px] uppercase tracking-[0.16em] font-medium text-[#B08A3E]">
            Could not verify
          </h3>
          <ul className="mt-3 space-y-1.5">
            {intel.unknowns.map((u, i) => (
              <li key={i} className="text-[13.5px] leading-relaxed text-[#77736C] flex gap-2.5">
                <span className="text-[#B08A3E] shrink-0 mt-[1px]" aria-hidden="true">—</span>
                {u}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-[#A6A099] leading-relaxed max-w-[640px]">
            Contexta reports what its sources state and nothing more. Anything listed here was not found in the
            retrieved pages and should be checked directly with the organizer.
          </p>
        </div>
      )}
    </section>
  );
}
