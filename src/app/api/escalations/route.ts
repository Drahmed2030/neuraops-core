import { NextRequest, NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/require-store-access'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Valid status transitions for escalations (schema: pending/in_progress/resolved/closed)
const VALID_ESCALATION_STATUSES = ['pending', 'in_progress', 'resolved', 'closed'] as const
type EscalationStatus = typeof VALID_ESCALATION_STATUSES[number]

/**
 * GET /api/escalations?storeId=<store-slug>
 *
 * Returns open escalations for a verified store owner.
 *
 * Auth: requireStoreAccess (401/403)
 * DB:   supabaseAdmin scoped by ctx.store.id
 * RLS why it works: supabaseAdmin bypasses RLS; store scope enforced in query.
 *
 * Security changes from original:
 *   + requireStoreAccess guard
 *   + .eq('store_id', ctx.store.id) — no cross-store data leakage
 *   + raw error messages not returned to client
 */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId')
  if (!storeId) {
    return NextResponse.json({ error: 'storeId required.' }, { status: 400 })
  }

  const ctx = await requireStoreAccess(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  const { data, error } = await supabaseAdmin
    .from('escalations')
    .select('*')
    .eq('store_id', ctx.store.id)           // scoped to verified store
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /escalations]', error)
    return NextResponse.json({ error: 'Failed to fetch escalations.' }, { status: 500 })
  }

  return NextResponse.json({ escalations: data || [] })
}

/**
 * PATCH /api/escalations
 * Body: { id: string, storeId: string, status: EscalationStatus }
 *
 * Auth: requireStoreAccess (401/403)
 * DB:   supabaseAdmin — verifies escalation.store_id before update
 *
 * Security changes from original:
 *   + requireStoreAccess guard
 *   + status allowlist (rejects unknown values)
 *   + verifies escalation belongs to ctx.store before update
 *   + raw error messages not returned to client
 */
export async function PATCH(req: NextRequest) {
  let body: { id?: string; storeId?: string; status?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { id, storeId, status } = body

  if (!id || !storeId || !status) {
    return NextResponse.json({ error: 'id, storeId, status required.' }, { status: 400 })
  }

  // Status allowlist — rejects any value not in schema enum
  if (!VALID_ESCALATION_STATUSES.includes(status as EscalationStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_ESCALATION_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const ctx = await requireStoreAccess(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  // Verify escalation belongs to this store before updating
  const { data: existing } = await supabaseAdmin
    .from('escalations')
    .select('id, store_id')
    .eq('id', id)
    .eq('store_id', ctx.store.id)           // cross-store check
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  }

  const update: Record<string, unknown> = { status }
  if (status === 'resolved' || status === 'closed') {
    update.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('escalations')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /escalations]', error)
    return NextResponse.json({ error: 'Failed to update escalation.' }, { status: 500 })
  }

  return NextResponse.json({ escalation: data })
}
