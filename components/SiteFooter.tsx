import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white font-bold">
                FD
              </div>
              <span className="text-lg font-semibold tracking-tight text-ink-950">
                FranDeal
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-600">
              The marketplace for franchise resales — every active listing on
              BizBuySell and FranchiseGator, matched to its FDD financials so
              you can underwrite a deal in minutes, not weeks.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">Product</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/browse" className="hover:text-ink-900">Browse listings</Link></li>
              <li><Link href="/pricing" className="hover:text-ink-900">Pricing</Link></li>
              <li><Link href="/dashboard" className="hover:text-ink-900">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">Account</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/login" className="hover:text-ink-900">Sign in</Link></li>
              <li><Link href="/register" className="hover:text-ink-900">Create account</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-ink-100 pt-6 text-xs text-ink-500 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} FranDeal. All rights reserved.</p>
          <p>
            Listings sourced from public marketplaces. FDD figures from state
            registration filings.
          </p>
        </div>
      </div>
    </footer>
  );
}
