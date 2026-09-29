'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Wordmark, Eyebrow, ExternalLinkIcon } from '@/components/ui';
import { AccountMenu } from '@/components/AuthHeaderBits';

const STEPS = ['Research', 'Evidence', 'Reasoning', 'Action', 'Verification'] as const;

const PREVIEW_PHASES = [
  { label: 'RESEARCHING', detail: 'Build Fast with AI — 2026' },
  { label: 'READING SOURCES', detail: '5 sources found · 3 alignment signals · 2 gaps detected' },
  { label: 'RESEARCH COMPLETE', detail: 'Build Fast with AI — 2026' },
] as const;

export default function LandingPage() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % PREVIEW_PHASES.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1120px] px-6 sm:px-10">
        {/* ---------- Header ---------- */}
        <header className="flex items-center justify-between py-6">
          <Link href="/" aria-label="Contexta home">
            <Wordmark />
          </Link>
          <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-[13px] text-[#77736C]">
            <a href="#product" className="hover:text-[#191817] transition-colors">Product</a>
            <a href="#how" className="hover:text-[#191817] transition-colors">How it works</a>
            <a href="#research" className="hover:text-[#191817] transition-colors">Research</a>
            <a href="#actions" className="hover:text-[#191817] transition-colors">Actions</a>
          </nav>
          <AccountMenu />
        </header>

        {/* ---------- Hero ---------- */}
        <section className="pt-20 pb-24 sm:pt-28 sm:pb-32 text-center" aria-labelledby="hero-heading">
          <Eyebrow accent className="!tracking-[0.24em]">
            AI Opportunity Operating System
          </Eyebrow>
          <h1
            id="hero-heading"
            className="font-serif-display mt-7 text-[44px] leading-[1.05] sm:text-[76px] sm:leading-[1.02]"
          >
            Make every opportunity
            <br />
            <em className="font-serif-display">actionable.</em>
          </h1>
          <p className="mx-auto mt-7 max-w-[520px] text-[15px] leading-[1.75] text-[#77736C]">
            Research the opportunity. Understand the fit. Know what to do next —
            with evidence behind every claim, and nothing executed without your approval.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/start" className="btn btn-primary">
              Start with an opportunity <ArrowRight size={15} strokeWidth={1.8} />
            </Link>
            <a href="#how" className="btn btn-ghost">
              See how Contexta works
            </a>
          </div>
        </section>

        {/* ---------- Product preview ---------- */}
        <section id="product" aria-label="Product preview" className="pb-24">
          <div className="paper mx-auto max-w-[760px] px-8 py-10 sm:px-12">
            <div className="flex items-baseline justify-between gap-6">
              <Eyebrow>{PREVIEW_PHASES[phase].label}</Eyebrow>
              <span className="flex items-center gap-2 text-[12px] text-[#77736C]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#6F5B91] breathe" aria-hidden="true" />
                {PREVIEW_PHASES[phase].detail}
              </span>
            </div>

            <p className="font-serif-display mt-6 text-[26px] sm:text-[30px] leading-snug">
              “Research the AI Build Challenge.”
            </p>

            <div className="mt-8 space-y-0 divide-y divide-[rgba(25,24,23,0.08)] border-t border-[rgba(25,24,23,0.08)]">
              {[
                ['5', 'sources found', 'official site, rules, judging criteria'],
                ['3', 'alignment signals', 'agents, evidence, human approval'],
                ['2', 'gaps detected', 'no public demo, no evaluation'],
              ].map(([n, label, sub], i) => (
                <div
                  key={label}
                  className="flex items-baseline gap-6 py-4"
                  style={{ animation: `rise 500ms ease ${i * 120 + phase * 80}ms both` }}
                >
                  <span className="font-serif-display text-[24px] w-8 text-right tabular-nums text-[#6F5B91]">{n}</span>
                  <div>
                    <p className="text-[14px] font-medium">{label}</p>
                    <p className="text-[12.5px] text-[#77736C] mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-[12.5px] leading-relaxed text-[#A6A099]">
              A preview of the research workspace. Every number above traces to a real source
              once you run Contexta on your own opportunity.
            </p>
          </div>
        </section>

        {/* ---------- How it works: the loop ---------- */}
        <section id="how" aria-labelledby="how-heading" className="py-20 border-t border-[rgba(25,24,23,0.1)]">
          <div className="grid gap-12 md:grid-cols-[1fr_1.6fr] md:gap-20">
            <div>
              <Eyebrow accent>How it works</Eyebrow>
              <h2 id="how-heading" className="font-serif-display mt-5 text-[36px] sm:text-[44px] leading-[1.08]">
                One loop, from question to proof.
              </h2>
              <p className="mt-6 text-[14.5px] leading-[1.75] text-[#77736C] max-w-[380px]">
                Contexta doesn’t stop at advice. It researches the real opportunity,
                shows the evidence, proposes an action — and waits for you to approve it.
              </p>
            </div>
            <ol id="research" className="space-y-0 divide-y divide-[rgba(25,24,23,0.1)] border-t border-[rgba(25,24,23,0.1)]">
              {[
                ['01', 'Research', 'Live sources — the official page, its rules, its criteria — read and quoted, not summarized from memory.'],
                ['02', 'Evidence', 'Each finding links to the exact sentence it came from, with the source one click away.'],
                ['03', 'Reasoning', 'Alignment and gaps are stated in plain language: where you’re strong, what’s missing, and why it matters.'],
                ['04', 'Action', 'A concrete next move — written, reviewable, editable. Contexta never acts without your approval.'],
                ['05', 'Verification', 'The result is re-checked at the source and returned with an integrity hash as your receipt.'],
              ].map(([n, t, d]) => (
                <li key={n} className="grid grid-cols-[44px_120px_1fr] gap-4 py-6 items-baseline">
                  <span className="text-[12px] tabular-nums text-[#A6A099]">{n}</span>
                  <span className="text-[14.5px] font-medium">{t}</span>
                  <span className="text-[13.5px] leading-relaxed text-[#77736C]">{d}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Closing CTA ---------- */}
        <section id="actions" className="py-24 border-t border-[rgba(25,24,23,0.1)] text-center">
          <Eyebrow accent>Begin</Eyebrow>
          <h2 className="font-serif-display mt-6 text-[36px] sm:text-[52px] leading-[1.05] max-w-[640px] mx-auto">
            Don’t just apply.
            <br />
            <em className="font-serif-display">Arrive prepared.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-[440px] text-[14.5px] leading-[1.75] text-[#77736C]">
            Bring an opportunity. Contexta builds the research trail,
            the evidence, and the plan — you approve what happens next.
          </p>
          <div className="mt-10">
            <Link href="/start" className="btn btn-accent">
              Start with an opportunity <ArrowRight size={15} strokeWidth={1.8} />
            </Link>
          </div>
        </section>

        {/* ---------- Footer ---------- */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 py-10 border-t border-[rgba(25,24,23,0.1)] text-[12.5px] text-[#A6A099]">
          <Wordmark className="!text-[15px] opacity-80" />
          <p>Research what matters. Act on what you learn.</p>
          <a
            href="https://github.com/rmanne24/contexta-freebuff"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[#191817] transition-colors"
          >
            Source <ExternalLinkIcon />
          </a>
        </footer>
      </div>
    </main>
  );
}
