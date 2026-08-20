-- NeuraOps — Human Escalation Button
-- Adds the ability to manually pause automation on a specific
-- conversation, independent of the AI's own confidence-based
-- escalation logic.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS manually_paused boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS paused_reason text;

-- Track who/what triggered each escalation for the audit trail
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS triggered_by text DEFAULT 'ai_confidence'
  CHECK (triggered_by IN ('ai_confidence', 'manual_owner', 'manual_agent'));

SELECT 'Human escalation schema created successfully!' as status;
