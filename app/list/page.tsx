import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, BadgeCheck, Check, ListChecks, TrendingUp, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'List your franchise resale on FranDeal',
  description:
    'List with FranDeal to get your franchise resale in front of qualified buyers. Standard listings are free. FranDeal Exclusive pins your listing to the top of the category.',
};

export default function ListPage() {
  return (
    <>
      <section className="border-b border-ink-100 bg-gradient-to-b from-amber-50 to-white">
        <div className="container-page py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            For brokers and franchisors
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Put your franchise resale in front of buyers who are actually
            ready to underwrite.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-700">
            FranDeal is where buyers come to evaluate franchise resales on the
            numbers — not the listing photos. Standard listings are free.
            FranDeal Exclusive pins yours to the top of its category.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-300">
            <BadgeCheck className="h-4 w-4" />
            First 30 days of FranDeal Exclusive are free — no card required
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/list/submit" className="btn-primary">
              List a resale
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="mailto:partners@frandeal.com" className="btn-secondary">
              Talk to partnerships
            </a>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-2xl font-bold tracking-tight text-ink-950">
          Why brokers list with FranDeal
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <ValueCard
            icon={<Users className="h-5 w-5" />}
            title="Pre-qualified buyers"
            body="Our Starter and Pro subscribers are paying to look at deal financials — they're not tire-kickers. Every reveal of your contact info uses one of their monthly lead credits."
          />
          <ValueCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="FDD context built in"
            body="Each listing is automatically matched to its franchisor's most recent FDD. Buyers see your unit's numbers alongside the system's Item 19 averages — fewer back-and-forths."
          />
          <ValueCard
            icon={<ListChecks className="h-5 w-5" />}
            title="One listing, one workflow"
            body="Submit once; we'll handle the listing page, broker reveal, and email alerts to matching buyers. Update or remove anytime from your dashboard."
          />
        </div>
      </section>

      <section className="bg-ink-50 py-16">
        <div className="container-page">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">
            FranDeal Exclusive
          </h2>
          <p className="mt-2 max-w-2xl text-ink-700">
            For listings you want to move quickly. Exclusive listings get
            visibility, signaling, and dedicated buyer outreach that standard
            free listings don't.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ExclusiveBenefit
              title="Top-of-category pinning"
              body="Your listing sorts above every standard listing in its category until it's sold or you remove it."
            />
            <ExclusiveBenefit
              title="Gold badge + listing-page banner"
              body="Buyers see the FranDeal Exclusive badge on every search result and a full-width banner on the listing page."
            />
            <ExclusiveBenefit
              title="Push to matching alerts"
              body="When your listing is published, it's pushed immediately to every saved search alert that matches — same hour, not next morning."
            />
            <ExclusiveBenefit
              title="Buyer concierge intro"
              body="Pro-tier buyers who reveal your contact get a personal intro email from FranDeal, not just your details."
            />
            <ExclusiveBenefit
              title="Listed by [your name]"
              body="The card and detail page show your company name and link to your other active FranDeal listings — useful for multi-unit operators and brokers with a book of business."
            />
            <ExclusiveBenefit
              title="Performance dashboard"
              body="See views, saves, and broker-reveal counts so you know if the price needs revisiting."
            />
          </div>

          <div className="mt-10 card p-6">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-semibold text-ink-950">Ready to list?</h3>
                <p className="mt-1 text-sm text-ink-600">
                  Try FranDeal Exclusive free for 30 days when you submit.
                  No card required, no auto-renewal — we&apos;ll reach out
                  before the trial ends to discuss continuing.
                </p>
              </div>
              <Link href="/list/submit" className="btn-primary">
                List a resale
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ValueCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-6">
      <div className="inline-grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-ink-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">{body}</p>
    </div>
  );
}

function ExclusiveBenefit({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-2">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <h4 className="font-semibold text-ink-950">{title}</h4>
          <p className="mt-1 text-sm text-ink-700">{body}</p>
        </div>
      </div>
    </div>
  );
}
