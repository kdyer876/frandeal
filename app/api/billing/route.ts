/**
 * POST /api/billing?action=checkout  { plan, userId }
 * POST /api/billing?action=portal    { userId }
 * GET  /api/billing/status           (Bearer token)
 * POST /api/billing/webhook          (raw body — Stripe)
 */

import { NextResponse } from 'next/server';
import { stripe, createCheckoutSession, createPortalSession, handleWebhookEvent, deriveSubscriptionStatus, PLANS } from '@/lib/billing';
import { requireAuth } from '@/lib/auth';
import { pool, getMonthlyLeadUsage } from '@/lib/db';

export async function POST(req: Request) {
  const url    = new URL(req.url);
  const action = url.searchParams.get('action');

  // ── Checkout ────────────────────────────────────────────────────────────────
  if (action === 'checkout') {
    const { plan, userId, email } = await req.json();
    if (!plan || !userId) return NextResponse.json({ error: 'plan and userId required' }, { status: 400 });

    try {
      const session = await createCheckoutSession(userId, email, plan);
      return NextResponse.json({ url: session.url, sessionId: session.id });
    } catch (e: unknown) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  // ── Portal ──────────────────────────────────────────────────────────────────
  if (action === 'portal') {
    const { userId } = await req.json();
    const { rows }   = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    if (!rows[0]?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }
    const session = await createPortalSession(rows[0].stripe_customer_id);
    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// ── Status ────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    const u       = rows[0];
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const usage   = await getMonthlyLeadUsage(user.id);
    const plan    = PLANS[u.plan as keyof typeof PLANS];
    const status  = deriveSubscriptionStatus(u);

    return NextResponse.json({
      plan:           u.plan ?? 'free',
      status,
      onTrial:        status === 'trialing',
      trialEndsAt:    u.trial_ends_at,
      planExpiresAt:  u.plan_expires_at,
      leadsUsed:      usage.leads_revealed,
      leadsLimit:     plan?.leadsPerMonth ?? 0,
      leadsRemaining: plan ? Math.max(0, (plan.leadsPerMonth === Infinity ? Infinity : plan.leadsPerMonth) - usage.leads_revealed) : 0,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
}
