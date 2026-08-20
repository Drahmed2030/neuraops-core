-- NeuraOps — Proof Week System
-- Replaces the generic 30-day trial with a server-authoritative
-- 7-day proof clock that starts from first ACTIVE channel connection,
-- not from account creation.

-- ═══════════════════════════════════
-- Extend stores table with proof-week state
-- ═══════════════════════════════════
ALTER TABLE stores ADD COLUMN IF NOT EXISTS trial_state text DEFAULT 'signup'
  CHECK (trial_state IN ('signup', 'awaiting_channel', 'proof_active', 'proof_ended', 'converted', 'expired'));

ALTER TABLE stores ADD COLUMN IF NOT EXISTS signup_deadline timestamptz;
-- Max 14 days to complete channel connection before signup itself expires

ALTER TABLE stores ADD COLUMN IF NOT EXISTS proof_started_at timestamptz;
-- Set ONLY when the first real channel connects — never at account creation

ALTER TABLE stores ADD COLUMN IF NOT EXISTS proof_deadline timestamptz;
-- proof_started_at + 7 days, computed server-side, never client-editable

ALTER TABLE stores ADD COLUMN IF NOT EXISTS proof_ended_at timestamptz;

ALTER TABLE stores ADD COLUMN IF NOT EXISTS readonly_until timestamptz;
-- After proof ends unconverted: dashboard stays read-only 14 more days

-- ═══════════════════════════════════
-- Channel connections (what starts the clock)
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS channel_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  channel       text NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'web_widget', 'demo')),
  status        text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disconnected')),
  connected_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_channel_connections" ON channel_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════
-- Conversion events (the audit trail every stat must trace back to)
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS conversion_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  event_type    text NOT NULL CHECK (event_type IN (
    'signup_started', 'channel_connected', 'proof_week_started',
    'first_resolved_reply', 'day3_report_viewed', 'day6_report_viewed',
    'proof_week_ended', 'payment_link_sent', 'payment_completed',
    'subscription_activated', 'trial_expired_unconverted'
  )),
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_conversion_events" ON conversion_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS conversion_events_store_idx ON conversion_events(store_id);
CREATE INDEX IF NOT EXISTS conversion_events_type_idx ON conversion_events(event_type);

-- ═══════════════════════════════════
-- Proof Week Reports (day 3/6/7 — what the store actually sees)
-- Pre-computed and stored, not calculated live, so the report a
-- customer saw on day 6 never silently changes.
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS proof_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  report_day            int NOT NULL CHECK (report_day IN (3, 6, 7)),
  total_conversations   int DEFAULT 0,
  resolved_count         int DEFAULT 0,
  escalated_count         int DEFAULT 0,
  avg_first_response_seconds numeric DEFAULT 0,
  top_topics            jsonb DEFAULT '[]',
  generated_at           timestamptz DEFAULT now(),
  viewed_at              timestamptz
);

ALTER TABLE proof_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_proof_reports" ON proof_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS proof_reports_store_idx ON proof_reports(store_id);

SELECT 'Proof Week schema created successfully!' as status;
