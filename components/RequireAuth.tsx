'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eyebrow, Spinner } from '@/components/ui';
import { useMe } from '@/components/AuthHeaderBits';

/**
 * Client-side gate for private pages: shows a loading state while the
 * session is being checked, and redirects to sign-in when unauthenticated.
 *
 * Defense in depth only — the proxy gate and the API routes are the real
 * security boundary; this just keeps the private pages from flashing before
 * the redirect.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me?.user) {
      router.replace('/signin');
    }
  }, [loading, me, router]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-[13.5px] text-[#77736C]">
          <Spinner /> Checking your session…
        </div>
      </main>
    );
  }

  if (!me?.user) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-center max-w-[420px] px-6">
          <Eyebrow accent>Signed out</Eyebrow>
          <h1 className="font-serif-display mt-5 text-[32px] leading-tight">Your session has ended.</h1>
          <p className="mt-4 text-[14px] text-[#77736C] leading-relaxed">
            Sign in again to continue where you left off.
          </p>
          <Link href="/signin" className="btn btn-primary mt-8">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
