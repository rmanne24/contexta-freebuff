'use client';

import { ExternalLink } from 'lucide-react';
import type { Source } from '@/lib/types';
import { Eyebrow, ExternalLinkIcon, Sheet } from '@/components/ui';

const KIND_LABEL: Record<Source['kind'], string> = {
  official: 'Official',
  community: 'Community',
  news: 'News',
  reference: 'Reference',
  project: 'Your project',
};

export function SourceList({ sources, onSelect }: { sources: Source[]; onSelect: (s: Source) => void }) {
  if (sources.length === 0) return null;
  const ok = sources.filter((s) => s.retrieved);
  const failed = sources.filter((s) => !s.retrieved);

  return (
    <section aria-labelledby="sources-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="sources-heading" className="eyebrow">
          What we found
        </h2>
        <span className="text-[12px] text-[#A6A099] tabular-nums">
          {ok.length} source{ok.length === 1 ? '' : 's'} · live
        </span>
      </div>

      <div className="mt-5 border-t border-[rgba(25,24,23,0.1)]">
        {sources.map((s) => (
          <SourceRow key={s.id} source={s} onSelect={onSelect} />
        ))}
      </div>

      {failed.length > 0 && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-[#A6A099]">
          {failed.length} source{failed.length === 1 ? ' was' : 's were'} unreachable and excluded from the analysis.
          The research above uses only what was retrieved.
        </p>
      )}
    </section>
  );
}

function SourceRow({ source, onSelect }: { source: Source; onSelect: (s: Source) => void }) {
  const num = String(source.index).padStart(2, '0');
  return (
    <article>
      <button
        onClick={() => onSelect(source)}
        aria-haspopup="dialog"
        className="row-link group grid w-full grid-cols-[36px_1fr_auto] gap-4 py-5 border-b border-[rgba(25,24,23,0.1)] text-left items-baseline cursor-pointer"
      >
        <span className="text-[12px] tabular-nums text-[#A6A099] group-hover:text-[#6F5B91] transition-colors">[{num}]</span>
        <span className="min-w-0">
          <span className="block text-[14.5px] font-medium leading-snug truncate">{source.title}</span>
          <span className="mt-1 block text-[13px] leading-relaxed text-[#77736C] line-clamp-2">{source.why}</span>
        </span>
        <span className="flex items-center gap-3 text-[11.5px] text-[#A6A099] whitespace-nowrap">
          {source.retrieved ? (
            <span>{source.wordCount.toLocaleString()} words</span>
          ) : (
            <span className="text-[#A5554C]">unreachable</span>
          )}
          <span className="hidden sm:inline">{KIND_LABEL[source.kind]}</span>
        </span>
      </button>
    </article>
  );
}

export function SourceSheetBody({ source }: { source: Source }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Eyebrow accent>{KIND_LABEL[source.kind]}</Eyebrow>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="btn-text text-[12px] ml-auto"
        >
          {source.domain} <ExternalLinkIcon />
        </a>
      </div>

      {source.retrieved ? (
        <>
          <p className="mt-6 text-[13px] leading-relaxed text-[#77736C]">
            <span className="text-[#191817] font-medium">Why this source matters. </span>
            {source.why}
          </p>
          <div className="mt-7 border-l-2 border-[#B7A7D9] pl-5 py-1">
            <p className="font-serif-display text-[19px] leading-[1.5] text-[#33302c]">
              {source.excerpt}
            </p>
          </div>
          <dl className="mt-8 space-y-2.5 text-[13px]">
            <div className="flex justify-between gap-6">
              <dt className="text-[#77736C]">Retrieved</dt>
              <dd className="tabular-nums">{new Date(source.fetchedAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-[#77736C]">Read</dt>
              <dd className="tabular-nums">{source.wordCount.toLocaleString()} words</dd>
            </div>
          </dl>
          <a href={source.url} target="_blank" rel="noreferrer" className="btn btn-ghost mt-8 w-full">
            Open source <ExternalLink size={14} strokeWidth={1.8} />
          </a>
        </>
      ) : (
        <div className="mt-6 rounded-[10px] border border-[rgba(25,24,23,0.12)] bg-[#F6ECEA] px-5 py-4">
          <p className="text-[13px] font-medium text-[#A5554C]">This source could not be retrieved.</p>
          <p className="mt-1.5 text-[13px] text-[#77736C] leading-relaxed">
            {source.error || 'The page did not respond.'} The rest of the research is unaffected.
          </p>
        </div>
      )}
    </div>
  );
}

export { Sheet };
