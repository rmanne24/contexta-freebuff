'use client';

import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import type { WorkflowState } from '@/lib/types';
import { Eyebrow, Spinner, ExternalLinkIcon } from '@/components/ui';

/* ---------------- Approval ---------------- */

export function ApprovalPanel({
  w,
  onApprove,
  onReject,
  busy,
}: {
  w: WorkflowState;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  if (!w.action) return null;
  return (
    <section aria-labelledby="approve-heading" className="rise">
      <div className="rounded-[12px] border border-[rgba(25,24,23,0.16)] bg-[#FFFFFF] px-7 py-7 sm:px-9" style={{ boxShadow: '0 1px 2px rgba(25,24,23,0.05), 0 18px 50px -24px rgba(25,24,23,0.2)' }}>
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#6F5B91] breathe" aria-hidden="true" />
          <Eyebrow accent>Ready to act</Eyebrow>
        </div>
        <h2 id="approve-heading" className="font-serif-display mt-4 text-[26px] sm:text-[30px] leading-[1.1]">
          {w.action.kind === 'create_github_issue' ? 'Create GitHub issue' : 'Proposed action'}
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#77736C] max-w-[560px]">
          This action changes something outside Contexta. Nothing happens until you approve it.
        </p>

        <dl className="mt-7 space-y-4 text-[13.5px]">
          <div className="grid grid-cols-[110px_1fr] gap-4 border-t border-[rgba(25,24,23,0.08)] pt-4">
            <dt className="eyebrow !text-[10px] pt-0.5">Repository</dt>
            <dd className="font-medium">{w.action.repository}</dd>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-4 border-t border-[rgba(25,24,23,0.08)] pt-4">
            <dt className="eyebrow !text-[10px] pt-0.5">Title</dt>
            <dd className="font-medium">{w.action.title}</dd>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-4 border-t border-b border-[rgba(25,24,23,0.08)] pt-4 pb-5">
            <dt className="eyebrow !text-[10px] pt-0.5">Body</dt>
            <dd>
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#33302c]">{w.action.body}</pre>
            </dd>
          </div>
        </dl>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button className="btn btn-accent" onClick={onApprove} disabled={busy}>
            {busy ? <><Spinner /> Approving…</> : <>Approve & execute <span aria-hidden="true">→</span></>}
          </button>
          <button className="btn btn-ghost" onClick={onReject} disabled={busy}>
            Reject
          </button>
          <span className="text-[12px] text-[#A6A099] ml-1">Human approval required</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Execution timeline ---------------- */

export function ExecutionTimeline({ w, onRetry }: { w: WorkflowState; onRetry?: () => void }) {
  if (!w.execution) return null;
  const failed = w.state === 'FAILED';
  return (
    <section aria-label="Execution progress" aria-live="polite" className="rise">
      <div className="rounded-[12px] border border-[rgba(25,24,23,0.16)] bg-[#FFFFFF] px-7 py-7 sm:px-9">
        <Eyebrow accent>{failed ? 'Action failed' : w.state === 'VERIFIED' ? 'Action executed' : 'Executing'}</Eyebrow>
        <h2 className="font-serif-display mt-4 text-[26px] leading-[1.1]">{w.action?.kind === 'create_github_issue' ? 'Create GitHub issue' : 'Action'}</h2>

        <ol className="mt-8 max-w-[440px]">
          {w.execution.steps.map((s) => (
            <li key={s.index} className="relative flex gap-4 pb-6 last:pb-0">
              {/* connector */}
              {s.index < w.execution!.steps.length && (
                <span
                  className="absolute left-[7px] top-[18px] bottom-0 w-px bg-[rgba(25,24,23,0.12)]"
                  aria-hidden="true"
                />
              )}
              <span className="relative mt-[3px] flex h-[15px] w-[15px] shrink-0 items-center justify-center">
                {s.status === 'done' ? (
                  <CheckCircle2 size={16} strokeWidth={1.6} className="text-[#5E7D5A]" />
                ) : s.status === 'active' ? (
                  <span className="h-[9px] w-[9px] rounded-full bg-[#6F5B91] breathe" />
                ) : s.status === 'failed' ? (
                  <XCircle size={16} strokeWidth={1.6} className="text-[#A5554C]" />
                ) : (
                  <span className="h-[9px] w-[9px] rounded-full border border-[rgba(25,24,23,0.25)]" />
                )}
              </span>
              <div className="min-w-0">
                <p className={`text-[14px] ${s.status === 'pending' ? 'text-[#A6A099]' : 'text-[#191817] font-medium'}`}>
                  {String(s.index).padStart(2, '0')} — {s.label}
                </p>
                {s.detail && <p className="mt-0.5 text-[12.5px] text-[#77736C]">{s.detail}</p>}
              </div>
            </li>
          ))}
        </ol>

        {failed && w.error && (
          <div className="mt-6 rounded-[10px] border border-[rgba(25,24,23,0.12)] bg-[#F6ECEA] px-5 py-4">
            <p className="text-[13px] font-medium text-[#A5554C]">The action was not completed.</p>
            <p className="mt-1.5 text-[13px] text-[#77736C] leading-relaxed">{w.error.message}</p>
            <p className="mt-1.5 text-[12.5px] text-[#A6A099]">Nothing was changed outside Contexta.</p>
            {onRetry && (
              <button className="btn btn-ghost mt-4 !py-2 !px-4 text-[13px]" onClick={onRetry}>
                Retry action
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Verification receipt ---------------- */

export function VerificationReceipt({ w }: { w: WorkflowState }) {
  if (!w.execution?.verified) return null;
  const ex = w.execution;
  const hash = ex.integrityHash;
  return (
    <section aria-labelledby="receipt-heading" className="rise">
      <div className="rounded-[12px] border border-[rgba(25,24,23,0.16)] bg-[#FFFFFF] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(25,24,23,0.05), 0 18px 50px -24px rgba(25,24,23,0.2)' }}>
        <div className="px-7 py-6 sm:px-9 border-b border-dashed border-[rgba(25,24,23,0.2)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} strokeWidth={1.6} className="text-[#5E7D5A]" aria-hidden="true" />
              <Eyebrow accent>Verification receipt</Eyebrow>
            </div>
            <span className="text-[11px] uppercase tracking-[0.14em] font-medium text-[#5E7D5A] bg-[#EFF3EC] px-2.5 py-1 rounded-full">
              Verified
            </span>
          </div>
        </div>

        <dl className="px-7 py-2 sm:px-9 text-[13.5px]">
          {[
            ['Action', w.action?.kind === 'create_github_issue' ? 'Create GitHub issue' : 'External action'],
            ['Result', 'VERIFIED — re-fetched from the source to confirm'],
            ['Timestamp', new Date(ex.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })],
            ['External reference', ex.reference || '—'],
            ['Integrity hash', hash ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : '—'],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[130px_1fr] sm:grid-cols-[150px_1fr] gap-4 py-3.5 border-b border-[rgba(25,24,23,0.07)] last:border-0">
              <dt className="text-[#77736C]">{k}</dt>
              <dd className="font-medium break-all">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="px-7 py-6 sm:px-9 border-t border-[rgba(25,24,23,0.08)] bg-[#FBF9F2]">
          <p className="text-[12.5px] leading-relaxed text-[#A6A099]">
            {ex.detail}
          </p>
          {ex.url && (
            <a href={ex.url} target="_blank" rel="noreferrer" className="btn btn-ghost mt-5">
              View on GitHub <ExternalLink size={14} strokeWidth={1.8} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
