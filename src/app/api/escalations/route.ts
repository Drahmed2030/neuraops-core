import { NextRequest, NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/require-store-access'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  ACTIVE_ESCALATION_STATUSES,
  conversationUpdateForEscalationStatus,
  transitionToActiveEscalationStatus,
} from '@/lib/reliability/escalation.mjs'

const VALID_ESCALATION_STATUSES = ['pending', 'in_progress', 'resolved', 'closed'] as const
type EscalationStatus = typeof VALID_ESCALATION_STATUSES[number]

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required.' }, { status: 400 })

  const ctx = await requireStoreAccess(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  const { data, error } = await supabaseAdmin.from('escalations').select('*')
    .eq('store_id', ctx.store.id).in('status', ACTIVE_ESCALATION_STATUSES)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /escalations]', error)
    return NextResponse.json({ error: 'Failed to fetch escalations.' }, { status: 500 })
  }
  return NextResponse.json({ escalations: data || [] })
}

export async function PATCH(req: NextRequest) {
  let body: { id?: string; storeId?: string; status?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { id, storeId, status } = body
  if (!id || !storeId || !status)
    return NextResponse.json({ error: 'id, storeId, status required.' }, { status: 400 })
  if (!VALID_ESCALATION_STATUSES.includes(status as EscalationStatus))
    return NextResponse.json({ error: `status must be one of: ${VALID_ESCALATION_STATUSES.join(', ')}` }, { status: 400 })

  const ctx = await requireStoreAccess(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  const { data: existing, error: existingError } = await supabaseAdmin.from('escalations')
    .select('id, store_id, conversation_id').eq('id', id).eq('store_id', ctx.store.id).single()

  if (existingError || !existing)
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  if (ACTIVE_ESCALATION_STATUSES.includes(status)) {
    const transition = await transitionToActiveEscalationStatus({
      getConversationStatus: async (conversationId: string, scopedStoreId: string) => {
        const { data, error } = await supabaseAdmin.from('conversations')
          .select('status').eq('id', conversationId).eq('store_id', scopedStoreId).single()
        return error ? null : data
      },
      setConversationStatus: async (conversationId: string, scopedStoreId: string, nextStatus: string) => {
        const { data, error } = await supabaseAdmin.from('conversations')
          .update({ status: nextStatus }).eq('id', conversationId).eq('store_id', scopedStoreId)
          .select('id').single()
        return !error && Boolean(data)
      },
      setEscalationStatus: async (escalationId: string, scopedStoreId: string, nextStatus: string) => {
        const { data, error } = await supabaseAdmin.from('escalations')
          .update({ status: nextStatus }).eq('id', escalationId).eq('store_id', scopedStoreId)
          .select().single()
        return error ? { ok: false, data: null } : { ok: true, data }
      },
      countActiveEscalations: async (conversationId: string, scopedStoreId: string) => {
        const { count, error } = await supabaseAdmin.from('escalations')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversationId).eq('store_id', scopedStoreId)
          .in('status', ACTIVE_ESCALATION_STATUSES)
        return error ? 1 : (count || 0)
      },
    }, {
      escalationId: id,
      conversationId: existing.conversation_id,
      storeId: ctx.store.id,
      status,
    })

    if (!transition.ok) {
      console.error('[PATCH /escalations] active lifecycle transition failed:', transition.stage)
      return NextResponse.json(
        { error: 'Escalation state could not be synchronized safely.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ escalation: transition.data })
  }

  const update: Record<string, unknown> = { status }
  if (status === 'resolved' || status === 'closed') update.resolved_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin.from('escalations').update(update)
    .eq('id', id).eq('store_id', ctx.store.id).select().single()

  if (error) {
    console.error('[PATCH /escalations]', error)
    return NextResponse.json({ error: 'Failed to update escalation.' }, { status: 500 })
  }

  let activeEscalationCount = 0
  if (status === 'resolved' || status === 'closed') {
    const { count, error: countError } = await supabaseAdmin.from('escalations')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', existing.conversation_id).eq('store_id', ctx.store.id)
      .in('status', ACTIVE_ESCALATION_STATUSES)

    if (countError) {
      console.error('[PATCH /escalations] lifecycle count error:', countError)
      return NextResponse.json({ error: 'Escalation updated but conversation state could not be verified.' }, { status: 503 })
    }
    activeEscalationCount = count || 0
  }

  const conversationUpdate = conversationUpdateForEscalationStatus(status, activeEscalationCount)
  const { error: conversationError } = await supabaseAdmin.from('conversations')
    .update(conversationUpdate).eq('id', existing.conversation_id).eq('store_id', ctx.store.id)

  if (conversationError) {
    console.error('[PATCH /escalations] conversation lifecycle error:', conversationError)
    return NextResponse.json({ error: 'Escalation updated but conversation state update failed.' }, { status: 503 })
  }

  return NextResponse.json({ escalation: data })
}
