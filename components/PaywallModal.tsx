'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BadgeCheck, Lock, X } from 'lucide-react';

export type PaywallKind = 'buyer' | 'broker';

type Props = {
  open:   boolean;
  kind:   PaywallKind;
  onClose: () => void;
};

export function PaywallModal({ open, kind, onClose }: Props) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('pro');

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card w-full max-w-md p-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -mt-2 ml-auto block rounded-md p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          style={{ position: 'absolute', top: 12, right: 12 }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {kind === 'buyer' ? (
          <>
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-ink-950">Full access required</h2>
            <p className="mt-1 text-sm text-ink-600">
              Get broker contact, revenue, and FDD financials for every listing.
              7-day free trial — no card required.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => setSelectedPlan('starter')}
                className={`rounded-md p-3 ring-1 ring-inset transition ${
                  selectedPlan === 'starter'
                    ? 'bg-brand-50 ring-brand-500'
                    : 'bg-white ring-ink-200 hover:ring-ink-300'
                }`}
              >
                <div className="text-xs font-medium text-ink-700">Starter</div>
                <div className="mt-1 text-lg font-semibold text-ink-950">$29<span className="text-xs font-normal text-ink-500">/mo</span></div>
                <div className="mt-0.5 text-[10px] leading-snug text-ink-600">10 reveals/mo · alerts · saved searches</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan('pro')}
                className={`relative rounded-md p-3 ring-1 ring-inset transition ${
                  selectedPlan === 'pro'
                    ? 'bg-brand-50 ring-2 ring-brand-600'
                    : 'bg-white ring-ink-200 hover:ring-ink-300'
                }`}
              >
                <span className="absolute -top-2 right-2 rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-medium text-brand-800">Most popular</span>
                <div className="text-xs font-medium text-ink-700">Pro</div>
                <div className="mt-1 text-lg font-semibold text-ink-950">$79<span className="text-xs font-normal text-ink-500">/mo</span></div>
                <div className="mt-0.5 text-[10px] leading-snug text-ink-600">Unlimited reveals · Item 19 · broker direct</div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/register?plan=${selectedPlan}`)}
              className="btn-primary mt-4 w-full justify-center"
            >
              Start 7-day free trial →
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 text-xs text-ink-500 underline hover:text-ink-700"
            >
              Continue browsing (limited view)
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-700">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-ink-950">List with FranDeal</h2>
            <p className="mt-1 text-sm text-ink-600">
              Standard listings are free. FranDeal Exclusive pins yours to the
              top of its category — your first 30 days are on us, no card required.
            </p>

            <div className="mt-4 rounded-md bg-amber-50 px-3 py-3 text-left text-xs text-amber-900">
              <strong className="font-medium">Exclusive benefits:</strong>
              <span className="ml-1">Top-of-category pinning · Gold badge · Priority alert push · Concierge intros to Pro buyers</span>
            </div>

            <Link
              href="/list/submit"
              onClick={onClose}
              className="btn-primary mt-4 w-full justify-center bg-amber-500 hover:bg-amber-600 focus:ring-amber-500"
            >
              Submit a listing →
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 text-xs text-ink-500 underline hover:text-ink-700"
            >
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
