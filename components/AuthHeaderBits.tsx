'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Settings, LogOut } from 'lucide-react';

interface Me {
  user: null | { id: string; email: string; name: string; picture?: string; lastProjectId?: string; keys?: Record<string, { preview: string; updatedAt: string }> };
  googleConfigured: boolean;
}

export function useMe(): { me: Me | null; loading: boolean; refresh: () => void } {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: Me) => {
        if (!cancelled) setMe(d);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tick]);
  return { me, loading, refresh: () => setTick((t) => t + 1) };
}

export function AccountMenu() {
  const { me, loading } = useMe();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (loading) return <span className="w-8 h-8 rounded-full bg-[rgba(25,24,23,0.06)] inline-block" aria-hidden="true" />;

  if (!me?.user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/signin" className="inline-flex items-center gap-1.5 text-[13px] text-[#77736C] hover:text-[#191817] transition-colors">
          Continue with Google
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-full pl-1 pr-2 py-1 hover:bg-[rgba(25,24,23,0.05)] transition-colors cursor-pointer"
      >
        {me.user.picture ? (
          <Image
            src={me.user.picture}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="rounded-full border border-[rgba(25,24,23,0.12)]"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-[#6F5B91] text-[#FBF9F2] grid place-items-center text-[12px] font-medium">
            {me.user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden sm:inline text-[13px] text-[#33302c] max-w-[140px] truncate">{me.user.name}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-[10px] border border-[rgba(25,24,23,0.12)] bg-[#FFFFFF] shadow-[0_12px_40px_-18px_rgba(25,24,23,0.25)] py-2 z-50"
        >
          <div className="px-4 py-2 border-b border-[rgba(25,24,23,0.07)]">
            <p className="text-[13px] font-medium truncate">{me.user.name}</p>
            <p className="text-[12px] text-[#77736C] truncate">{me.user.email}</p>
          </div>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-[rgba(25,24,23,0.04)] transition-colors"
          >
            <Settings size={15} strokeWidth={1.6} /> Settings & API keys
          </Link>
          <a
            href="/api/auth/signout"
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-[rgba(25,24,23,0.04)] transition-colors"
          >
            <LogOut size={15} strokeWidth={1.6} /> Sign out
          </a>
        </div>
      )}
    </div>
  );
}
