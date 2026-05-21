/**
 * GET    /api/alerts          — list user's alerts (Starter+)
 * POST   /api/alerts          — create alert (Starter+)
 * PATCH  /api/alerts/:id      — toggle active/paused
 * DELETE /api/alerts/:id      — delete alert
 */

import { NextResponse } from 'next/server';
import { pool, getAlerts } from '@/lib/db';
import { requireAuth, requirePlan, AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    requirePlan(user, 'starter');
    const alerts = await getAlerts(user.id);
    return NextResponse.json({ alerts });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    requirePlan(user, 'starter');

    const { brandName, category, state, maxPriceCents, minCashFlowCents } = await req.json();

    const { rows } = await pool.query(`
      INSERT INTO search_alerts
        (user_id, brand_name, category, state, max_price_cents, min_cash_flow_cents)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [user.id, brandName ?? null, category ?? null, state ?? null, maxPriceCents ?? null, minCashFlowCents ?? null]);

    return NextResponse.json({ alert: rows[0] }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
