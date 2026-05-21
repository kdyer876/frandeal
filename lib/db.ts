/**
 * lib/db.ts
 *
 * Single database client for the whole Next.js app.
 * Wraps pg.Pool with connection reuse across hot reloads in dev.
 *
 * Import from here everywhere — never instantiate Pool directly.
 *
 *   import { pool, upsertFDD, upsertListing, searchListings } from '@/lib/db';
 */

import { Pool, PoolClient } from 'pg';

declare global {
  // Prevent multiple Pool instances during Next.js hot reload
  var _pgPool: Pool | undefined;
}

const pool = global._pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
});

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}

export { pool };

// ─── Money helpers ────────────────────────────────────────────────────────────

export function dollarsToCents(str: string | number | null | undefined): number | null {
  if (str == null) return null;
  if (typeof str === 'number') return Math.round(str * 100);
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : Math.round(n * 100);
}

export function pctToDecimal(str: string | number | null | undefined): number | null {
  if (str == null) return null;
  if (typeof str === 'number') return str > 1 ? str / 100 : str;
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return null;
  return String(str).includes('%') ? n / 100 : n > 1 ? n / 100 : n;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export interface ListingInput {
  franchisorId?: string | null;
  source: string;
  externalId: string;
  sourceUrl?: string | null;
  status?: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  askingPrice?: number | string | null;
  annualRevenue?: number | string | null;
  annualCashFlow?: number | string | null;
  ebitda?: number | string | null;
  establishedYear?: number | null;
  numberOfEmployees?: number | null;
  squareFootage?: number | null;
  leaseExpiryDate?: string | null;
  brokerName?: string | null;
  brokerEmail?: string | null;
  brokerPhone?: string | null;
  brokerCompany?: string | null;
  description?: string | null;
  reasonForSelling?: string | null;
}

export async function upsertListing(listing: ListingInput): Promise<string> {
  const res = await pool.query(`
    INSERT INTO franchise_listings (
      franchisor_id, source, external_id, source_url, listing_status,
      city, state, zip,
      asking_price_cents, annual_revenue_cents, annual_cash_flow_cents, ebitda_cents,
      established_year, number_of_employees,
      broker_name, broker_email, broker_phone, broker_company,
      description, reason_for_selling, raw_json
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    ON CONFLICT (source, external_id) DO UPDATE SET
      asking_price_cents     = EXCLUDED.asking_price_cents,
      annual_revenue_cents   = EXCLUDED.annual_revenue_cents,
      annual_cash_flow_cents = EXCLUDED.annual_cash_flow_cents,
      listing_status         = EXCLUDED.listing_status,
      last_seen_at           = now(),
      raw_json               = EXCLUDED.raw_json,
      updated_at             = now()
    RETURNING id
  `, [
    listing.franchisorId ?? null,
    listing.source,
    listing.externalId,
    listing.sourceUrl ?? null,
    listing.status ?? 'active',
    listing.city ?? null,
    listing.state ?? null,
    listing.zip ?? null,
    dollarsToCents(listing.askingPrice),
    dollarsToCents(listing.annualRevenue),
    dollarsToCents(listing.annualCashFlow),
    dollarsToCents(listing.ebitda),
    listing.establishedYear ?? null,
    listing.numberOfEmployees ?? null,
    listing.brokerName ?? null,
    listing.brokerEmail ?? null,
    listing.brokerPhone ?? null,
    listing.brokerCompany ?? null,
    listing.description ?? null,
    listing.reasonForSelling ?? null,
    listing,
  ]);
  return res.rows[0].id;
}

export interface SearchListingsParams {
  state?: string;
  category?: string;
  maxPriceCents?: number;
  minCashFlowCents?: number;
  brandName?: string;
  hasFDD?: boolean;
  limit?: number;
  offset?: number;
}

export async function searchListings(params: SearchListingsParams = {}) {
  const { state, category, maxPriceCents, minCashFlowCents, brandName, hasFDD, limit = 20, offset = 0 } = params;
  const conditions = ["l.listing_status = 'active'"];
  const values: unknown[] = [];

  if (state)           { values.push(state);          conditions.push(`l.state = $${values.length}`); }
  if (category)        { values.push(category);        conditions.push(`l.category::text = $${values.length}`); }
  if (maxPriceCents)   { values.push(maxPriceCents);   conditions.push(`l.asking_price_cents <= $${values.length}`); }
  if (minCashFlowCents){ values.push(minCashFlowCents);conditions.push(`l.annual_cash_flow_cents >= $${values.length}`); }
  if (brandName)       { values.push(`%${brandName}%`);conditions.push(`l.brand_name ILIKE $${values.length}`); }
  if (hasFDD === true) conditions.push(`l.fdd_year IS NOT NULL`);

  values.push(limit, offset);
  // Exclusive listings sort to the top — that's the bump brokers pay for.
  // Within each tier we order by newest-first.
  const res = await pool.query(`
    SELECT * FROM listings_with_fdd l
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      l.is_exclusive DESC NULLS LAST,
      l.exclusive_since DESC NULLS LAST,
      l.first_seen_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `, values);
  return res.rows;
}

export async function getListingWithFDD(listingId: string) {
  const res = await pool.query(
    'SELECT * FROM listings_with_fdd WHERE listing_id = $1',
    [listingId]
  );
  return res.rows[0] ?? null;
}

export async function matchFranchisor(brandName: string) {
  const res = await pool.query(`
    SELECT id, brand_name, similarity(brand_name, $1) AS score
    FROM franchisors WHERE brand_name % $1
    ORDER BY score DESC LIMIT 1
  `, [brandName]);
  return res.rows[0] ?? null;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return res.rows[0] ?? null;
}

// ─── Saved listings ───────────────────────────────────────────────────────────

export async function getSavedListings(userId: string) {
  const res = await pool.query(`
    SELECT l.* FROM listings_with_fdd l
    JOIN saved_listings sl ON sl.listing_id = l.listing_id
    WHERE sl.user_id = $1 ORDER BY sl.saved_at DESC
  `, [userId]);
  return res.rows;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlerts(userId: string) {
  const res = await pool.query(
    'SELECT * FROM search_alerts WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return res.rows;
}

// ─── Lead reveals ─────────────────────────────────────────────────────────────

export async function getMonthlyLeadUsage(userId: string) {
  const res = await pool.query(`
    SELECT COUNT(*)::int AS leads_revealed,
           date_trunc('month', now()) + INTERVAL '1 month' AS resets_at
    FROM lead_reveals
    WHERE user_id = $1 AND revealed_at >= date_trunc('month', now())
  `, [userId]);
  return res.rows[0] ?? { leads_revealed: 0 };
}

export async function trackLeadReveal(userId: string, listingId: string) {
  await pool.query(`
    INSERT INTO lead_reveals (user_id, listing_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, listing_id) DO NOTHING
  `, [userId, listingId]);
}
