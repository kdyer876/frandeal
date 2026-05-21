/**
 * GET /api/listings
 *   ?state=TX&category=fitness&maxPrice=300000
 *   &minCashFlow=50000&brand=Smoothie+King
 *   &hasFDD=true&page=1&limit=20
 */

import { NextResponse } from 'next/server';
import { searchListings } from '@/lib/db';
import { optionalAuth } from '@/lib/auth';

export async function GET(req: Request) {
  const user   = await optionalAuth(req);
  const url    = new URL(req.url);
  const params = url.searchParams;
  const isPaid = ['starter', 'pro'].includes(user?.plan ?? '');

  try {
    const listings = await searchListings({
      state:            params.get('state') ?? undefined,
      category:         params.get('category') ?? undefined,
      maxPriceCents:    params.get('maxPrice')    ? Number(params.get('maxPrice')) * 100  : undefined,
      minCashFlowCents: params.get('minCashFlow') ? Number(params.get('minCashFlow')) * 100 : undefined,
      brandName:        params.get('brand') ?? undefined,
      hasFDD:           params.get('hasFDD') === 'true' ? true : undefined,
      limit:            Number(params.get('limit') ?? 20),
      offset:           (Number(params.get('page') ?? 1) - 1) * Number(params.get('limit') ?? 20),
    });

    // On free plan, blank out financial details — keep price visible to entice sign-up
    const sanitized = listings.map(l => ({
      ...l,
      annual_revenue_cents:   isPaid ? l.annual_revenue_cents   : null,
      annual_cash_flow_cents: isPaid ? l.annual_cash_flow_cents : null,
      sde_multiple:           isPaid ? l.sde_multiple           : null,
      revenue_multiple:       isPaid ? l.revenue_multiple       : null,
      // Always hide broker contact — revealed only via /listings/:id/reveal
      broker_name:  null,
      broker_email: null,
      broker_phone: null,
    }));

    return NextResponse.json({ listings: sanitized, total: sanitized.length });
  } catch (err: unknown) {
    console.error('Listings query error:', err);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}
