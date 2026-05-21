'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Bookmark, ExternalLink, MapPin, Search } from 'lucide-react';
import { formatCents, categoryLabel, CATEGORIES, US_STATES } from '@/lib/format';
import { brandInitials, categoryColors } from '@/lib/categoryColors';
import { ListingModal, type ListingForModal } from '@/components/ListingModal';
import { PaywallModal, type PaywallKind } from '@/components/PaywallModal';

const CATEGORY_CHIPS = [
  { key: '',                       label: 'All categories',   icon: null },
  { key: 'food_beverage',          label: 'Food & Bev',        icon: '🍴' },
  { key: 'fitness_wellness',       label: 'Fitness',           icon: null },
  { key: 'business_services',      label: 'Services',          icon: null },
  { key: 'beauty_personal_care',   label: 'Health & Beauty',   icon: null },
  { key: 'retail',                 label: 'Retail',            icon: null },
] as const;

type Filters = {
  state: string;
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  exclusiveOnly: boolean;
  hasFDD: boolean;
  sources: { bizbuysell: boolean; franchisegator: boolean; frandeal: boolean };
  sort: 'exclusive' | 'newest' | 'price_asc' | 'cf_desc';
};

const EMPTY_FILTERS: Filters = {
  state: '',
  category: '',
  brand: '',
  minPrice: '',
  maxPrice: '',
  exclusiveOnly: false,
  hasFDD: false,
  sources: { bizbuysell: true, franchisegator: true, frandeal: true },
  sort: 'exclusive',
};

export function BrowsePage() {
  const [filters, setFilters]   = useState<Filters>(EMPTY_FILTERS);
  const [listings, setListings] = useState<ListingForModal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [isPaid, setIsPaid]     = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingForModal | null>(null);
  const [paywall, setPaywall] = useState<PaywallKind | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null;
    if (!token) return;
    fetch('/api/auth', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setIsPaid(['starter', 'pro'].includes(d?.user?.plan)))
      .catch(() => {});
  }, []);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.state)       p.set('state', filters.state);
    if (filters.category)    p.set('category', filters.category);
    if (filters.brand)       p.set('brand', filters.brand);
    if (filters.maxPrice)    p.set('maxPrice', filters.maxPrice);
    if (filters.hasFDD)      p.set('hasFDD', 'true');
    p.set('limit', '24');
    return p.toString();
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null;
    fetch(`/api/listings?${queryString}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(data => setListings(data.listings ?? []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [queryString]);

  // Client-side post-filters (exclusive-only, source toggle, min-price)
  const visible = useMemo(() => {
    return listings.filter(l => {
      if (filters.exclusiveOnly && !l.is_exclusive) return false;
      if (filters.minPrice && (l.asking_price_cents ?? 0) < Number(filters.minPrice) * 100) return false;
      const src = (l.source ?? '') as keyof typeof filters.sources;
      if (filters.sources[src] === false) return false;
      return true;
    });
  }, [listings, filters]);

  return (
    <div className="bg-ink-50">
      <section className="border-b border-ink-100 bg-white">
        <div className="container-page py-6">
          <h1 className="text-xl font-bold tracking-tight text-ink-950">
            Find your next franchise — already built.
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            Verified resale listings from BizBuySell and FranchiseGator, matched to FDD financials.
          </p>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={filters.brand}
                onChange={e => setFilters({ ...filters, brand: e.target.value })}
                placeholder="Search by brand, category, or location…"
                className="input pl-9"
              />
            </div>
            <button type="button" className="btn-primary">Search</button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORY_CHIPS.map(chip => {
              const active = filters.category === chip.key;
              return (
                <button
                  key={chip.key || 'all'}
                  type="button"
                  onClick={() => setFilters({ ...filters, category: chip.key })}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? 'border-brand-300 bg-brand-50 font-medium text-brand-700'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-0">
          <Sidebar filters={filters} setFilters={setFilters} />

          <main className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-ink-600">
                {loading ? 'Searching…' : `${visible.length} listings found`}
              </span>
              <select
                value={filters.sort}
                onChange={e => setFilters({ ...filters, sort: e.target.value as Filters['sort'] })}
                className="input h-8 text-xs"
                style={{ width: 'auto', padding: '0 8px' }}
              >
                <option value="exclusive">Sort: Exclusive first</option>
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="cf_desc">Cash flow: highest</option>
              </select>
            </div>

            {error && (
              <div className="card mb-4 p-3 text-xs text-red-700 ring-red-200">{error}</div>
            )}

            {loading ? (
              <CardsSkeleton />
            ) : visible.length === 0 ? (
              <EmptyState onReset={() => setFilters(EMPTY_FILTERS)} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map(l => (
                  <ListingCard
                    key={l.listing_id}
                    listing={l}
                    isPaid={isPaid}
                    onClick={() => setSelectedListing(l)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedListing && (
        <ListingModal
          listing={selectedListing}
          isPaid={isPaid}
          asOverlay
          onClose={() => setSelectedListing(null)}
          onReveal={() => {
            setSelectedListing(null);
            if (!isPaid) setPaywall('buyer');
          }}
        />
      )}

      <PaywallModal
        open={paywall !== null}
        kind={paywall ?? 'buyer'}
        onClose={() => setPaywall(null)}
      />
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function ListingCard({
  listing,
  isPaid,
  onClick,
}: {
  listing: ListingForModal;
  isPaid: boolean;
  onClick: () => void;
}) {
  const colors  = categoryColors(listing.category);
  const initials = brandInitials(listing.brand_name);
  const ex      = !!listing.is_exclusive;

  return (
    <div
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
      role="button"
      tabIndex={0}
      className={`group cursor-pointer overflow-hidden rounded-xl bg-white ring-1 transition hover:ring-2 ${
        ex ? 'ring-amber-300 hover:ring-amber-400' : 'ring-ink-100 hover:ring-ink-200'
      }`}
    >
      <div className="relative grid h-24 place-items-center" style={{ background: colors.bg }}>
        <span className="text-2xl font-semibold" style={{ color: colors.text }}>
          {initials}
        </span>
        {ex && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900">
            <BadgeCheck className="h-2.5 w-2.5" />
            FranDeal Exclusive
          </span>
        )}
      </div>

      <div className="px-3 pb-3 pt-2.5">
        <div className="text-sm font-semibold text-ink-950">
          {listing.brand_name ?? 'Independent listing'}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500">
          <MapPin className="h-3 w-3" />
          {[listing.city, listing.state].filter(Boolean).join(', ') || 'Location undisclosed'}
        </div>
        <div className="mt-2 text-base font-semibold text-ink-950">
          {formatCents(listing.asking_price_cents)}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1 border-t border-ink-100 pt-2 text-[10px] text-ink-500">
          <div>
            <div>Cash flow</div>
            <div className="text-[11px] font-medium text-ink-700">
              {isPaid ? formatCents(listing.annual_cash_flow_cents) : '—'}
            </div>
          </div>
          <div className="text-center">
            <div>Revenue</div>
            <div className="text-[11px] font-medium text-ink-700">
              {isPaid ? formatCents(listing.annual_revenue_cents) : '—'}
            </div>
          </div>
          <div className="text-right">
            <div>Est. age</div>
            <div className="text-[11px] font-medium text-ink-700">
              {listing.established_year ? `${new Date().getFullYear() - listing.established_year} yrs` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50/60 px-3 py-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-ink-500">
          <ExternalLink className="h-2.5 w-2.5" />
          {sourceShort(listing.source)}
        </span>
        <button
          type="button"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-ink-500 hover:bg-white hover:text-brand-700"
        >
          <Bookmark className="h-3 w-3" /> Save
        </button>
      </div>
    </div>
  );
}

function sourceShort(s: string | null | undefined): string {
  if (s === 'bizbuysell')      return 'BizBuySell';
  if (s === 'franchisegator')  return 'FranchiseGator';
  if (s === 'frandeal')        return 'Direct broker';
  return s ?? '—';
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  return (
    <aside className="hidden border-r border-ink-100 bg-white p-4 md:block">
      <Group title="Price range">
        <div className="flex items-center gap-1.5">
          <input
            value={filters.minPrice}
            onChange={e => setFilters({ ...filters, minPrice: e.target.value })}
            placeholder="$50k"
            className="input h-8 text-xs"
            style={{ width: '64px', padding: '0 6px' }}
          />
          <span className="text-xs text-ink-400">–</span>
          <input
            value={filters.maxPrice}
            onChange={e => setFilters({ ...filters, maxPrice: e.target.value })}
            placeholder="$500k"
            className="input h-8 text-xs"
            style={{ width: '64px', padding: '0 6px' }}
          />
        </div>
      </Group>

      <Group title="FranDeal Exclusive">
        <Check
          checked={filters.exclusiveOnly}
          onChange={v => setFilters({ ...filters, exclusiveOnly: v })}
          label="Exclusive only"
        />
      </Group>

      <Group title="State">
        <select
          value={filters.state}
          onChange={e => setFilters({ ...filters, state: e.target.value })}
          className="input h-8 text-xs"
        >
          <option value="">Any state</option>
          {US_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </Group>

      <Group title="FDD data">
        <Check
          checked={filters.hasFDD}
          onChange={v => setFilters({ ...filters, hasFDD: v })}
          label="Has FDD"
        />
      </Group>

      <Group title="Source">
        <Check
          checked={filters.sources.bizbuysell}
          onChange={v => setFilters({ ...filters, sources: { ...filters.sources, bizbuysell: v } })}
          label="BizBuySell"
        />
        <Check
          checked={filters.sources.franchisegator}
          onChange={v => setFilters({ ...filters, sources: { ...filters.sources, franchisegator: v } })}
          label="FranchiseGator"
        />
        <Check
          checked={filters.sources.frandeal}
          onChange={v => setFilters({ ...filters, sources: { ...filters.sources, frandeal: v } })}
          label="Direct broker"
        />
      </Group>
    </aside>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-400">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-700 hover:text-ink-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
      />
      {label}
    </label>
  );
}

// ─── Placeholders ────────────────────────────────────────────────────────────
function CardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl bg-white ring-1 ring-ink-100">
          <div className="h-24 animate-pulse bg-ink-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-xl bg-white p-10 text-center ring-1 ring-ink-100">
      <Search className="mx-auto h-7 w-7 text-ink-300" />
      <h3 className="mt-3 text-sm font-semibold text-ink-900">No listings match those filters</h3>
      <p className="mt-1 text-xs text-ink-600">Widen the search — drop a state or raise the price ceiling.</p>
      <button onClick={onReset} className="btn-secondary mt-4">Reset filters</button>
    </div>
  );
}
