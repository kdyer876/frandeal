-- ============================================================================
-- 002_views.sql
--   listings_with_fdd: flattened view that joins listings + franchisors + the
--   franchisor's current FDD filing. Used by /api/listings and /api/listings/:id.
-- ============================================================================

DROP VIEW IF EXISTS listings_with_fdd CASCADE;

CREATE VIEW listings_with_fdd AS
SELECT
  l.id                          AS listing_id,
  l.id                          AS id,                          -- handy alias

  -- Brand + category: prefer franchisor record, fall back to listing row
  COALESCE(fr.brand_name, l.brand_name)              AS brand_name,
  COALESCE(fr.category,   l.category)                AS category,
  fr.id                          AS franchisor_id,

  -- Listing facts
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

  -- Deal multiples (computed)
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
LEFT JOIN fdd_filings  fi ON fi.franchisor_id = fr.id AND fi.is_current = TRUE;
