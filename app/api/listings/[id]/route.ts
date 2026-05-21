/**
 * GET  /api/listings/:id           — listing detail + FDD (broker hidden unless Starter+)
 * POST /api/listings/:id/reveal    — reveal broker contact (Starter+, counts toward quota)
 */

import { NextResponse } from 'next/server';
import { pool, getListingWithFDD, getMonthlyLeadUsage, trackLeadReveal } from '@/lib/db';
import { optionalAuth, requireAuth, requirePlan, AuthError } from '@/lib/auth';
import { PLANS } from '@/lib/billing';

type Ctx = { params: { id: string } };

// ── GET /api/listings/:id ─────────────────────────────────────────────────────
export async function GET(req: Request, { params }: Ctx) {
  const user    = await optionalAuth(req);
  const listing = await getListingWithFDD(params.id);

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const isPaid   = ['starter', 'pro'].includes(user?.plan ?? '');
  const isPro    = user?.plan === 'pro';

  return NextResponse.json({
    listing: {
      ...listing,
      // Free: hide financials
      annual_revenue_cents:   isPaid ? listing.annual_revenue_cents   : null,
      annual_cash_flow_cents: isPaid ? listing.annual_cash_flow_cents : null,
      sde_multiple:           isPaid ? listing.sde_multiple           : null,
      // Pro only: Item 19 AUV + EBITDA
      fdd_auv_cents:          isPro  ? listing.fdd_auv_cents          : null,
      fdd_ebitda_margin:      isPro  ? listing.fdd_ebitda_margin      : null,
      // Broker always hidden here — use /reveal
      broker_name:  null,
      broker_email: null,
      broker_phone: null,
    },
  });
}
