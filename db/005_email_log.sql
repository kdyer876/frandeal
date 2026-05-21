-- ============================================================================
-- 005_email_log.sql
--   Record every email we send so alert dedupe and audit work correctly.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE email_kind AS ENUM (
    'alert_match',
    'trial_ending',
    'welcome',
    'password_reset',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS email_log (
  id          uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid          REFERENCES users(id) ON DELETE SET NULL,
  alert_id    uuid          REFERENCES search_alerts(id) ON DELETE SET NULL,
  listing_id  uuid          REFERENCES franchise_listings(id) ON DELETE SET NULL,
  kind        email_kind    NOT NULL,
  to_email    text          NOT NULL,
  subject     text,
  provider_id text,                       -- e.g. Resend message ID
  status      text          NOT NULL DEFAULT 'sent',  -- sent | failed | bounced
  error       text,
  sent_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_user_idx     ON email_log (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS email_log_alert_idx    ON email_log (alert_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS email_log_listing_idx  ON email_log (listing_id, sent_at DESC);

-- Used by the alert cron to skip listings we've already notified about.
CREATE UNIQUE INDEX IF NOT EXISTS email_log_alert_listing_uniq
  ON email_log (alert_id, listing_id)
  WHERE alert_id IS NOT NULL AND listing_id IS NOT NULL;
