-- ============================================================================
-- 003_seed_and_queries.sql
--   Seed a small set of franchisors so the dev environment isn't empty,
--   and ensure pg_trgm similarity thresholds are sane.
--
--   Safe to re-run.
-- ============================================================================

-- Make trigram matching a bit more forgiving (default 0.3 is fine, but be explicit).
DO $$ BEGIN
  PERFORM set_limit(0.3);
EXCEPTION WHEN OTHERS THEN
  -- set_limit may not exist on managed Postgres without the function;
  -- silently skip.
  NULL;
END $$;

-- Seed franchisors. These are public brand names used only as fixtures.
INSERT INTO franchisors (brand_name, slug, category) VALUES
  ('Subway',                  'subway',              'food_beverage'),
  ('Anytime Fitness',         'anytime-fitness',     'fitness_wellness'),
  ('UPS Store',               'ups-store',           'business_services'),
  ('Servpro',                 'servpro',             'home_services'),
  ('Great Clips',             'great-clips',         'beauty_personal_care'),
  ('Jiffy Lube',              'jiffy-lube',          'automotive'),
  ('Kumon',                   'kumon',               'education_childcare'),
  ('Massage Envy',            'massage-envy',        'beauty_personal_care'),
  ('The UPS Store',           'the-ups-store',       'business_services'),
  ('Tropical Smoothie Cafe',  'tropical-smoothie',   'food_beverage')
ON CONFLICT (brand_name) DO NOTHING;
