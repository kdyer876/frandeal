'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, CreditCard, Heart, Lock, Plus, Trash2, ExternalLink } from 'lucide-react';
import { formatCents, formatDate, categoryLabel, CATEGORIES, US_STATES } from '@/lib/format';

type User = { id: string; email: string; name?: string | null; plan: string };
type BillingStatus = {
  plan: string;
  status: string;
  onTrial: boolean;
  trialEndsAt?: string | null;
  planExpiresAt?: string | null;
  leadsUsed: number;
  leadsLimit: number | null;
  leadsRemaining: number | null;
};
type Saved = {
  listing_id: string;
  brand_name?: string | null;
  city?: string | null;
  state?: string | null;
  asking_price_cents?: number | null;
};
type Alert = {
  id: string;
  brand_name?: string | null;
  category?: string | null;
  state?: string | null;
  max_price_cents?: number | null;
  min_cash_flow_cents?: number | null;
  active?: boolean;
  created_at: string;
};

export function Dashboard() {
  const router = useRouter();
  const [user,    setUser]    = useState<User | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [saved,   setSaved]   = useState<Saved[]>([]);
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAlert, setShowNewAlert] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('ff_token');
    if (!token) {
      router.replace('/login?next=/dashboard');
      return;
    }
    const auth = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/auth',    { headers: auth }).then(r => r.ok ? r.json() : null),
      fetch('/api/billing', { headers: auth }).then(r => r.ok ? r.json() : null),
      fetch('/api/saved',   { headers: auth }).then(r => r.ok ? r.json() : { listings: [] }),
      fetch('/api/alerts',  { headers: auth }).then(r => r.ok ? r.json() : { alerts: [] }),
    ])
      .then(([authRes, billRes, savedRes, alertsRes]) => {
        if (!authRes?.user) {
          router.replace('/login?next=/dashboard');
          return;
        }
        setUser(authRes.user);
        setBilling(billRes ?? null);
        setSaved(savedRes?.listings ?? []);
        setAlerts(alertsRes?.alerts ?? []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function openPortal() {
    const token = localStorage.getItem('ff_token');
    if (!token || !user) return;
    const r = await fetch('/api/billing?action=portal', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: user.id }),
    });
    const d = await r.json();
    if (d.url) window.location.href = d.url;
  }

  async function deleteAlert(id: string) {
    const token = localStorage.getItem('ff_token');
    await fetch(`/api/alerts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setAlerts(a => a.filter(x => x.id !== id));
  }

  async function createAlert(form: Partial<Alert> & { maxPriceCents?: number; minCashFlowCents?: number }) {
    const token = localStorage.getItem('ff_token');
    const r = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const d = await r.json();
      setAlerts(a => [d.alert, ...a]);
      setShowNewAlert(false);
    }
  }

  if (loading) {
    return (
      <div className="container-page py-12 text-center text-ink-500">Loading your dashboard…</div>
    );
  }
  if (!user) return null;

  const isPaid = ['starter', 'pro'].includes(user.plan);

  return (
    <div className="container-page py-8">
      <header className="mb-8 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-950">
            Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-ink-600">{user.email}</p>
        </div>
        <Link href="/browse" className="btn-primary">Browse new listings</Link>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Current plan"
          value={user.plan === 'free' ? 'Free' : user.plan === 'starter' ? 'Starter' : 'Pro'}
          accent={user.plan === 'free' ? 'ink' : 'brand'}
          sub={
            billing?.onTrial && billing.trialEndsAt
              ? `Trial ends ${formatDate(billing.trialEndsAt)}`
              : billing?.planExpiresAt
                ? `Renews ${formatDate(billing.planExpiresAt)}`
                : undefined
          }
          action={
            isPaid ? (
              <button onClick={openPortal} className="text-sm font-medium text-brand-700 hover:underline">
                Manage billing
              </button>
            ) : (
              <Link href="/pricing" className="text-sm font-medium text-brand-700 hover:underline">
                Upgrade
              </Link>
            )
          }
        />
        <StatCard
          icon={<Heart className="h-4 w-4" />}
          label="Saved listings"
          value={saved.length.toString()}
          accent="ink"
        />
        <StatCard
          icon={<Bell className="h-4 w-4" />}
          label="Active alerts"
          value={alerts.filter(a => a.active !== false).length.toString()}
          accent="ink"
          sub={
            billing && billing.leadsLimit != null
              ? `${billing.leadsUsed} / ${billing.leadsLimit === Infinity ? '∞' : billing.leadsLimit} leads used this month`
              : undefined
          }
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-950">Saved listings</h2>
            <Link href="/browse" className="text-sm text-brand-700 hover:underline">Browse →</Link>
          </div>
          {!isPaid ? (
            <UpgradeBlock feature="Saving listings" />
          ) : saved.length === 0 ? (
            <EmptyBlock label="No saved listings yet" hint="Tap the heart on any listing to save it." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {saved.map(s => (
                <li key={s.listing_id} className="py-3">
                  <Link
                    href={`/listings/${s.listing_id}`}
                    className="flex items-center justify-between gap-3 hover:text-brand-700"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {s.brand_name ?? 'Independent listing'}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
                        {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">{formatCents(s.asking_price_cents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-950">Search alerts</h2>
            {isPaid && (
              <button
                onClick={() => setShowNewAlert(v => !v)}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                <Plus className="mr-1 inline h-4 w-4" />
                New alert
              </button>
            )}
          </div>

          {!isPaid ? (
            <UpgradeBlock feature="Search alerts" />
          ) : (
            <>
              {showNewAlert && (
                <NewAlertForm onSubmit={createAlert} onCancel={() => setShowNewAlert(false)} />
              )}
              {alerts.length === 0 && !showNewAlert ? (
                <EmptyBlock label="No active alerts" hint="Tell us what you want — we'll email when it shows up." />
              ) : (
                <ul className="mt-3 divide-y divide-ink-100">
                  {alerts.map(a => (
                    <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-900">
                          {a.brand_name || categoryLabel(a.category) || 'Any listing'}
                          {a.state && <span className="text-ink-500"> · {a.state}</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {a.max_price_cents && `Up to ${formatCents(a.max_price_cents)}`}
                          {a.max_price_cents && a.min_cash_flow_cents && ' · '}
                          {a.min_cash_flow_cents && `Cash flow ≥ ${formatCents(a.min_cash_flow_cents)}`}
                          {!a.max_price_cents && !a.min_cash_flow_cents && 'Any price'}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAlert(a.id)}
                        className="rounded-md p-2 text-ink-400 hover:bg-ink-50 hover:text-red-600"
                        aria-label="Delete alert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

function StatCard(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: 'brand' | 'ink';
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ink-500">
        <span className={props.accent === 'brand' ? 'text-brand-600' : 'text-ink-400'}>
          {props.icon}
        </span>
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-bold text-ink-950">{props.value}</div>
      {props.sub && <div className="mt-1 text-xs text-ink-500">{props.sub}</div>}
      {props.action && <div className="mt-3">{props.action}</div>}
    </div>
  );
}

function EmptyBlock({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/50 px-4 py-6 text-center">
      <p className="text-sm font-medium text-ink-900">{label}</p>
      <p className="mt-1 text-xs text-ink-500">{hint}</p>
    </div>
  );
}

function UpgradeBlock({ feature }: { feature: string }) {
  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-6 text-center">
      <Lock className="mx-auto h-5 w-5 text-brand-600" />
      <p className="mt-2 text-sm font-medium text-ink-900">{feature} is a paid feature</p>
      <p className="mt-1 text-xs text-ink-600">Try Starter free for 7 days — no card to start.</p>
      <Link href="/pricing" className="btn-primary mt-3 inline-flex">
        See plans
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

function NewAlertForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: { brandName?: string; category?: string; state?: string; maxPriceCents?: number; minCashFlowCents?: number }) => void;
  onCancel: () => void;
}) {
  const [brandName, setBrandName] = useState('');
  const [category,  setCategory]  = useState('');
  const [state,     setState]     = useState('');
  const [maxPrice,  setMaxPrice]  = useState('');
  const [minCF,     setMinCF]     = useState('');

  return (
    <form
      className="space-y-3 rounded-lg border border-ink-100 bg-ink-50/40 p-4"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({
          brandName: brandName || undefined,
          category:  category  || undefined,
          state:     state     || undefined,
          maxPriceCents:    maxPrice ? Number(maxPrice) * 100 : undefined,
          minCashFlowCents: minCF    ? Number(minCF)    * 100 : undefined,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Brand (optional)</label>
          <input className="input mt-1" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Anytime Fitness" />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input mt-1" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Any</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">State</label>
          <select className="input mt-1" value={state} onChange={e => setState(e.target.value)}>
            <option value="">Any</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Max price ($)</label>
          <input className="input mt-1" type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Min annual cash flow ($)</label>
          <input className="input mt-1" type="number" value={minCF} onChange={e => setMinCF(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary">Create alert</button>
      </div>
    </form>
  );
}
