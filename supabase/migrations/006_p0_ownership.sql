-- NeuraOps — P0 Security: Store Ownership Foundation
-- This file intentionally matches the SQL already applied manually in Supabase.
-- Phase 2 uniqueness constraints are NOT included here.

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS owner_id uuid
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stores_owner_id
  ON stores(owner_id);

DROP POLICY IF EXISTS "owner_select_own_store" ON stores;
DROP POLICY IF EXISTS "owner_update_own_store" ON stores;

CREATE POLICY "owner_select_own_store"
  ON stores
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "owner_update_own_store"
  ON stores
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Existing stores must have owner_id populated manually after migration.
-- Example:
-- UPDATE stores
-- SET owner_id = '<auth-user-id>'
-- WHERE slug = 'demo-store';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stores'
  AND column_name = 'owner_id';
