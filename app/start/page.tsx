'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Wordmark, Eyebrow, Spinner } from '@/components/ui';
import { AccountMenu } from '@/components/AuthHeaderBits';

interface StartState {
  step: 1 | 2 | 3;
  projectDescription: string;
  projectName: string;
  repoUrl: string;
  opportunityUrl: string;
  opportunityDescription: string;
  goal: string;
}

const EXAMPLE_PROJECT =
  'I’m building an AI research assistant that helps students find and apply to opportunities.';

export default function StartPage() {
  const router = useRouter();
  const [s, setS] = useState<StartState>({
    step: 1,
    projectDescription: '',
    projectName: '',
    repoUrl: '',
    opportunityUrl: '',
    opportunityDescription: '',
    goal: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Personalization: prefill the project from the user's most recent workflow.
  useEffect(() => {
    if (prefilled) return;
    setPrefilled(true);
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { user?: { lastProjectId?: string } | null }) => {
        const last = d.user?.lastProjectId;
        if (!last) return;
        return fetch(`/api/workflows/${last}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((w: { project?: { name?: string; description?: string; repoUrl?: string } } | null) => {
            if (!w?.project) return;
            setS((p) => ({
              ...p,
              projectName: w.project?.name || p.projectName,
              projectDescription: w.project?.description || p.projectDescription,
              repoUrl: w.project?.repoUrl || p.repoUrl,
            }));
          });
      })
      .catch(() => undefined);
  }, [prefilled]);

  const set = <K extends keyof StartState>(k: K, v: StartState[K]) => setS((p) => ({ ...p, [k]: v }));

  function continueFromOpportunity() {
    const url = s.opportunityUrl.trim();
    const desc = s.opportunityDescription.trim();
    if (!url && !desc) {
      setError('Add an opportunity link or a short description.');
      return;
    }
    if (url && !/^https?:\/\/.+\..+/.test(url)) {
      setError('That doesn’t look like a link — paste a full URL (https://…), or describe the opportunity instead.');
      return;
    }
    setError(null);
    set('step', 3);
  }

  async function launch() {
    setError(null);
    if (!s.projectDescription.trim()) {
      setError('Tell Contexta a sentence about your project first.');
      return;
    }
    if (!s.opportunityUrl.trim() && !s.opportunityDescription.trim()) {
      setError('Add an opportunity link or a short description.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            name: s.projectName || s.projectDescription.slice(0, 48),
            description: s.projectDescription,
            repoUrl: s.repoUrl || undefined,
          },
          opportunity: {
            url: s.opportunityUrl || undefined,
            description: s.opportunityDescription,
            goal: s.goal || undefined,
            title: s.opportunityDescription.slice(0, 60) || s.opportunityUrl,
          },
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || 'Could not start Contexta.');
      router.push(`/workspace/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Contexta.');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-[720px] px-6 flex-1 flex flex-col">
        <header className="flex items-center justify-between py-6">
          <button
            onClick={() => (s.step === 1 ? router.push('/') : set('step', (s.step - 1) as 1 | 2))}
            className="inline-flex items-center gap-2 text-[13px] text-[#77736C] hover:text-[#191817] transition-colors"
          >
            <ArrowLeft size={15} strokeWidth={1.8} /> Back
          </button>
          <Wordmark className="!text-[16px] opacity-80" />
          <span className="text-[12px] tabular-nums text-[#A6A099]" aria-live="polite">
            {String(s.step).padStart(2, '0')} / 03
          </span>
          <AccountMenu />
        </header>

        <div className="flex-1 flex flex-col justify-center py-12">
          {s.step === 1 && (
            <section aria-labelledby="q1">
              <Eyebrow accent>Your project</Eyebrow>
              <h1 id="q1" className="font-serif-display mt-5 text-[36px] sm:text-[48px] leading-[1.06]">
                What are you working on?
              </h1>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[#77736C] max-w-[520px]">
                One honest paragraph is enough. Contexta reads it to understand what you’re building.
              </p>
              <textarea
                className="input mt-8"
                rows={5}
                placeholder="Tell Contexta about your project…"
                aria-label="Project description"
                value={s.projectDescription}
                onChange={(e) => set('projectDescription', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) set('step', 2);
                }}
              />
              <div className="mt-4 flex items-center justify-between">
                <button
                  className="btn-text text-[13px] opacity-70 hover:opacity-100"
                  onClick={() => {
                    set('projectDescription', EXAMPLE_PROJECT);
                    set('projectName', 'AI opportunity research assistant');
                  }}
                >
                  Use an example
                </button>
                <button className="btn btn-primary" onClick={() => set('step', 2)} disabled={!s.projectDescription.trim()}>
                  Continue <ArrowRight size={15} strokeWidth={1.8} />
                </button>
              </div>
            </section>
          )}

          {s.step === 2 && (
            <section aria-labelledby="q2">
              <Eyebrow accent>The opportunity</Eyebrow>
              <h1 id="q2" className="font-serif-display mt-5 text-[36px] sm:text-[48px] leading-[1.06]">
                What opportunity are you pursuing?
              </h1>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[#77736C] max-w-[520px]">
                Paste the link if you have it — Contexta reads the real page and follows its trail.
                Otherwise, describe it.
              </p>

              <label htmlFor="opp-url" className="eyebrow block mt-9 mb-2">
                Opportunity link
              </label>
              <input
                id="opp-url"
                className="input"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={s.opportunityUrl}
                onChange={(e) => set('opportunityUrl', e.target.value)}
              />

              <label htmlFor="opp-desc" className="eyebrow block mt-7 mb-2">
                Or describe it
              </label>
              <textarea
                id="opp-desc"
                className="input"
                rows={3}
                placeholder="e.g. The Build Fast with AI 2026 hackathon — PS-01, autonomous agents…"
                value={s.opportunityDescription}
                onChange={(e) => set('opportunityDescription', e.target.value)}
              />

              <label htmlFor="goal" className="eyebrow block mt-7 mb-2">
                What does success look like? <span className="normal-case tracking-normal text-[#A6A099]">(optional)</span>
              </label>
              <input
                id="goal"
                className="input"
                type="text"
                placeholder="e.g. A submission that scores on reliability and demo"
                value={s.goal}
                onChange={(e) => set('goal', e.target.value)}
              />

              <div className="mt-9 flex items-center justify-between">
                <button className="btn-text text-[13px]" onClick={() => set('step', 1)}>
                  <ArrowLeft size={14} strokeWidth={1.8} /> Project
                </button>
                <button className="btn btn-primary" onClick={continueFromOpportunity} disabled={!s.opportunityUrl.trim() && !s.opportunityDescription.trim()}>
                  Continue <ArrowRight size={15} strokeWidth={1.8} />
                </button>
              </div>
            </section>
          )}

          {s.step === 3 && (
            <section aria-labelledby="q3">
              <Eyebrow accent>Where the work lives</Eyebrow>
              <h1 id="q3" className="font-serif-display mt-5 text-[36px] sm:text-[48px] leading-[1.06]">
                Where does your project live?
              </h1>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[#77736C] max-w-[520px]">
                Add your GitHub repository so Contexta can weigh real project evidence — and,
                with your approval, open an issue there later.
              </p>

              <label htmlFor="repo" className="eyebrow block mt-9 mb-2">
                Repository URL <span className="normal-case tracking-normal text-[#A6A099]">(optional)</span>
              </label>
              <input
                id="repo"
                className="input"
                type="url"
                inputMode="url"
                placeholder="https://github.com/you/your-project"
                value={s.repoUrl}
                onChange={(e) => set('repoUrl', e.target.value)}
              />

              <div className="mt-10 rounded-[10px] border border-[rgba(25,24,23,0.12)] bg-[#F3EFFA]/60 px-6 py-5">
                <Eyebrow accent>Before you continue</Eyebrow>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#77736C]">
                  Contexta will fetch the live pages behind this opportunity and quote them.
                  If you later approve an action, it will ask again before anything changes
                  outside this window.
                </p>
              </div>

              <div className="mt-9 flex items-center justify-between">
                <button className="btn-text text-[13px]" onClick={() => set('step', 2)}>
                  <ArrowLeft size={14} strokeWidth={1.8} /> Opportunity
                </button>
                <button className="btn btn-accent" onClick={launch} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner /> Starting research…
                    </>
                  ) : (
                    <>
                      Begin research <ArrowRight size={15} strokeWidth={1.8} />
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {error && (
            <p role="alert" className="mt-6 text-[13px] text-[#A5554C]">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
