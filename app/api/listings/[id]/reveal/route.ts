/**
 * POST /api/listings/:id/reveal
 *
 * Reveals broker contact. Requires Starter+ plan.
 * Starter: 10 reveals/month. Pro: unlimited.
 */

import { NextResponse } from 'next/server';
import { pool, getMonthlyLeadUsage, trackLeadReveal } from '@/lib/db';
import { requireAuth, requirePlan, AuthError } from '@/lib/auth';
import { PLANS } from '@/lib/billing';

type Ctx = { params: { id: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireAuth(req);
    requirePlan(user, 'starter');

    // Quota check for Starter
    if (user.plan === 'starter') {
      const usage = await getMonthlyLeadUsage(user.id);
      const limit = PLANS.starter.leadsPerMonth;

      if (usage.leads_revealed >= limit) {
        return NextResponse.json({
          error:      'Monthly lead limit reached',
          code:       'LEADS_QUOTA_EXCEEDED',
          used:       usage.leads_revealed,
          limit,
          resetsAt:   usage.resets_at,
          upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        }, { status: 402 });
      }
    }

    const { rows } = await pool.query(`
      SELECT broker_name, broker_email, broker_phone, broker_company, source_url
      FROM franchise_listings WHERE id = $1
    `, [params.id]);

    if (!rows[0]) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    await trackLeadReveal(user.id, params.id);

    return NextResponse.json({ contact: rows[0] });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
