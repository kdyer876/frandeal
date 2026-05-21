'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const nav = [
  { href: '/browse',    label: 'Browse listings' },
  { href: '/list',      label: 'List with us' },
  { href: '/pricing',   label: 'Pricing' },
  { href: '/dashboard', label: 'Dashboard' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSignedIn(!!localStorage.getItem('ff_token'));
    }
  }, [pathname]);

  function signOut() {
    localStorage.removeItem('ff_token');
    localStorage.removeItem('ff_user');
    setSignedIn(false);
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white font-bold">
            FD
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink-950">
            FranDeal
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map(item => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? 'text-brand-700' : 'text-ink-700 hover:text-ink-900 hover:bg-ink-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <>
              <Link href="/dashboard" className="btn-ghost">Account</Link>
              <button onClick={signOut} className="btn-secondary">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <Link href="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden rounded-md p-2 text-ink-700 hover:bg-ink-50"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white md:hidden">
          <div className="container-page space-y-1 py-3">
            {nav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 border-t border-ink-100" />
            {signedIn ? (
              <button onClick={signOut} className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-ink-700 hover:bg-ink-50">
                Sign out
              </button>
            ) : (
              <>
                <Link href="/login" className="block rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
                  Sign in
                </Link>
                <Link href="/register" className="block rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
