'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BadgeCheck, Check, ExternalLink, Sparkles, Trash2, X } from 'lucide-react';
import { formatCents, formatDate, categoryLabel } from '@/lib/format';

type PendingListing = {
  id: string;
  brand_name: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  asking_price_cents: number | null;
  annual_revenue_cents: number | null;
  annual_cash_flow_cents: number | null;
  established_year: number | null;
  number_of_employees: number | null;
  description: string | null;
  reason_for_selling: string | null;
  broker_name: string | null;
  broker_email: string | null;
  broker_phone: string | null;
  broker_company: string | null;
  source: string;
  submitted_at: string | null;
  listed_by_user_id: string | null;
  listed_by_name: string | null;
  listed_by_email: string | null;
  listed_by_company: string | null;
  exclusive_requested: boolean;
};

export function AdminQueue() {
  const router = useRouter();
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [busyId,   setBusyId]   = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function authHeaders(): Record<string, string> {
    const token = localStorage.getItem('ff_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/listings', { headers: authHeaders() });
      if (r.status === 401 || r.status === 403) {
        router.replace('/login?next=/admin');
        return;
      }
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
      const d = await r.json();
      setListings(d.listings ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string, asExclusive: boolean) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/listings/${id}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ exclusive: asExclusive }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Approval failed');
      setListings(ls => ls.filter(x => x.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt('Reason for rejection (optional — will be emailed to the broker)?', '');
    if (reason === null) return;  // cancelled
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/listings/${id}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ reason }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Rejection failed');
      setListings(ls => ls.filter(x => x.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-page py-8">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-950">Admin · Approvals</h1>
          <p className="mt-1 text-sm text-ink-600">
            {loading
              ? 'Loading…'
              : `${listings.length} listing${listings.length === 1 ? '' : 's'} waiting for review`}
          </p>
        </div>
        <button onClick={load} className="btn-secondary">Refresh</button>
      </header>

      {error && (
        <div className="card mb-4 p-4 text-sm text-red-700 ring-red-200">{error}</div>
      )}

      {!loading && listings.length === 0 && (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <Check className="h-8 w-8 text-green-500" />
          <h2 className="mt-3 text-base font-semibold text-ink-900">Inbox zero</h2>
          <p className="mt-1 text-sm text-ink-600">No pending submissions right now.</p>
        </div>
      )}

      <ul className="space-y-4">
        {listings.map(l => (
          <li key={l.id} className="card overflow-hidden p-0">
            {l.exclusive_requested && (
              <div className="flex items-center gap-2 bg-amber-100 px-5 py-1.5 text-xs font-semibold text-amber-900">
                <BadgeCheck className="h-3.5 w-3.5" />
                Exclusive requested
              </div>
            )}
            <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-ink-950">
                    {l.brand_name ?? 'Untitled listing'}
                  </h2>
                  <span className="badge bg-ink-100 text-ink-700">{categoryLabel(l.category)}</span>
                </div>

                <div className="mt-1 text-sm text-ink-600">
                  {[l.city, l.state, l.zip].filter(Boolean).join(', ') || 'Location undisclosed'}
                  {l.established_year && <span> · Est. {l.established_year}</span>}
                  {l.number_of_employees && <span> · {l.number_of_employees} employees</span>}
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Asking" value={formatCents(l.asking_price_cents)} />
                  <Stat label="Revenue"   value={formatCents(l.annual_revenue_cents)} />
                  <Stat label="Cash flow" value={formatCents(l.annual_cash_flow_cents)} />
                </dl>

                {l.description && (
                  <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-ink-700">
                    {l.description}
                  </p>
                )}
                {l.reason_for_selling && (
                  <p className="mt-2 text-xs italic text-ink-500">
                    Reason: {l.reason_for_selling}
                  </p>
                )}
              </div>

              <aside className="border-l-0 md:border-l md:border-ink-100 md:pl-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Submitted by</h3>
                <p className="mt-1 text-sm font-medium text-ink-900">
                  {l.listed_by_name ?? l.broker_name ?? '—'}
                </p>
                {l.listed_by_company && <p className="text-xs text-ink-600">{l.listed_by_company}</p>}
                {l.listed_by_email && (
                  <a href={`mailto:${l.listed_by_email}`} className="mt-1 block text-xs text-brand-700 hover:underline">
                    {l.listed_by_email}
                  </a>
                )}
                {l.submitted_at && (
                  <p className="mt-2 text-xs text-ink-500">
                    {formatDate(l.submitted_at)}
                  </p>
                )}

                <hr className="my-4 border-ink-100" />

                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Broker contact (revealed)</h3>
                <dl className="mt-1 space-y-0.5 text-xs">
                  <div><span className="text-ink-500">Name:</span> <span className="text-ink-900">{l.broker_name ?? '—'}</span></div>
                  <div><span className="text-ink-500">Email:</span> <span className="text-ink-900">{l.broker_email ?? '—'}</span></div>
                  <div><span className="text-ink-500">Phone:</span> <span className="text-ink-900">{l.broker_phone ?? '—'}</span></div>
                  <div><span className="text-ink-500">Co.:</span>   <span className="text-ink-900">{l.broker_company ?? '—'}</span></div>
                </dl>
              </aside>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-50/50 px-6 py-3">
              <button
                onClick={() => reject(l.id)}
                disabled={busyId === l.id}
                className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Reject
              </button>
              <button
                onClick={() => approve(l.id, false)}
                disabled={busyId === l.id}
                className="btn-secondary"
              >
                <Check className="h-4 w-4" />
                Approve standard
              </button>
              <button
                onClick={() => approve(l.id, true)}
                disabled={busyId === l.id}
                className="btn-primary bg-amber-500 hover:bg-amber-600 focus:ring-amber-500"
              >
                <Sparkles className="h-4 w-4" />
                Approve as Exclusive — 30-day trial
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
