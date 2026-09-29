'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-serif-display text-[19px] tracking-[0.22em] uppercase select-none ${className}`}
      aria-label="Contexta"
    >
      Contexta
    </span>
  );
}

export function Eyebrow({
  children,
  accent = false,
  className = '',
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return <p className={`eyebrow ${accent ? 'eyebrow-accent' : ''} ${className}`}>{children}</p>;
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[#6F5B91] border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function StatusDot({ tone = 'neutral', pulse = false }: { tone?: 'neutral' | 'active' | 'done' | 'error'; pulse?: boolean }) {
  const colors: Record<string, string> = {
    neutral: 'bg-[#A6A099]',
    active: 'bg-[#6F5B91]',
    done: 'bg-[#5E7D5A]',
    error: 'bg-[#A5554C]',
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[tone]} ${pulse ? 'breathe' : ''}`} aria-hidden="true" />;
}

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Close panel"
        className="absolute inset-0 w-full h-full cursor-default bg-[rgba(25,24,23,0.28)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-[#FBF9F2] border-l border-[rgba(25,24,23,0.12)] shadow-[-24px_0_60px_-30px_rgba(25,24,23,0.25)] overflow-y-auto"
        style={{ animation: 'sheetIn 260ms ease both' }}
      >
        <style>{`@keyframes sheetIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-[#FBF9F2]/95 backdrop-blur-sm border-b border-[rgba(25,24,23,0.08)] px-7 py-5">
          <div>
            {eyebrow && <Eyebrow accent>{eyebrow}</Eyebrow>}
            <h2 className="font-serif-display text-[24px] leading-tight mt-1">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-full p-1.5 text-[#77736C] hover:bg-[rgba(25,24,23,0.05)] hover:text-[#191817] transition-colors"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>
        <div className="px-7 py-6">{children}</div>
      </aside>
    </div>
  );
}

export function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
