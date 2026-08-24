-- NeuraOps — P0 Security: Store Ownership + Missing Unique Constraints
-- Run this in Supabase SQL Editor BEFORE merging security/p0-remediation.
--
-- Changes and rationale:
--
--   1. stores.owner_id
--      requireStoreAccess checks stores.owner_id = auth.uid().
--      Without this column every protected route returns 403.
--
--   2. RLS: authenticated owner policies on stores
--      Allows the SSR anon client to read/query the store row for
--      the requireStoreAccess ownership check. The service_role
--      policy already covers admin operations.
--
--   3. UNIQUE(store_id, report_day) on proof_reports
--      Required by Phase 2 trial/report POST onConflict.
--      Added now to avoid a second migration later.
--
--   4. UNIQUE(store_id, channel) on channel_connections
--      Required by Phase 2 activate-channel onConflict.
--      Added now to avoid a second migration later.

-- ── 1. Add owner_id ───────────────────────────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- ── 2. RLS policies for authenticated owners ──────────────────────────────────
-- Allows SSR anon client (used by requireStoreAccess) to read/update own store.
-- service_role policy already exists and covers admin operations.

DROP POLICY IF EXISTS "owner_select_own_store" ON stores;
DROP POLICY IF EXISTS "owner_update_own_store" ON stores;

CREATE POLICY "owner_select_own_store"
  ON stores FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "owner_update_own_store"
  ON stores FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- INSERT intentionally left open for the anonymous trial create-store flow.
-- Restrict in Phase 2 once create-store requires auth.

-- ── 3. UNIQUE(store_id, report_day) on proof_reports ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'proof_reports_store_id_report_day_key'
  ) THEN
    ALTER TABLE proof_reports
      ADD CONSTRAINT proof_reports_store_id_report_day_key
      UNIQUE (store_id, report_day);
  END IF;
END $$;

-- ── 4. UNIQUE(store_id, channel) on channel_connections ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'channel_connections_store_id_channel_key'
  ) THEN
    ALTER TABLE channel_connections
      ADD CONSTRAINT channel_connections_store_id_channel_key
      UNIQUE (store_id, channel);
  END IF;
END $$;

-- ── 5. Verification ───────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stores' AND column_name = 'owner_id';

SELECT 'Migration 006 complete' AS status;

-- ── REQUIRED MANUAL STEP AFTER RUNNING ───────────────────────────────────────
-- Set owner_id for existing stores or requireStoreAccess will return 403.
-- Find your auth user id: Supabase Dashboard → Authentication → Users
--
--   UPDATE stores
--   SET owner_id = '<your-supabase-auth-user-id>'
--   WHERE slug = 'demo-store';
--
-- Repeat for any other existing stores.
