/**
 * ⚠️  PRIVILEGED SUPABASE CLIENT — READ BEFORE USING ⚠️
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY — bypasses Row Level Security entirely.
 *
 * Rules:
 *   1. Server-side ONLY (API routes / server actions).
 *   2. Only AFTER requireStoreAccess() has verified auth + ownership.
 *   3. Every query MUST be explicitly scoped by ctx.store.id — never
 *      rely on RLS to enforce store isolation here.
 *
 * Do NOT:
 *   - Use as the default server client.
 *   - Import from client components.
 *   - Call without a prior requireStoreAccess() check.
 *
 * For auth checks and store ownership: src/lib/supabase/server.ts
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error(
    '[supabase/admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  )
}

export const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})
