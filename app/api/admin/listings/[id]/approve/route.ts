/**
 * POST /api/admin/listings/[id]/approve
 *
 * Body: { exclusive?: boolean }
 *
 * Flips listing_status to 'active'. When exclusive=true, also stamps
 * is_exclusive=true, exclusive_since=now(), exclusive_trial_ends_at=now()+30d.
 *
 * Admin-only.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin, AuthError } from '@/lib/auth';

type Ctx = { params: { id: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const asExclusive = !!body.exclusive;

    const { rows } = await pool.query(
      asExclusive
        ? `UPDATE franchise_listings SET
             listing_status          = 'active',
             is_exclusive            = TRUE,
             exclusive_since         = now(),
             exclusive_trial_ends_at = now() + interval '30 days',
             first_seen_at           = COALESCE(submitted_at, now()),
             last_seen_at            = now()
           WHERE id = $1 AND listing_status = 'pending'
           RETURNING id, brand_name, is_exclusive, exclusive_trial_ends_at`
        : `UPDATE franchise_listings SET
             listing_status = 'active',
             first_seen_at  = COALESCE(submitted_at, now()),
             last_seen_at   = now()
           WHERE id = $1 AND listing_status = 'pending'
           RETURNING id, brand_name, is_exclusive`,
      [params.id]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: 'Listing not found or not pending' }, { status: 404 });
    }

    // TODO: send approval email to listed_by_email + (if exclusive) the trial-ends notice.
    return NextResponse.json({ ok: true, listing: rows[0] });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('approve failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
