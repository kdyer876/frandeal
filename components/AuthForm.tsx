'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  return (
    <Suspense fallback={null}>
      <Inner mode={mode} />
    </Suspense>
  );
}

function Inner({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/dashboard';

  const [email,    setEmail]    = useState('');
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/auth?action=${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          mode === 'register' ? { email, name, password } : { email, password }
        ),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Something went wrong');
      localStorage.setItem('ff_token', d.token);
      localStorage.setItem('ff_user',  JSON.stringify(d.user));
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const isReg = mode === 'register';

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <div className="card p-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">
            {isReg ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            {isReg
              ? 'Free forever to browse. No card required.'
              : 'Welcome back.'}
          </p>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input mt-1"
              />
            </div>

            {isReg && (
              <div>
                <label htmlFor="name" className="label">Name <span className="text-ink-400">(optional)</span></label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input mt-1"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={isReg ? 'new-password' : 'current-password'}
                required
                minLength={isReg ? 8 : undefined}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input mt-1"
              />
              {isReg && (
                <p className="mt-1 text-xs text-ink-500">At least 8 characters.</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : isReg ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            {isReg ? (
              <>
                Already have an account?{' '}
                <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-brand-700 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{' '}
                <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-brand-700 hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
