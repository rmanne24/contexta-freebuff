'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Wordmark, Eyebrow } from '@/components/ui';
import { useMe } from '@/components/AuthHeaderBits';

const ERRORS: Record<string, string> = {
  google_not_configured:
    'Google sign-in isn’t configured on this server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.',
  state_mismatch: 'The sign-in attempt expired or was tampered with. Please try again.',
  missing_code: 'Google didn’t return an authorization code. Please try again.',
  no_email: 'Your Google account didn’t share an email address, which Contexta needs.',
  oauth_failed: 'Google sign-in failed. Please try again.',
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.6z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1L1.3 17.2C3.3 21.2 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.3c-.3-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.3 6.8C.5 8.4 0 10.1 0 12s.5 3.6 1.3 5.2l3.9-2.9z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.3 2.8 1.3 6.8l3.9 2.9c.9-3 3.6-5 6.8-5z" />
    </svg>
  );
}

function SignInInner() {
  const params = useSearchParams();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const { me } = useMe();
  const err = params.get('error');

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.googleConfigured)))
      .catch(() => setConfigured(false));
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-[480px] px-6 flex-1 flex flex-col">
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#77736C] hover:text-[#191817] transition-colors">
            <ArrowLeft size={15} strokeWidth={1.8} /> Home
          </Link>
          <Wordmark className="!text-[16px] opacity-80" />
          <span className="w-10" aria-hidden="true" />
        </header>

        <div className="flex-1 flex flex-col justify-center py-16">
          <Eyebrow accent>Welcome</Eyebrow>
          <h1 className="font-serif-display mt-5 text-[40px] sm:text-[48px] leading-[1.05]">
            Your workspace,
            <br />
            <em className="font-serif-display">kept yours.</em>
          </h1>
          <p className="mt-5 text-[14.5px] leading-[1.75] text-[#77736C]">
            Sign in to keep your research trails, evidence, and approved actions
            under your account — and to connect your own API keys for actions.
          </p>

          {err && ERRORS[err] && (
            <div role="alert" className="mt-7 rounded-[10px] border border-[rgba(25,24,23,0.12)] bg-[#F6ECEA] px-5 py-4">
              <p className="text-[13px] leading-relaxed text-[#A5554C]">{ERRORS[err]}</p>
            </div>
          )}

          <div className="mt-9">
            {configured === false ? (
              <div className="rounded-[10px] border border-[rgba(25,24,23,0.12)] bg-[#FBF9F2] px-5 py-4">
                <p className="text-[13px] font-medium">Google sign-in not configured</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#77736C]">
                  The server is missing <code className="text-[12px] bg-[rgba(25,24,23,0.05)] px-1.5 py-0.5 rounded">GOOGLE_CLIENT_ID</code> /{' '}
                  <code className="text-[12px] bg-[rgba(25,24,23,0.05)] px-1.5 py-0.5 rounded">GOOGLE_CLIENT_SECRET</code>. See the README for
                  the 2-minute setup.
                </p>
              </div>
            ) : (
              <a href="/api/auth/google" className="btn btn-ghost w-full !py-3">
                <GoogleIcon /> Continue with Google
              </a>
            )}
          </div>

          <p className="mt-6 text-[12px] leading-relaxed text-[#A6A099]">
            By continuing you agree that Contexta may fetch the pages behind opportunities you add,
            and will ask before acting anywhere else.
          </p>

          {me?.user && (
            <p className="mt-8 text-[13px] text-[#5E7D5A]">
              You’re already signed in as {me.user.email} — <Link href="/home" className="btn-text">go to your workspace</Link>.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
