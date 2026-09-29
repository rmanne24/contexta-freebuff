'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Wordmark, Eyebrow, Spinner } from '@/components/ui';
import { useMe } from '@/components/AuthHeaderBits';

interface Keys {
  [name: string]: { preview: string; updatedAt: string };
}

interface Me {
  user: null | { email: string; name: string; picture?: string; lastProjectId?: string; keys?: Keys };
  googleConfigured: boolean;
}

const KEY_FIELDS: Array<{ name: string; label: string; hint: string; placeholder: string; url?: string }> = [
  {
    name: 'github',
    label: 'GitHub',
    hint: 'Lets Contexta open issues in your repositories when you approve an action.',
    placeholder: 'ghp_… or github_pat_…',
    url: 'https://github.com/settings/tokens',
  },
  {
    name: 'openai',
    label: 'OpenAI',
    hint: 'Reserved for LLM-powered synthesis in the analysis pipeline.',
    placeholder: 'sk-…',
    url: 'https://platform.openai.com/api-keys',
  },
  {
    name: 'anthropic',
    label: 'Anthropic',
    hint: 'Reserved for LLM-powered synthesis in the analysis pipeline.',
    placeholder: 'sk-ant-…',
    url: 'https://console.anthropic.com/settings/keys',
  },
  {
    name: 'gemini',
    label: 'Google AI (Gemini)',
    hint: 'Reserved for LLM-powered synthesis in the analysis pipeline.',
    placeholder: 'AIza…',
    url: 'https://aistudio.google.com/app/apikey',
  },
  {
    name: 'serp',
    label: 'SerpAPI',
    hint: 'Adds web-search discovery for opportunities without a link.',
    placeholder: '…',
    url: 'https://serpapi.com/manage-api-key',
  },
];

export default function SettingsPage() {
  const { me, loading, refresh } = useMe();
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(null), 2200);
    return () => clearTimeout(t);
  }, [savedFlash]);

  async function saveKey(name: string) {
    const key = drafts[name]?.trim();
    if (!key) return;
    setSaving(name);
    setError(null);
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'set_key', name, key }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(d.error || 'Could not save the key.');
      setDrafts((p) => ({ ...p, [name]: '' }));
      setSavedFlash(name);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the key.');
    } finally {
      setSaving(null);
    }
  }

  async function deleteKey(name: string) {
    setSaving(name);
    setError(null);
    try {
      await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'delete_key', name }),
      });
      refresh();
    } finally {
      setSaving(null);
    }
  }

  const keys: Keys = me?.user?.keys ?? {};

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[680px] px-6 pb-24">
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#77736C] hover:text-[#191817] transition-colors">
            <ArrowLeft size={15} strokeWidth={1.8} /> Home
          </Link>
          <Wordmark className="!text-[16px] opacity-80" />
          <span className="w-10" aria-hidden="true" />
        </header>

        <Eyebrow accent>Settings</Eyebrow>
        <h1 className="font-serif-display mt-4 text-[40px] sm:text-[48px] leading-[1.05]">Account & keys.</h1>

        {loading ? (
          <p className="mt-10 text-[13.5px] text-[#77736C] flex items-center gap-2.5"><Spinner /> Loading…</p>
        ) : !me?.user ? (
          <div className="mt-10 paper px-7 py-8">
            <h2 className="font-serif-display text-[24px]">You’re not signed in.</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-[#77736C]">
              Sign in with Google to keep your research and API keys under your account.
            </p>
            <Link href="/signin" className="btn btn-primary mt-6">Sign in</Link>
          </div>
        ) : (
          <>
            {/* Profile */}
            <section aria-labelledby="profile-h" className="mt-12">
              <h2 id="profile-h" className="eyebrow">Profile</h2>
              <div className="mt-5 border-t border-[rgba(25,24,23,0.1)]">
                <div className="grid grid-cols-[140px_1fr] gap-4 py-4 border-b border-[rgba(25,24,23,0.1)] text-[14px]">
                  <span className="text-[#77736C]">Name</span>
                  <span className="font-medium">{me.user.name}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4 py-4 border-b border-[rgba(25,24,23,0.1)] text-[14px]">
                  <span className="text-[#77736C]">Email</span>
                  <span className="font-medium">{me.user.email}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4 py-4 border-b border-[rgba(25,24,23,0.1)] text-[14px]">
                  <span className="text-[#77736C]">Sign-in</span>
                  <span className="font-medium">Google {me.googleConfigured ? '· connected' : ''}</span>
                </div>
              </div>
              <a href="/api/auth/signout" className="btn btn-ghost mt-6 !py-2 !px-4 text-[13px]">Sign out</a>
            </section>

            {/* API keys */}
            <section aria-labelledby="keys-h" className="mt-16">
              <h2 id="keys-h" className="eyebrow">API keys</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[#77736C] max-w-[560px]">
                Keys are encrypted at rest on the server and never shown in full again —
                only to Contexta itself when an approved action needs them.
              </p>

              {error && (
                <p role="alert" className="mt-4 text-[13px] text-[#A5554C]">{error}</p>
              )}

              <div className="mt-6 border-t border-[rgba(25,24,23,0.1)]">
                {KEY_FIELDS.map((f) => {
                  const saved = keys[f.name];
                  return (
                    <div key={f.name} className="py-6 border-b border-[rgba(25,24,23,0.1)]">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-[15px] font-medium">{f.label}</h3>
                        {saved && (
                          <span className="text-[12px] text-[#5E7D5A] flex items-center gap-1.5">
                            <Check size={13} strokeWidth={2} /> Connected {saved.preview}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#77736C]">
                        {f.hint}{' '}
                        {f.url && (
                          <a href={f.url} target="_blank" rel="noreferrer" className="btn-text !text-[12.5px]">
                            Get a key
                          </a>
                        )}
                      </p>
                      <div className="mt-4 flex gap-2.5">
                        <div className="relative flex-1">
                          <input
                            type={show[f.name] ? 'text' : 'password'}
                            className="input !py-2.5 pr-10"
                            placeholder={saved ? 'Replace key…' : f.placeholder}
                            aria-label={`${f.label} API key`}
                            value={drafts[f.name] ?? ''}
                            onChange={(e) => setDrafts((p) => ({ ...p, [f.name]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && saveKey(f.name)}
                          />
                          <button
                            type="button"
                            onClick={() => setShow((p) => ({ ...p, [f.name]: !p[f.name] }))}
                            aria-label={show[f.name] ? 'Hide key' : 'Show key'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A6A099] hover:text-[#191817] transition-colors"
                          >
                            {show[f.name] ? <EyeOff size={15} strokeWidth={1.6} /> : <Eye size={15} strokeWidth={1.6} />}
                          </button>
                        </div>
                        <button className="btn btn-primary !py-2.5" onClick={() => saveKey(f.name)} disabled={saving === f.name || !drafts[f.name]?.trim()}>
                          {saving === f.name ? <Spinner /> : saved ? 'Replace' : 'Save'}
                        </button>
                        {saved && (
                          <button
                            className="btn btn-ghost !py-2.5 !px-3"
                            onClick={() => deleteKey(f.name)}
                            aria-label={`Remove ${f.label} key`}
                            title="Remove key"
                          >
                            <Trash2 size={15} strokeWidth={1.6} />
                          </button>
                        )}
                      </div>
                      {savedFlash === f.name && (
                        <p className="mt-2.5 text-[12.5px] text-[#5E7D5A]" aria-live="polite">Saved — encrypted at rest.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
