/**
 * GET /api/admin/listings
 *
 * Returns all listings currently in pending review, with their submitter
 * info and the requested-exclusive flag from the original submission.
 *
 * Admin-only.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAdmin, AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const { rows } = await pool.query(`
      SELECT
        l.id,
        l.brand_name,
        l.category::text                                  AS category,
        l.city, l.state, l.zip,
        l.asking_price_cents,
        l.annual_revenue_cents,
        l.annual_cash_flow_cents,
        l.established_year,
        l.number_of_employees,
        l.description,
        l.reason_for_selling,
        l.broker_name,
        l.broker_email,
        l.broker_phone,
        l.broker_company,
        l.source,
        l.submitted_at,
        l.listed_by_user_id,
        u.name                                            AS listed_by_name,
        u.email                                           AS listed_by_email,
        u.company_name                                    AS listed_by_company,
        COALESCE((l.raw_json->>'exclusiveRequested')::boolean, FALSE) AS exclusive_requested
      FROM franchise_listings l
      LEFT JOIN users u ON u.id = l.listed_by_user_id
      WHERE l.listing_status = 'pending'
      ORDER BY l.submitted_at DESC NULLS LAST, l.created_at DESC
    `);

    return NextResponse.json({ listings: rows });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('admin listings load failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
