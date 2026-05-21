-- ============================================================================
-- 007_exclusive_trial.sql
--
-- Tracks the 30-day-free trial on each FranDeal Exclusive listing.
-- After exclusive_trial_ends_at passes, the listing remains in the database
-- as exclusive only if a paid arrangement is in place. (Conversion to paid
-- exclusive is handled out-of-band for now — admin flips a flag after billing
-- is set up; a future migration will introduce a billing record per listing.)
--
-- Idempotent.
-- ============================================================================

ALTER TABLE franchise_listings ADD COLUMN IF NOT EXISTS
  exclusive_trial_ends_at timestamptz;

-- Helpful index for the future cron that emails brokers ~3 days before their
-- trial ends.
CREATE INDEX IF NOT EXISTS listings_trial_ends_idx
  ON franchise_listings (exclusive_trial_ends_at)
  WHERE is_exclusive = TRUE AND exclusive_trial_ends_at IS NOT NULL;

-- Refresh listings_with_fdd to expose the new column.
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
  l.exclusive_trial_ends_at,
  l.listed_by_user_id,
  l.submitted_at,
  u.company_name                 AS listed_by_company,
  u.name                         AS listed_by_name,
  u.email                        AS listed_by_email,
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
