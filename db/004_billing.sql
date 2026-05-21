-- ============================================================================
-- 004_billing.sql
--   Billing columns on users.
--   In the rebuild path these already exist (see 001_schema.sql), so this file
--   is idempotent and only adds anything that's missing.
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id     text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at        timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at          timestamptz;

CREATE INDEX IF NOT EXISTS users_stripe_customer_idx
  ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
