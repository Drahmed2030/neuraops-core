-- NeuraOps — P2 LeadOps MVP

CREATE TABLE IF NOT EXISTS leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  conversation_id       uuid REFERENCES conversations(id) ON DELETE SET NULL,
  session_id            text NOT NULL,
  source                text NOT NULL DEFAULT 'web',
  name                  text,
  email                 text,
  phone                 text,
  need                  text,
  budget_band           text NOT NULL DEFAULT 'unknown' CHECK (budget_band IN ('unknown','low','medium','high')),
  urgency               text NOT NULL DEFAULT 'unknown' CHECK (urgency IN ('unknown','later','30d','7d','now')),
  decision_authority    text NOT NULL DEFAULT 'unknown' CHECK (decision_authority IN ('unknown','influencer','decision_maker')),
  qualification_status  text NOT NULL DEFAULT 'pending' CHECK (qualification_status IN ('pending','qualified','unqualified','needs_human')),
  score                 integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  qualification_reason  text NOT NULL DEFAULT '',
  ai_confidence         float CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  ai_response           text,
  conversion_status     text NOT NULL DEFAULT 'new' CHECK (conversion_status IN ('new','contacted','won','lost')),
  follow_up_status      text NOT NULL DEFAULT 'none' CHECK (follow_up_status IN ('none','pending','in_progress','done','escalation_failed')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, session_id)
);

CREATE INDEX IF NOT EXISTS leads_store_status_idx
  ON leads(store_id, qualification_status, created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_leads" ON leads;
CREATE POLICY "service_role_all_leads"
  ON leads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_own_leads" ON leads;
CREATE POLICY "owner_select_own_leads"
  ON leads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = leads.store_id
        AND stores.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_own_leads" ON leads;
CREATE POLICY "owner_update_own_leads"
  ON leads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = leads.store_id
        AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = leads.store_id
        AND stores.owner_id = auth.uid()
    )
  );
