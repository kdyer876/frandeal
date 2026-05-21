/**
 * POST /api/listings/submit
 *
 * Accepts a first-party listing submission from a broker or franchisor.
 *
 * - Requires authentication.
 * - If the requesting user is currently 'buyer', auto-upgrades them to 'broker'
 *   on first submission (they can change to 'franchisor' later from settings).
 * - The listing is inserted with listing_status = 'pending' so a human can
 *   review before it shows up on /browse.
 * - The `exclusive` flag from the form is stored separately as a request
 *   — we don't auto-grant exclusivity. Pricing is discussed off-platform.
 */

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { pool, matchFranchisor, dollarsToCents } from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth';

type Body = {
  brandName?:         string;
  category?:          string;
  city?:              string;
  state?:             string;
  zip?:               string;
  askingPrice?:       string | number;
  annualRevenue?:     string | number;
  annualCashFlow?:    string | number;
  establishedYear?:   string | number;
  numberOfEmployees?: string | number;
  description?:       string;
  reasonForSelling?:  string;
  brokerName?:        string;
  brokerEmail?:       string;
  brokerPhone?:       string;
  brokerCompany?:     string;
  exclusive?:         boolean;
};

function asInt(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.brandName?.trim()) {
    return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
  }
  if (body.askingPrice == null || body.askingPrice === '') {
    return NextResponse.json({ error: 'Asking price is required' }, { status: 400 });
  }

  // Upgrade buyer → broker on first submission so they show up correctly
  // in the dashboard and on the listed-by credit.
  const { rows: userRows } = await pool.query('SELECT role, company_name FROM users WHERE id = $1', [user.id]);
  const currentRole = userRows[0]?.role ?? 'buyer';
  if (currentRole === 'buyer') {
    await pool.query(
      `UPDATE users SET role = 'broker', company_name = COALESCE($2, company_name) WHERE id = $1`,
      [user.id, body.brokerCompany?.trim() || null]
    );
  } else if (body.brokerCompany?.trim() && !userRows[0]?.company_name) {
    await pool.query('UPDATE users SET company_name = $2 WHERE id = $1', [user.id, body.brokerCompany.trim()]);
  }

  const matched = await matchFranchisor(body.brandName.trim());

  // External id: stable per submission so the listing can be re-submitted /
  // updated by the same submitter.
  const externalId = `ff-${crypto.randomUUID()}`;

  try {
    const { rows } = await pool.query(`
      INSERT INTO franchise_listings (
        franchisor_id, source, external_id, source_url, listing_status,
        brand_name, category,
        city, state, zip,
        asking_price_cents, annual_revenue_cents, annual_cash_flow_cents,
        established_year, number_of_employees,
        broker_name, broker_email, broker_phone, broker_company,
        description, reason_for_selling,
        listed_by_user_id, submitted_at,
        raw_json
      ) VALUES (
        $1, 'frandeal', $2, NULL, 'pending',
        $3, $4::listing_category,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12,
        $13, $14, $15, $16,
        $17, $18,
        $19, now(),
        $20
      ) RETURNING id
    `, [
      matched?.id ?? null,
      externalId,
      body.brandName.trim(),
      body.category || null,
      body.city || null,
      body.state || null,
      body.zip || null,
      dollarsToCents(body.askingPrice    as string | number | null | undefined),
      dollarsToCents(body.annualRevenue  as string | number | null | undefined),
      dollarsToCents(body.annualCashFlow as string | number | null | undefined),
      asInt(body.establishedYear),
      asInt(body.numberOfEmployees),
      body.brokerName?.trim()    || null,
      body.brokerEmail?.trim()   || null,
      body.brokerPhone?.trim()   || null,
      body.brokerCompany?.trim() || null,
      body.description?.trim()       || null,
      body.reasonForSelling?.trim()  || null,
      user.id,
      JSON.stringify({ exclusiveRequested: !!body.exclusive }),
    ]);

    return NextResponse.json({
      listingId:          rows[0].id,
      status:             'pending_review',
      exclusiveRequested: !!body.exclusive,
    }, { status: 201 });
  } catch (err) {
    console.error('listing submit failed:', err);
    return NextResponse.json({ error: 'Could not save your listing' }, { status: 500 });
  }
}
