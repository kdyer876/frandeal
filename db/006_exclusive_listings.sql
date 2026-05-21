-- ============================================================================
-- 006_exclusive_listings.sql
--
-- 1. Adds a user_role enum (buyer / broker / franchisor / admin) and a `role`
--    column on users.
-- 2. Adds is_exclusive + exclusive_since + listed_by_user_id to franchise_listings
--    so brokers/franchisors can list their own resales and we can bump them to
--    the top of search results.
-- 3. Updates listings_with_fdd to expose the new columns.
--
-- Idempotent.
-- ============================================================================

-- ─── 1. Users — role ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('buyer', 'broker', 'franchisor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'buyer';
-- Optional human-readable company name for brokers/franchisors (shown on
-- "Listed by …" credits).
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name text;

CREATE INDEX IF NOT EXISTS users_role_idx
  ON users (role) WHERE role <> 'buyer';

-- ─── 2. franchise_listings — exclusivity + first-party submissions ──────────
ALTER TABLE franchise_listings ADD COLUMN IF NOT EXISTS is_exclusive       boolean       NOT NULL DEFAULT FALSE;
ALTER TABLE franchise_listings ADD COLUMN IF NOT EXISTS exclusive_since    timestamptz;
ALTER TABLE franchise_listings ADD COLUMN IF NOT EXISTS listed_by_user_id  uuid          REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE franchise_listings ADD COLUMN IF NOT EXISTS submitted_at       timestamptz;

-- Partial index so the "exclusives first" sort stays cheap.
CREATE INDEX IF NOT EXISTS listings_exclusive_idx
  ON franchise_listings (first_seen_at DESC)
  WHERE is_exclusive = TRUE AND listing_status = 'active';

-- Allow source = 'frandeal' for first-party listings — string column so no
-- enum migration required, but document it here.
COMMENT ON COLUMN franchise_listings.source IS
  '''bizbuysell'' | ''franchisegator'' | ''frandeal'' (first-party broker/franchisor submission)';

-- ─── 3. View update — expose the new columns ────────────────────────────────
DROP VIEW IF EXISTS listings_with_fdd CASCADE;

CREATE VIEW listings_with_fdd AS
SELECT
  l.id                          AS listing_id,
  l.id                          AS id,

  COALESCE(fr.brand_name, l.brand_name)              AS brand_name,
  COALESCE(fr.category,   l.category)                AS category,
  fr.id                          AS franchisor_id,

  l.source,
  l.external_id,
  l.source_url,
  l.listing_status,
  l.city,
  l.state,
  l.zip,
  l.asking_price_cents,
  l.annual_revenue_cents,
  l.annual_cash_flow_cents,
  l.ebitda_cents,
  l.established_year,
  l.number_of_employees,
  l.square_footage,
  l.lease_expiry_date,
  l.broker_name,
  l.broker_email,
  l.broker_phone,
  l.broker_company,
  l.description,
  l.reason_for_selling,
  l.first_seen_at,
  l.last_seen_at,

  -- Exclusivity + first-party fields
  l.is_exclusive,
  l.exclusive_since,
  l.listed_by_user_id,
  u.company_name                 AS listed_by_company,
  u.name                         AS listed_by_name,
  u.role                         AS listed_by_role,

  -- Deal multiples
  CASE
    WHEN l.annual_cash_flow_cents IS NOT NULL AND l.annual_cash_flow_cents > 0
      THEN (l.asking_price_cents::numeric / l.annual_cash_flow_cents::numeric)
  END                            AS sde_multiple,
  CASE
    WHEN l.annual_revenue_cents IS NOT NULL AND l.annual_revenue_cents > 0
      THEN (l.asking_price_cents::numeric / l.annual_revenue_cents::numeric)
  END                            AS revenue_multiple,

  -- Current FDD fields
  fi.fdd_year                                        AS fdd_year,
  fi.effective_date                                  AS fdd_effective_date,
  fi.source_name                                     AS fdd_source,
  fi.pdf_url                                         AS fdd_pdf_url,
  fi.extraction_confidence                           AS fdd_confidence,
  fi.auv_cents                                       AS fdd_auv_cents,
  fi.ebitda_margin                                   AS fdd_ebitda_margin,
  fi.initial_franchise_fee_cents                     AS fdd_initial_franchise_fee_cents,
  fi.royalty_pct                                     AS fdd_royalty_pct,
  fi.initial_investment_low_cents                    AS fdd_initial_investment_low_cents,
  fi.initial_investment_high_cents                   AS fdd_initial_investment_high_cents
FROM franchise_listings l
LEFT JOIN franchisors  fr ON fr.id = l.franchisor_id
LEFT JOIN fdd_filings  fi ON fi.franchisor_id = fr.id AND fi.is_current = TRUE
LEFT JOIN users        u  ON u.id  = l.listed_by_user_id;
