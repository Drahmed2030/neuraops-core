/**
 * requireStoreAccess — centralized auth + store ownership guard.
 *
 * Architecture:
 *   Uses createServerClient() [SSR anon] ONLY for:
 *     1. supabase.auth.getUser()  — verifies session cookie
 *     2. stores SELECT            — checks owner_id = auth.uid()
 *
 *   After this returns StoreAccessContext, callers use supabaseAdmin
 *   for all DB operations, explicitly scoped by ctx.store.id.
 *
 * Usage:
 *   const ctx = await requireStoreAccess(req, storeSlug)
 *   if (ctx instanceof NextResponse) return ctx
 *   // ctx.user.id and ctx.store.id are verified — safe to use with supabaseAdmin
 *
 * storeSlug source:
 *   The current frontend contract passes the store slug (for example
 *   "demo-store"). The slug is only a lookup key — NEVER proof of access.
 *   Ownership is established server-side by matching owner_id = auth.uid().
 *
 * Schema dependency:
 *   Requires stores.owner_id (added by migration 006_p0_ownership.sql).
 *   Without it, ownership check always returns 403.
 *   After running 006, also UPDATE stores SET owner_id = '<auth-user-id>'
 *   for any existing stores.
 *
 * Future: extend to check a store_members table for multi-admin access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export interface StoreAccessContext {
  user:  { id: string; email?: string }
  store: { id: string; slug: string; name: string }
}

export async function requireStoreAccess(
  req: NextRequest,
  storeSlug: string
): Promise<StoreAccessContext | NextResponse> {
  const supabase = createServerClient()

  // 1. Verify session via cookie
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    )
  }

  // 2. Resolve store by the existing frontend slug and verify ownership.
  //    The slug is not authorization; owner_id = auth.uid() is.
  //    Uses anon client — stores has service_role + new owner RLS policies (006).
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, slug, name, owner_id')
    .eq('slug', storeSlug)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  }

  // 3. Ownership check
  if (store.owner_id !== user.id) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  }

  return {
    user:  { id: user.id, email: user.email },
    store: { id: store.id, slug: store.slug, name: store.name },
  }
}
