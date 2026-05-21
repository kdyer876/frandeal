'use client';

/**
 * Used by app/listings/[id]/page.tsx — direct link / deep link target.
 * Renders the same ListingModal layout as the in-browse overlay, but as a
 * regular centered card on a page (no backdrop, no close button).
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ListingModal, type ListingForModal } from '@/components/ListingModal';
import { PaywallModal, type PaywallKind } from '@/components/PaywallModal';

export function ListingDetail({ id }: { id: string }) {
  const router = useRouter();
  const [listing, setListing] = useState<ListingForModal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [isPaid,  setIsPaid]  = useState(false);
  const [paywall, setPaywall] = useState<PaywallKind | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/listings/${id}`, { headers })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load listing');
        return r.json();
      })
      .then(d => setListing(d.listing))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));

    if (token) {
      fetch('/api/auth', { headers })
        .then(r => (r.ok ? r.json() : null))
        .then(d => setIsPaid(['starter', 'pro'].includes(d?.user?.plan)))
        .catch(() => {});
    }
  }, [id]);

  if (loading) {
    return <div className="container-page py-16 text-center text-ink-500">Loading listing…</div>;
  }

  if (error || !listing) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink-950">Listing not found</h1>
        <p className="mt-2 text-ink-600">{error ?? 'It may have been removed.'}</p>
        <Link href="/browse" className="btn-primary mt-4 inline-flex">Back to browse</Link>
      </div>
    );
  }

  async function reveal() {
    if (!isPaid) {
      setPaywall('buyer');
      return;
    }
    const token = localStorage.getItem('ff_token');
    if (!token) {
      router.push(`/login?next=/listings/${id}`);
      return;
    }
    const r = await fetch(`/api/listings/${id}/reveal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 402) {
      router.push('/pricing');
      return;
    }
    if (!r.ok) return;
    // The contact data comes back in the response — for now, just refetch the
    // listing so the modal shows the broker fields, which the API will return
    // unredacted now that this user has used a reveal credit.
    const fresh = await fetch(`/api/listings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (fresh.ok) {
      const d = await fresh.json();
      setListing(d.listing);
    }
  }

  return (
    <div className="bg-ink-50">
      <div className="container-page py-6">
        <Link
          href="/browse"
          className="mb-3 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="mx-auto max-w-xl">
          <ListingModal listing={listing} isPaid={isPaid} onReveal={reveal} />
        </div>
      </div>

      <PaywallModal
        open={paywall !== null}
        kind={paywall ?? 'buyer'}
        onClose={() => setPaywall(null)}
      />
    </div>
  );
}
