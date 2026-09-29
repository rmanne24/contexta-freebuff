'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Eyebrow, StatusDot } from '@/components/ui';

const PHASE_MESSAGES = [
  'Finding the opportunity’s primary sources…',
  'Reading the pages behind the opportunity…',
  'Cross-checking what matters…',
  'Connecting evidence to your project…',
  'Comparing the opportunity with your work…',
  'Preparing the next move…',
];

export function ResearchProgress({ state }: { state: string }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % PHASE_MESSAGES.length), 2800);
    return () => clearInterval(t);
  }, []);

  const analyzing = state === 'ANALYZING';

  return (
    <div className="rise">
      <Eyebrow accent>{analyzing ? 'Analyzing' : 'Researching'}</Eyebrow>
      <h1 className="font-serif-display mt-5 text-[38px] sm:text-[52px] leading-[1.05]">
        Understanding the opportunity.
      </h1>
      <p className="mt-5 text-[14.5px] text-[#77736C] flex items-center gap-2.5" aria-live="polite">
        <span className="relative inline-block overflow-hidden h-[1.4em]">
          <span key={msgIdx} style={{ animation: 'rise 420ms ease both' }} className="inline-block">
            {PHASE_MESSAGES[msgIdx]}
          </span>
        </span>
      </p>

      <div className="mt-14 max-w-[440px]">
        <ol className="border-t border-[rgba(25,24,23,0.1)]">
          {['Locating primary sources', 'Reading the sources', 'Cross-checking evidence', 'Synthesizing what matters'].map(
            (label, i) => {
              const active = analyzing ? i === 3 : i <= 1;
              const done = analyzing ? i < 3 : i === 0;
              return (
                <li key={label} className="flex items-center gap-4 py-3.5 border-b border-[rgba(25,24,23,0.1)]">
                  {done ? (
                    <Check size={14} strokeWidth={2} className="text-[#5E7D5A]" aria-label="Done" />
                  ) : (
                    <StatusDot tone={active ? 'active' : 'neutral'} pulse={active} />
                  )}
                  <span className={`text-[13.5px] ${active ? 'text-[#191817]' : done ? 'text-[#77736C]' : 'text-[#A6A099]'}`}>
                    {label}
                  </span>
                  {active && <span className="ml-auto text-[11.5px] text-[#6F5B91] breathe">in progress</span>}
                </li>
              );
            }
          )}
        </ol>
      </div>

      <p className="mt-10 text-[12.5px] text-[#A6A099] max-w-[440px] leading-relaxed">
        Contexta is fetching live pages — this takes a few seconds, not a simulation.
      </p>
    </div>
  );
}
