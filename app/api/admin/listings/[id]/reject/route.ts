/**
 * POST /api/admin/listings/[id]/reject
 *
 * Body: { reason?: string }
 *
 * Marks the listing 'removed' and stores the rejection reason on raw_json.
 *
 * Admin-only.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin, AuthError } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin(req);
    const body  = await req.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : null;

    const { rows } = await pool.query(`
      UPDATE franchise_listings SET
        listing_status = 'removed',
        raw_json       = COALESCE(raw_json, '{}'::jsonb)
                         || jsonb_build_object(
                             'rejection_reason', $2::text,
                             'rejected_at',      now()::text,
                             'rejected_by',      $3::text
                           )
      WHERE id = $1 AND listing_status = 'pending'
      RETURNING id, brand_name
    `, [id, reason, admin.email]);

    if (!rows[0]) {
      return NextResponse.json({ error: 'Listing not found or not pending' }, { status: 404 });
    }

    // TODO: send rejection email with reason to listed_by_email.
    return NextResponse.json({ ok: true, listing: rows[0] });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('reject failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
