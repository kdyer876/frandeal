/**
 * GET    /api/saved        — list saved listings (Starter+)
 * POST   /api/saved/:id   — save a listing
 * DELETE /api/saved/:id   — unsave a listing
 */

import { NextResponse } from 'next/server';
import { pool, getSavedListings } from '@/lib/db';
import { requireAuth, requirePlan, AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    requirePlan(user, 'starter');
    const listings = await getSavedListings(user.id);
    return NextResponse.json({ listings });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
