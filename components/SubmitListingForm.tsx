'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check } from 'lucide-react';
import { CATEGORIES, US_STATES, categoryLabel } from '@/lib/format';

type Form = {
  brandName:      string;
  category:       string;
  city:           string;
  state:          string;
  zip:            string;
  askingPrice:    string;
  annualRevenue:  string;
  annualCashFlow: string;
  establishedYear: string;
  numberOfEmployees: string;
  description:    string;
  reasonForSelling: string;
  brokerName:     string;
  brokerEmail:    string;
  brokerPhone:    string;
  brokerCompany:  string;
  exclusive:      boolean;
};

const EMPTY: Form = {
  brandName: '', category: '', city: '', state: '', zip: '',
  askingPrice: '', annualRevenue: '', annualCashFlow: '',
  establishedYear: '', numberOfEmployees: '',
  description: '', reasonForSelling: '',
  brokerName: '', brokerEmail: '', brokerPhone: '', brokerCompany: '',
  exclusive: false,
};

export function SubmitListingForm() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('ff_token');
    if (!token) {
      router.replace('/register?next=/list/submit');
      return;
    }
    fetch('/api/auth', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.user) { router.replace('/login?next=/list/submit'); return; }
        setUserRole(d.user.role ?? 'buyer');
        // Pre-fill broker name/email from the account if available.
        setForm(f => ({
          ...f,
          brokerName:  f.brokerName  || d.user.name      || '',
          brokerEmail: f.brokerEmail || d.user.email     || '',
          brokerCompany: f.brokerCompany || d.user.company_name || '',
        }));
        setAuthChecked(true);
      });
  }, [router]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = localStorage.getItem('ff_token');
      const r = await fetch('/api/listings/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Submission failed');
      setSuccess(d.listingId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) {
    return <div className="container-page py-12 text-center text-ink-500">Loading…</div>;
  }

  if (success) {
    return (
      <div className="container-page py-16 text-center">
        <div className="mx-auto inline-grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-700">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-950">Listing submitted</h1>
        <p className="mt-2 text-ink-700">
          We&apos;ll review it within 1 business day. You&apos;ll get an email when it goes live.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
          <Link href={`/listings/${success}`} className="btn-secondary">Preview listing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <Link href="/list" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-ink-950">
        List a franchise resale
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        Free to list. Promote to FranDeal Exclusive for priority placement.
      </p>

      {userRole === 'buyer' && (
        <div className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Your account is set up as a buyer. We&apos;ll upgrade it to a broker account when you
          submit your first listing.
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card title="The opportunity">
            <Field label="Franchise brand *" required>
              <input className="input mt-1" value={form.brandName} onChange={e => set('brandName', e.target.value)} required />
            </Field>
            <Field label="Category">
              <select className="input mt-1" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Choose…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City"><input className="input mt-1" value={form.city} onChange={e => set('city', e.target.value)} /></Field>
              <Field label="State">
                <select className="input mt-1" value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">—</option>
                  {US_STATES.map(([c]) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="ZIP"><input className="input mt-1" value={form.zip} onChange={e => set('zip', e.target.value)} /></Field>
            </div>
            <Field label="Description">
              <textarea rows={5} className="input mt-1" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What makes this opportunity attractive?" />
            </Field>
            <Field label="Reason for selling">
              <input className="input mt-1" value={form.reasonForSelling} onChange={e => set('reasonForSelling', e.target.value)} />
            </Field>
          </Card>

          <Card title="Financials">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Asking price ($) *" required>
                <input type="number" className="input mt-1" value={form.askingPrice} onChange={e => set('askingPrice', e.target.value)} required />
              </Field>
              <Field label="Annual revenue ($)">
                <input type="number" className="input mt-1" value={form.annualRevenue} onChange={e => set('annualRevenue', e.target.value)} />
              </Field>
              <Field label="Annual cash flow ($)">
                <input type="number" className="input mt-1" value={form.annualCashFlow} onChange={e => set('annualCashFlow', e.target.value)} />
              </Field>
              <Field label="Established year">
                <input type="number" className="input mt-1" value={form.establishedYear} onChange={e => set('establishedYear', e.target.value)} />
              </Field>
              <Field label="Employees">
                <input type="number" className="input mt-1" value={form.numberOfEmployees} onChange={e => set('numberOfEmployees', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="Broker contact">
            <p className="text-xs text-ink-500">
              Buyers can only see this after they pay to reveal — and only Starter/Pro subscribers can reveal.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Name"><input className="input mt-1" value={form.brokerName} onChange={e => set('brokerName', e.target.value)} /></Field>
              <Field label="Company"><input className="input mt-1" value={form.brokerCompany} onChange={e => set('brokerCompany', e.target.value)} /></Field>
              <Field label="Email"><input type="email" className="input mt-1" value={form.brokerEmail} onChange={e => set('brokerEmail', e.target.value)} /></Field>
              <Field label="Phone"><input type="tel" className="input mt-1" value={form.brokerPhone} onChange={e => set('brokerPhone', e.target.value)} /></Field>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-900">Promote this listing</h3>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 p-3 has-[:checked]:border-amber-300 has-[:checked]:bg-amber-50">
              <input
                type="checkbox"
                checked={form.exclusive}
                onChange={e => set('exclusive', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-amber-500 focus:ring-amber-400"
              />
              <span className="flex-1 text-sm">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-900">
                  <BadgeCheck className="h-4 w-4" />
                  FranDeal Exclusive — first 30 days free
                </span>
                <span className="mt-1 block text-xs text-ink-700">
                  Pin to top of category, gold badge, priority alert push, concierge intros.
                  No card required. We&apos;ll email you before the trial ends to discuss continuing.
                </span>
              </span>
            </label>

            <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>

            <p className="mt-3 text-xs text-ink-500">
              Submissions are reviewed manually before going live. We&apos;ll email you within 1 business day.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-ink-950">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
    </label>
  );
}
