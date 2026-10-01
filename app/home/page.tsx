'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Wordmark, Eyebrow, Spinner } from '@/components/ui';
import { AccountMenu } from '@/components/AuthHeaderBits';
import RequireAuth from '@/components/RequireAuth';

interface Snapshot {
  id: string;
  updatedAt: string;
  state: string;
  project?: { name: string };
  opportunity?: { title: string };
}

const STATE_LABEL: Record<string, string> = {
  IDLE: 'Idle',
  RESEARCHING: 'Researching',
  RESEARCH_COMPLETE: 'Research complete',
  ANALYZING: 'Analyzing',
  ANALYSIS_COMPLETE: 'Research complete',
  ACTION_PROPOSED: 'Action proposed',
  AWAITING_APPROVAL: 'Awaiting approval',
  EXECUTING: 'Executing',
  VERIFYING: 'Verifying',
  VERIFIED: 'Verified',
  FAILED: 'Interrupted',
  REJECTED: 'Rejected',
};

function HomeInner() {
  const [rows, setRows] = useState<Snapshot[] | null>(null);

  useEffect(() => {
    fetch('/api/workflows', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { workflows?: Snapshot[] }) => setRows(d.workflows ?? []))
      .catch(() => setRows([]));
  }, []);

  const loading = rows === null;
  const empty = rows?.length === 0;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[880px] px-6 pb-24">
        <header className="flex items-center justify-between py-6">
          <Wordmark className="!text-[16px]" />
          <AccountMenu />
        </header>

        <section className="pt-16 pb-14 text-center">
          <Eyebrow accent>Your workspace</Eyebrow>
          <h1 className="font-serif-display mt-5 text-[44px] sm:text-[56px] leading-[1.05]">
            Welcome to Contexta.
          </h1>
          <p className="mx-auto mt-5 max-w-[460px] text-[14.5px] leading-[1.75] text-[#77736C]">
            {empty
              ? 'Add your first opportunity to get started.'
              : 'Pick up where you left off, or add a new opportunity.'}
          </p>
          <div className="mt-9">
            <Link href="/start" className="btn btn-primary">
              {empty ? (
                <>
                  Add your first opportunity <ArrowRight size={15} strokeWidth={1.8} />
                </>
              ) : (
                <>
                  Start a new opportunity <ArrowRight size={15} strokeWidth={1.8} />
                </>
              )}
            </Link>
          </div>
        </section>

        {loading && (
          <p className="text-center text-[13px] text-[#77736C] flex items-center justify-center gap-2.5">
            <Spinner /> Loading your work…
          </p>
        )}

        {rows && rows.length > 0 && (
          <section aria-labelledby="history-h">
            <h2 id="history-h" className="eyebrow">Your opportunities</h2>
            <ul className="mt-5 border-t border-[rgba(25,24,23,0.1)]">
              {rows.map((w) => (
                <li key={w.id} className="border-b border-[rgba(25,24,23,0.1)]">
                  <Link href={`/workspace/${w.id}`} className="group flex items-center justify-between gap-6 py-5">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium truncate">{w.project?.name || 'Untitled project'}</p>
                      <p className="mt-0.5 text-[12.5px] text-[#77736C] truncate">{w.opportunity?.title || ''}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="hidden sm:inline text-[11px] uppercase tracking-[0.14em] text-[#77736C]">
                        {STATE_LABEL[w.state] || w.state}
                      </span>
                      <ArrowUpRight
                        size={15}
                        strokeWidth={1.8}
                        className="text-[#A6A099] group-hover:text-[#191817] transition-colors"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <HomeInner />
    </RequireAuth>
  );
}
