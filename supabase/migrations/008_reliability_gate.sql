-- P1 Reliability Gate: guarantee one active escalation per conversation.
-- Close any pre-existing duplicate active rows before adding the partial unique index.
WITH ranked_active AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY conversation_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM escalations
  WHERE status IN ('pending', 'in_progress')
)
UPDATE escalations
SET status = 'closed',
    resolved_at = COALESCE(resolved_at, now())
WHERE id IN (SELECT id FROM ranked_active WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS escalations_one_active_per_conversation_idx
  ON escalations (conversation_id)
  WHERE status IN ('pending', 'in_progress');
