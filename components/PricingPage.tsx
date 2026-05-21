'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';

type Plan = {
  key: 'free' | 'starter' | 'pro';
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
  cta: string;
};

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Browse',
    price: '$0',
    cadence: 'forever',
    blurb: 'See every active resale listing, with asking price.',
    features: [
      'Full listing inventory (BizBuySell + FranchiseGator)',
      'Filter by state, category, brand',
      'Asking price and location',
      'FDD availability indicator',
    ],
    cta: 'Start browsing',
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$29',
    cadence: 'per month',
    blurb: 'Real underwriting data. For serious buyers comparing 5–20 deals.',
    features: [
      'Everything in Browse',
      'Annual revenue + cash flow on every listing',
      'FDD financials (Item 19 averages)',
      '10 broker contact reveals / month',
      'Save listings and create search alerts',
      'Email notifications when new listings match',
    ],
    highlight: true,
    cta: 'Start 7-day free trial',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$79',
    cadence: 'per month',
    blurb: 'For brokers, investors, and multi-unit operators.',
    features: [
      'Everything in Starter',
      'Unlimited broker contact reveals',
      'Item 19 AUV and EBITDA margins',
      'Priority email alerts (within 30 minutes)',
      'CSV export of search results',
      'Dedicated support',
    ],
    cta: 'Start 7-day free trial',
  },
];

export function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingInner />
    </Suspense>
  );
}

function PricingInner() {
  const router = useRouter();
  const search = useSearchParams();
  const cancelled = search.get('checkout') === 'cancelled';
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function startCheckout(plan: 'starter' | 'pro') {
    setError(null);
    const token = localStorage.getItem('ff_token');
    const userJson = localStorage.getItem('ff_user');
    if (!token || !userJson) {
      router.push(`/register?next=/pricing&plan=${plan}`);
      return;
    }
    setLoading(plan);
    try {
      const user = JSON.parse(userJson) as { id: string; email: string };
      const r = await fetch('/api/billing?action=checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan, userId: user.id, email: user.email }),
      });
      const d = await r.json();
      if (d.url) {
        window.location.href = d.url;
        return;
      }
      throw new Error(d.error ?? 'Failed to start checkout');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="container-page py-12">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
          Pick the plan that fits how seriously you're shopping
        </h1>
        <p className="mt-4 text-lg text-ink-600">
          Free forever to browse. Pay only when you're ready to evaluate deals
          on the numbers, not the listing photos.
        </p>
      </header>

      {cancelled && (
        <div className="mx-auto mt-6 max-w-2xl rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Checkout cancelled — no charges made. Try again when you're ready.
        </div>
      )}
      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.key}
            plan={plan}
            loading={loading === plan.key}
            onSelect={() => {
              if (plan.key === 'free') router.push('/register');
              else startCheckout(plan.key);
            }}
          />
        ))}
      </div>

      <FAQ />
    </div>
  );
}

function PlanCard({ plan, loading, onSelect }: { plan: Plan; loading: boolean; onSelect: () => void }) {
  return (
    <div
      className={`card relative flex flex-col p-7 ${
        plan.highlight
          ? 'ring-2 ring-brand-500 shadow-lg lg:scale-[1.02]'
          : 'ring-1 ring-ink-100'
      }`}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
          <Sparkles className="mr-1 inline h-3 w-3" />
          Most popular
        </span>
      )}

      <h3 className="text-lg font-semibold text-ink-950">{plan.name}</h3>
      <p className="mt-1 text-sm text-ink-600">{plan.blurb}</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-ink-950">{plan.price}</span>
        <span className="text-sm text-ink-500">{plan.cadence}</span>
      </div>

      <button
        onClick={onSelect}
        disabled={loading}
        className={plan.highlight ? 'btn-primary mt-6' : 'btn-secondary mt-6'}
      >
        {loading ? 'Loading…' : plan.cta}
      </button>

      <ul className="mt-6 space-y-2 text-sm text-ink-700">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQ() {
  const items = [
    {
      q: 'Where do the listings come from?',
      a: 'We scrape BizBuySell and FranchiseGator nightly for every active franchise resale, then match each one to its franchisor\'s FDD using state registration filings (WI, CA, MN).',
    },
    {
      q: 'How accurate are the financials?',
      a: 'Listing-level financials (revenue, cash flow) come from the seller via the original listing — same as what brokers see. FDD figures come from the franchisor\'s most recent Item 19 disclosure, which is a regulatory filing.',
    },
    {
      q: 'What counts as a "lead reveal"?',
      a: 'A lead reveal unlocks the broker\'s name, phone, and email for one listing. You only spend a reveal when you click "Show contact" — browsing the listing is free.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Cancel from your dashboard in two clicks. If you cancel during the trial, you\'re not charged.',
    },
    {
      q: 'Do you sell my data?',
      a: 'No. We don\'t share your search history, saved listings, or contact info with brokers, franchisors, or anyone else.',
    },
  ];
  return (
    <section className="mx-auto mt-20 max-w-3xl">
      <h2 className="text-center text-2xl font-bold tracking-tight text-ink-950">
        Common questions
      </h2>
      <div className="mt-8 space-y-4">
        {items.map(item => (
          <details
            key={item.q}
            className="card group p-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium text-ink-900">
              {item.q}
              <span className="text-ink-400 transition group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-ink-600">
        Still not sure?{' '}
        <Link href="/browse" className="text-brand-700 hover:underline">
          Browse listings free
        </Link>{' '}
        and decide when you find one worth a closer look.
      </p>
    </section>
  );
}
