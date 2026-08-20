-- NeuraOps — Response Quality Center (P0 #1, final item)
-- Lets a store owner tag each AI reply correct/needs-edit/escalated
-- and optionally note why. This is what builds trust in week one
-- and gives the team real data to improve the product — per the
-- Manus report's own framing.

CREATE TABLE IF NOT EXISTS message_quality (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating        text NOT NULL CHECK (rating IN ('correct', 'needs_edit', 'escalated')),
  note          text,
  rated_by      text DEFAULT 'store_owner',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(message_id)
);

ALTER TABLE message_quality ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_message_quality" ON message_quality FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS message_quality_store_idx ON message_quality(store_id);
CREATE INDEX IF NOT EXISTS message_quality_conversation_idx ON message_quality(conversation_id);

SELECT 'Quality Center schema created successfully!' as status;
