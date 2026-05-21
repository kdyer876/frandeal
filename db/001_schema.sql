-- ============================================================================
-- FranDeal — 001_schema.sql
--   Core tables for users, franchisors, listings, FDD filings, alerts,
--   saved listings, and lead reveals.
--
-- Safe to re-run: all DDL is guarded with IF NOT EXISTS / DO $$ guards.
-- ============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Enums (created idempotently) ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE listing_category AS ENUM (
    'food_beverage',
    'fitness_wellness',
    'home_services',
    'beauty_personal_care',
    'automotive',
    'retail',
    'business_services',
    'education_childcare',
    'health_medical',
    'real_estate',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'pending', 'sold', 'stale', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_plan AS ENUM ('free', 'starter', 'pro', 'past_due');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── updated_at trigger helper ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── users ──────────────────────────────────────────────────────────────────
-- All writes lowercase the email (see lib/db.ts), so a plain unique index works.
CREATE TABLE IF NOT EXISTS users (
  id                       uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                    text          NOT NULL,
  name                     text,
  password_hash            text,
  plan                     user_plan     NOT NULL DEFAULT 'free',
  stripe_customer_id       text,
  stripe_subscription_id   text,
  plan_expires_at          timestamptz,
  trial_ends_at            timestamptz,
  last_login_at            timestamptz,
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (lower(email));

DROP TRIGGER IF EXISTS users_touch ON users;
CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── franchisors ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchisors (
  id            uuid              PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name    text              NOT NULL UNIQUE,
  slug          text              UNIQUE,
  category      listing_category,
  website_url   text,
  notes         text,
  created_at    timestamptz       NOT NULL DEFAULT now(),
  updated_at    timestamptz       NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS franchisors_touch ON franchisors;
CREATE TRIGGER franchisors_touch BEFORE UPDATE ON franchisors
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS franchisors_brand_trgm_idx
  ON franchisors USING GIN (brand_name gin_trgm_ops);

-- ─── fdd_filings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fdd_filings (
  id                              uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchisor_id                   uuid          NOT NULL REFERENCES franchisors(id) ON DELETE CASCADE,
  fdd_year                        int           NOT NULL,
  effective_date                  date,
  source_name                     text,                    -- 'WI' | 'CA' | 'MN'
  pdf_url                         text,
  raw_fdd_json                    jsonb,
  extraction_confidence           numeric(3,2),            -- 0.00 – 1.00

  -- Item 19 / financial fields
  auv_cents                       bigint,
  ebitda_margin                   numeric(5,4),            -- 0.0000 – 1.0000
  initial_franchise_fee_cents     bigint,
  royalty_pct                     numeric(5,4),
  initial_investment_low_cents    bigint,
  initial_investment_high_cents   bigint,

  is_current                      boolean       NOT NULL DEFAULT TRUE,
  scraped_at                      timestamptz   NOT NULL DEFAULT now(),
  created_at                      timestamptz   NOT NULL DEFAULT now(),
  updated_at                      timestamptz   NOT NULL DEFAULT now(),

  UNIQUE (franchisor_id, fdd_year, source_name)
);

DROP TRIGGER IF EXISTS fdd_filings_touch ON fdd_filings;
CREATE TRIGGER fdd_filings_touch BEFORE UPDATE ON fdd_filings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Only one "current" filing per franchisor.
CREATE UNIQUE INDEX IF NOT EXISTS fdd_filings_current_idx
  ON fdd_filings (franchisor_id) WHERE is_current = TRUE;

-- ─── franchise_listings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchise_listings (
  id                          uuid              PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchisor_id               uuid              REFERENCES franchisors(id) ON DELETE SET NULL,
  source                      text              NOT NULL,         -- 'bizbuysell' | 'franchisegator'
  external_id                 text              NOT NULL,
  source_url                  text,
  listing_status              listing_status    NOT NULL DEFAULT 'active',

  -- brand_name is duplicated for fast filters when franchisor_id is unmatched
  brand_name                  text,
  category                    listing_category,

  city                        text,
  state                       char(2),
  zip                         text,

  asking_price_cents          bigint,
  annual_revenue_cents        bigint,
  annual_cash_flow_cents      bigint,
  ebitda_cents                bigint,

  established_year            int,
  number_of_employees         int,
  square_footage              int,
  lease_expiry_date           date,

  broker_name                 text,
  broker_email                text,
  broker_phone                text,
  broker_company              text,

  description                 text,
  reason_for_selling          text,
  raw_json                    jsonb,

  first_seen_at               timestamptz       NOT NULL DEFAULT now(),
  last_seen_at                timestamptz       NOT NULL DEFAULT now(),
  created_at                  timestamptz       NOT NULL DEFAULT now(),
  updated_at                  timestamptz       NOT NULL DEFAULT now(),

  UNIQUE (source, external_id)
);

DROP TRIGGER IF EXISTS listings_touch ON franchise_listings;
CREATE TRIGGER listings_touch BEFORE UPDATE ON franchise_listings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS listings_state_idx       ON franchise_listings (state);
CREATE INDEX IF NOT EXISTS listings_status_idx      ON franchise_listings (listing_status);
CREATE INDEX IF NOT EXISTS listings_category_idx    ON franchise_listings (category);
CREATE INDEX IF NOT EXISTS listings_price_idx       ON franchise_listings (asking_price_cents);
CREATE INDEX IF NOT EXISTS listings_first_seen_idx  ON franchise_listings (first_seen_at DESC);
CREATE INDEX IF NOT EXISTS listings_brand_trgm_idx
  ON franchise_listings USING GIN (brand_name gin_trgm_ops);

-- ─── saved_listings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_listings (
  user_id     uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  uuid          NOT NULL REFERENCES franchise_listings(id) ON DELETE CASCADE,
  saved_at    timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS saved_user_idx ON saved_listings (user_id, saved_at DESC);

-- ─── search_alerts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_alerts (
  id                    uuid              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_name            text,
  category              listing_category,
  state                 char(2),
  max_price_cents       bigint,
  min_cash_flow_cents   bigint,
  is_active             boolean           NOT NULL DEFAULT TRUE,
  last_run_at           timestamptz,
  created_at            timestamptz       NOT NULL DEFAULT now(),
  updated_at            timestamptz       NOT NULL DEFAULT now()
);

-- The dashboard reads `active`; the PATCH route writes `is_active`. Keep both in sync.
ALTER TABLE search_alerts ADD COLUMN IF NOT EXISTS
  active boolean GENERATED ALWAYS AS (is_active) STORED;

DROP TRIGGER IF EXISTS alerts_touch ON search_alerts;
CREATE TRIGGER alerts_touch BEFORE UPDATE ON search_alerts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS alerts_user_idx
  ON search_alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_active_idx
  ON search_alerts (is_active) WHERE is_active = TRUE;

-- ─── lead_reveals ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_reveals (
  user_id      uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id   uuid          NOT NULL REFERENCES franchise_listings(id) ON DELETE CASCADE,
  revealed_at  timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS reveals_user_month_idx
  ON lead_reveals (user_id, revealed_at DESC);
