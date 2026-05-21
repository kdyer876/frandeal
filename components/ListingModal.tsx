'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BadgeCheck, Bookmark, ExternalLink, Lock, MapPin, X } from 'lucide-react';
import { formatCents, categoryLabel } from '@/lib/format';
import { brandInitials, categoryColors } from '@/lib/categoryColors';

export type ListingForModal = {
  listing_id: string;
  brand_name?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  asking_price_cents?: number | null;
  annual_revenue_cents?: number | null;
  annual_cash_flow_cents?: number | null;
  ebitda_cents?: number | null;
  sde_multiple?: number | null;
  revenue_multiple?: number | null;
  fdd_year?: number | null;
  fdd_auv_cents?: number | null;
  fdd_ebitda_margin?: number | null;
  fdd_initial_franchise_fee_cents?: number | null;
  fdd_royalty_pct?: number | null;
  fdd_initial_investment_low_cents?: number | null;
  fdd_initial_investment_high_cents?: number | null;
  established_year?: number | null;
  number_of_employees?: number | null;
  description?: string | null;
  reason_for_selling?: string | null;
  source?: string | null;
  is_exclusive?: boolean | null;
  listed_by_company?: string | null;
  first_seen_at?: string | null;
};

type Props = {
  listing:    ListingForModal;
  isPaid?:    boolean;
  asOverlay?: boolean;       // true = full-screen overlay; false = inline (used by /listings/[id])
  onClose?:   () => void;
  onReveal?:  () => void;
};

export function ListingModal({ listing, isPaid = false, asOverlay = false, onClose, onReveal }: Props) {
  const colors  = categoryColors(listing.category);
  const initials = brandInitials(listing.brand_name);

  useEffect(() => {
    if (!asOverlay || !onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [asOverlay, onClose]);

  const Inner = (
    <div className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-ink-100">
      {listing.is_exclusive && (
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-300 px-5 py-1.5 text-xs font-semibold text-amber-950">
          <BadgeCheck className="h-3.5 w-3.5" />
          FranDeal Exclusive
          {listing.listed_by_company && (
            <span className="ml-auto text-[11px] font-normal text-amber-900/80">
              Listed by {listing.listed_by_company}
            </span>
          )}
        </div>
      )}

      <div
        className="flex items-start justify-between gap-3 px-5 py-5"
        style={{ background: colors.bg }}
      >
        <div>
          <div className="text-3xl font-semibold" style={{ color: colors.text }}>
            {initials}
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            {listing.brand_name ?? 'Independent franchise resale'}
          </h2>
          <p
            className="mt-0.5 flex items-center gap-1 text-xs"
            style={{ color: colors.text }}
          >
            <MapPin className="h-3 w-3" />
            {[listing.city, listing.state, listing.zip].filter(Boolean).join(', ') || 'Location undisclosed'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-ink-700">
              {categoryLabel(listing.category)}
            </span>
            {listing.fdd_year && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-ink-700">
                FDD {listing.fdd_year}
              </span>
            )}
            {listing.established_year && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-ink-700">
                Est. {listing.established_year}
              </span>
            )}
          </div>
        </div>
        {asOverlay && onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-full bg-white ring-1 ring-ink-200 text-ink-600 hover:bg-ink-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Asking price" value={formatCents(listing.asking_price_cents)} />
          <StatBox
            label="Cash flow"
            value={isPaid ? formatCents(listing.annual_cash_flow_cents) : null}
          />
          <StatBox
            label="Revenue"
            value={isPaid ? formatCents(listing.annual_revenue_cents) : null}
          />
        </div>

        {listing.fdd_year && (
          <>
            <SectionTitle>Franchise system (FDD {listing.fdd_year})</SectionTitle>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <StatBox label="Royalty" value={listing.fdd_royalty_pct != null ? `${(listing.fdd_royalty_pct * 100).toFixed(1)}%` : '—'} />
              <StatBox label="Franchise fee" value={formatCents(listing.fdd_initial_franchise_fee_cents)} />
              <StatBox
                label="System AUV"
                value={isPaid ? formatCents(listing.fdd_auv_cents, { compact: true }) : null}
                lockedNote="Pro only"
              />
            </div>
          </>
        )}

        {listing.description && (
          <>
            <SectionTitle>About this listing</SectionTitle>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-ink-700">
              {listing.description}
            </p>
          </>
        )}

        {listing.reason_for_selling && (
          <>
            <SectionTitle>Reason for selling</SectionTitle>
            <p className="mt-1 text-xs text-ink-700">{listing.reason_for_selling}</p>
          </>
        )}

        <SectionTitle>Source</SectionTitle>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-600">
          <ExternalLink className="h-3 w-3" />
          {sourceLabel(listing.source)}
        </p>
      </div>

      <div className="flex gap-2 border-t border-ink-100 px-5 py-3">
        <button type="button" className="btn-secondary">
          <Bookmark className="h-4 w-4" />
          Save
        </button>
        <button
          type="button"
          onClick={onReveal}
          className="btn-primary flex-1 justify-center"
        >
          {isPaid ? 'Show broker contact' : (
            <>
              <Lock className="h-4 w-4" />
              View contact &amp; financials →
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (!asOverlay) return Inner;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4 sm:py-12"
      role="dialog"
      aria-modal="true"
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-xl">
        {Inner}
      </div>
    </div>
  );
}

function StatBox({ label, value, lockedNote }: { label: string; value: string | null; lockedNote?: string }) {
  return (
    <div className="rounded-md bg-ink-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${value == null ? 'text-ink-400' : 'text-ink-950'}`}>
        {value == null
          ? (
            <span className="inline-flex items-center gap-1 text-xs font-normal">
              <Lock className="h-3 w-3" />
              {lockedNote ?? 'Locked'}
            </span>
          )
          : value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 text-[11px] font-medium uppercase tracking-wide text-ink-500">{children}</h3>
  );
}

function sourceLabel(src: string | null | undefined): string {
  if (src === 'frandeal')        return 'FranDeal · listed by broker';
  if (src === 'bizbuysell')      return 'BizBuySell · third-party listing';
  if (src === 'franchisegator')  return 'FranchiseGator · third-party listing';
  return src ?? 'Listed';
}
